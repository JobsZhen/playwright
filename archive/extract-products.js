// 提取当前页面所有商品数据
(() => {
  const products = [];
  const seenTitles = new Set();

  // 查找所有商品卡片 - 使用 "加选品车" 按钮定位
  const allButtons = document.querySelectorAll('button');
  const productCards = [];

  allButtons.forEach(btn => {
    if (btn.textContent.includes('加选品车')) {
      let card = btn;
      // 向上查找商品卡片容器
      for (let i = 0; i < 15; i++) {
        if (card.parentElement) {
          card = card.parentElement;
          const text = card.textContent || '';
          if (text.includes('到手价') && text.includes('月销') && card.querySelectorAll('img').length >= 1 && text.length > 80) {
            break;
          }
        }
      }
      productCards.push(card);
    }
  });

  productCards.forEach(card => {
    try {
      const product = {};
      const fullText = card.textContent || '';

      // 提取标题
      const textElements = [];
      const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const text = walker.currentNode.textContent.trim();
        if (text.length > 8) textElements.push(text);
      }

      // 标题是最长且有意义的文本
      let title = '';
      for (const t of textElements) {
        if (t.length > 15 && !t.includes('到手价') && !t.includes('月销') && !t.includes('加选品车')) {
          if (t.length > title.length) title = t;
        }
      }
      product.title = title;

      // 到手价
      const priceMatch = fullText.match(/到手价\s*[¥￥]?\s*([\d.]+)/);
      product.price = priceMatch ? priceMatch[1] : '';

      // 月销
      const salesMatch = fullText.match(/(?:同款)?月销\s*([\d,.]+万?)/);
      product.monthlySales = salesMatch ? salesMatch[1] : '';

      // 佣金比例
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

      // 标签
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

      // 店铺评分
      const scoreMatch = fullText.match(/(\d+)分/);
      product.shopScore = scoreMatch ? scoreMatch[1] + '分' : '';

      // 店铺名称 - 评分前面的文本
      const shopMatch = fullText.match(/([^\d\n]{2,}?)\s*\d+分/);
      product.shopName = shopMatch ? shopMatch[1].trim() : '';

      // 榜单
      const rankMatch = fullText.match(/(.+?爆款榜·第\d+名)/);
      product.ranking = rankMatch ? rankMatch[1] : '';

      if (product.title && product.title.length > 5 && !seenTitles.has(product.title)) {
        seenTitles.add(product.title);
        products.push(product);
      }
    } catch (e) {}
  });

  return JSON.stringify(products);
})()
