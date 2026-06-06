async (page) => {
  const fs = require('fs');
  const path = require('path');

  const TARGET_COUNT = 50;
  const allProducts = [];
  const seenTitles = new Set();
  let scrollAttempts = 0;
  const maxScrollAttempts = 20;

  console.log('=== 开始爬取选品广场商品数据 ===');

  // 提取商品数据的函数
  async function extractProducts() {
    return await page.evaluate(() => {
      const products = [];

      // 商品卡片是 cursor=pointer 的 generic 元素，在推荐列表区域内
      // 从快照分析，每个商品卡片结构：
      // - 图片区域
      // - 标题
      // - 标签列表
      // - 到手价 + 月销
      // - 佣金信息
      // - 店铺信息

      // 查找所有商品卡片 - 使用 "加选品车" 按钮定位商品卡片
      const addButtons = document.querySelectorAll('button');
      const productCards = [];

      addButtons.forEach(btn => {
        if (btn.textContent.includes('加选品车')) {
          // 向上找到商品卡片容器
          let card = btn.parentElement;
          // 向上找到包含完整商品信息的容器
          for (let i = 0; i < 10; i++) {
            if (card && card.parentElement) {
              card = card.parentElement;
              // 检查是否是商品卡片级别（包含图片和完整信息）
              if (card.querySelector('img') && card.textContent.includes('到手价') && card.textContent.length > 50) {
                break;
              }
            }
          }
          if (card) productCards.push(card);
        }
      });

      productCards.forEach(card => {
        try {
          const product = {};

          // 提取标题 - 查找较长的文本内容
          const allText = card.querySelectorAll('*');
          let title = '';
          for (const el of allText) {
            const text = el.textContent.trim();
            // 标题通常比较长，且是单独的generic元素
            if (text.length > 10 && text.length < 200 &&
                !text.includes('到手价') && !text.includes('月销') &&
                !text.includes('佣金') && !text.includes('加选品车') &&
                !text.includes('商家投千川') && !text.includes('运费险') &&
                el.children.length <= 2 && el.tagName === 'DIV') {
              // 找到标题候选
              const directText = Array.from(el.childNodes)
                .filter(n => n.nodeType === 3)
                .map(n => n.textContent.trim())
                .join('');
              if (directText.length > 5 || (text.length > 15 && el.children.length === 0)) {
                title = text;
                break;
              }
            }
          }

          // 备选：使用另一种方式提取标题
          if (!title) {
            const textNodes = [];
            const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
            while (walker.nextNode()) {
              const text = walker.currentNode.textContent.trim();
              if (text.length > 10) textNodes.push(text);
            }
            // 最长的文本通常是标题
            textNodes.sort((a, b) => b.length - a.length);
            if (textNodes[0]) title = textNodes[0];
          }

          product.title = title;

          // 提取到手价
          const fullText = card.textContent;
          const priceMatch = fullText.match(/到手价\s*[¥￥]?([\d.]+)/);
          product.price = priceMatch ? priceMatch[1] : '';

          // 提取月销
          const salesMatch = fullText.match(/月销\s*([\d,.]+万?)/);
          product.monthlySales = salesMatch ? salesMatch[1] : '';

          // 提取佣金比例
          const commissionMatch = fullText.match(/([\d]+)\s*%/);
          product.commissionRate = commissionMatch ? commissionMatch[1] + '%' : '';

          // 提取预估收益
          const earnMatch = fullText.match(/赚\s*[¥￥]?([\d.]+)/);
          product.estimatedEarning = earnMatch ? earnMatch[1] : '';

          // 提取佣金类型
          let commissionType = '';
          if (fullText.includes('双佣金')) commissionType = '双佣金';
          else if (fullText.includes('团长')) commissionType = '团长';
          else if (fullText.includes('佣金')) commissionType = '佣金';
          product.commissionType = commissionType;

          // 提取标签
          const tags = [];
          if (fullText.includes('商家投千川')) tags.push('商家投千川');
          if (fullText.includes('低价好卖')) tags.push('低价好卖');
          if (fullText.includes('运费险')) tags.push('运费险');
          if (fullText.includes('现货')) tags.push('现货');
          if (fullText.includes('流量扶持')) tags.push('流量扶持');
          if (fullText.includes('分期免息')) tags.push('分期免息');
          if (fullText.includes('高结算率')) tags.push('高结算率');
          if (fullText.includes('首次开佣')) tags.push('首次开佣');
          if (fullText.includes('包邮')) tags.push('包邮');
          product.tags = tags.join('|');

          // 提取店铺名称和评分
          const textParts = fullText.split('\n').map(s => s.trim()).filter(s => s);
          // 店铺名通常在最后，评分格式是 XX分
          const scoreMatch = fullText.match(/(\d+)分/);
          product.shopScore = scoreMatch ? scoreMatch[1] + '分' : '';

          // 店铺名称提取 - 在最后部分的文本
          const lastPart = textParts.slice(-5).join(' ');
          const shopMatch = lastPart.match(/([^\d]+?)\s*\d+分/);
          product.shopName = shopMatch ? shopMatch[1].trim() : '';

          // 提取榜单信息
          const rankMatch = fullText.match(/(.+?爆款榜·第\d+名)/);
          product.ranking = rankMatch ? rankMatch[1] : '';

          if (product.title && product.title.length > 5) {
            products.push(product);
          }
        } catch (e) {}
      });

      return products;
    });
  }

  // 主爬取循环
  while (allProducts.length < TARGET_COUNT && scrollAttempts < maxScrollAttempts) {
    const products = await extractProducts();

    let newCount = 0;
    for (const p of products) {
      if (!seenTitles.has(p.title)) {
        seenTitles.add(p.title);
        allProducts.push(p);
        newCount++;
      }
    }

    console.log(`第 ${scrollAttempts + 1} 次扫描: 发现 ${products.length} 个商品, 新增 ${newCount} 个, 总计 ${allProducts.length}/${TARGET_COUNT}`);

    if (allProducts.length >= TARGET_COUNT) break;

    // 滚动页面加载更多
    const beforeHeight = await page.evaluate(() => document.body.scrollHeight);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise(r => setTimeout(r, 2000));

    const afterHeight = await page.evaluate(() => document.body.scrollHeight);
    if (afterHeight === beforeHeight) {
      scrollAttempts++;
      console.log(`页面高度未变化 (${scrollAttempts}/${maxScrollAttempts})`);
    } else {
      scrollAttempts = 0;
    }
  }

  // 截取目标数量
  const finalProducts = allProducts.slice(0, TARGET_COUNT);

  // 添加序号
  finalProducts.forEach((p, i) => p.index = i + 1);

  console.log(`\n=== 爬取完成！共获取 ${finalProducts.length} 条商品数据 ===`);

  // 生成 CSV
  const headers = ['index', 'title', 'price', 'monthlySales', 'commissionType', 'commissionRate', 'estimatedEarning', 'shopName', 'shopScore', 'ranking', 'tags'];
  const headerNames = ['序号', '商品标题', '到手价', '月销量', '佣金类型', '佣金比例', '预估收益', '店铺名称', '店铺评分', '榜单排名', '标签'];

  function escapeCsv(field) {
    if (field === null || field === undefined) return '';
    const str = String(field);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  const csvContent = [
    headerNames.map(escapeCsv).join(','),
    ...finalProducts.map(p => headers.map(h => escapeCsv(p[h])).join(','))
  ].join('\n');

  // 保存文件
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const csvPath = path.join(process.cwd(), `products_${timestamp}.csv`);
  const jsonPath = path.join(process.cwd(), `products_${timestamp}.json`);

  fs.writeFileSync(csvPath, '﻿' + csvContent, 'utf8');
  fs.writeFileSync(jsonPath, JSON.stringify(finalProducts, null, 2), 'utf8');

  console.log(`\nCSV 已保存: ${csvPath}`);
  console.log(`JSON 已保存: ${jsonPath}`);

  // 打印前5条预览
  console.log('\n=== 数据预览（前5条）===');
  finalProducts.slice(0, 5).forEach(p => {
    console.log(`${p.index}. ${p.title}`);
    console.log(`   价格: ¥${p.price} | 月销: ${p.monthlySales} | 佣金: ${p.commissionType} ${p.commissionRate} | 预估赚: ¥${p.estimatedEarning}`);
    console.log(`   店铺: ${p.shopName} (${p.shopScore}) ${p.ranking}`);
    console.log(`   标签: ${p.tags}`);
    console.log('');
  });

  return finalProducts;
}
