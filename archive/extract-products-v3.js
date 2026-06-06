// 使用精确CSS类名提取商品数据
(() => {
  const products = [];
  const seenTitles = new Set();

  // 使用精确的CSS类名定位商品卡片
  const cards = document.querySelectorAll('[class*="index_module__wrapper___"]');

  cards.forEach(card => {
    try {
      const product = {};
      const fullText = card.textContent || '';

      // 跳过太短的文本（不是完整的商品卡片）
      if (fullText.length < 30) return;

      // 提取标题 - 在 content 区域的第一个子元素
      const content = card.querySelector('[class*="index_module__content___"]');
      if (!content) return;

      // content 的子元素结构：
      // 0: 标题区域
      // 1: 标签区域（商家投千川、运费险等）
      // 2: 价格+月销行
      // 3: 佣金信息行
      // 4: 店铺/榜单信息行

      const sections = Array.from(content.children);

      // 提取标题
      let title = '';
      if (sections[0]) {
        const walker = document.createTreeWalker(sections[0], NodeFilter.SHOW_TEXT);
        const texts = [];
        while (walker.nextNode()) {
          const t = walker.currentNode.textContent.trim();
          if (t.length > 5) texts.push(t);
        }
        title = texts.join('');
      }
      product.title = title;

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

      // 到手价
      const priceMatch = fullText.match(/到手价\s*[¥￥]?\s*([\d.]+)/);
      product.price = priceMatch ? priceMatch[1] : '';

      // 月销
      const salesMatch = fullText.match(/(?:同款)?月销\s*([\d,.]+万?)/);
      product.monthlySales = salesMatch ? salesMatch[1] : '';

      // 佣金比例 - 第一个百分比数字
      const commissionMatch = fullText.match(/(\d+)\s*%/);
      product.commissionRate = commissionMatch ? commissionMatch[1] + '%' : '';

      // 预估收益
      const earnMatch = fullText.match(/赚\s*[¥￥]?([\d.]+)/);
      product.estimatedEarning = earnMatch ? earnMatch[1] : '';

      // 佣金类型
      let commissionType = '';
      if (fullText.includes('双佣金')) commissionType = '双佣金';
      else if (fullText.includes('团长')) commissionType = '团长';
      else if (fullText.includes('佣金')) commissionType = '佣金';
      product.commissionType = commissionType;

      // 投放期佣金
      const investMatch = fullText.match(/投放期\s*(\d+%)/);
      product.investmentCommission = investMatch ? investMatch[1] : '';

      // 店铺信息区域 - content的最后一个子元素
      const shopSection = sections[sections.length - 1];
      product.shopName = '';
      product.shopScore = '';
      product.ranking = '';

      if (shopSection) {
        const shopTexts = [];
        const walker = document.createTreeWalker(shopSection, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const t = walker.currentNode.textContent.trim();
          if (t) shopTexts.push(t);
        }

        // 检查是否是榜单（包含"爆款榜"）
        const hasRanking = fullText.includes('爆款榜');

        if (hasRanking) {
          // 榜单模式：通常包含 img + 榜单文本 + img
          const rankMatch = fullText.match(/([一-龥（）\w]+爆款榜·第\d+名)/);
          product.ranking = rankMatch ? rankMatch[1] : '';
          // 榜单商品可能没有店铺信息
          for (const t of shopTexts) {
            if (t.length > 2 && !t.includes('爆款榜') && !t.includes('加选品车')) {
              if (/^\d+$/.test(t)) {
                product.shopScore = t + '分';
              } else {
                product.shopName = t;
              }
            }
          }
        } else {
          // 店铺模式：店铺名 + 评分
          for (const t of shopTexts) {
            if (/^\d{2,3}$/.test(t)) {
              product.shopScore = t + '分';
            } else if (t.length > 1 && !t.includes('加选品车')) {
              product.shopName = t;
            }
          }
        }
      }

      if (product.title && product.title.length > 3 && !seenTitles.has(product.title)) {
        seenTitles.add(product.title);
        products.push(product);
      }
    } catch (e) {}
  });

  return JSON.stringify(products);
})()
