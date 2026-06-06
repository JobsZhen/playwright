// 精确提取商品数据 - 使用更精确的DOM结构定位
(() => {
  const products = [];
  const seenTitles = new Set();

  // 方法：找到所有"加选品车"按钮，每个按钮对应一个商品卡片
  const allButtons = Array.from(document.querySelectorAll('button'));
  const cartButtons = allButtons.filter(btn => btn.textContent.trim() === '加选品车');

  cartButtons.forEach(btn => {
    try {
      // 从按钮向上找到商品卡片的直接父容器
      // 商品卡片的特征：有 cursor=pointer 样式，包含图片、标题、价格、佣金等完整信息
      let card = btn.parentElement;

      // 向上查找到商品卡片级别
      // 商品卡片是包含图片和"加选品车"按钮的最小容器
      for (let i = 0; i < 10; i++) {
        if (!card || !card.parentElement) break;
        const imgs = card.querySelectorAll('img');
        const buttons = card.querySelectorAll('button');
        const text = card.textContent || '';

        // 商品卡片级别：有图片、只有一个"加选品车"按钮、文本长度适中
        if (imgs.length >= 1 && buttons.length === 1 && text.includes('到手价') && text.length < 500) {
          break;
        }
        card = card.parentElement;
      }

      if (!card) return;

      const product = {};
      const fullText = card.textContent || '';

      // 提取标题 - 查找信息区域中的第一个长文本
      // 信息区域是包含"加选品车"按钮的同一层级
      const infoArea = card.children[1] || card; // 第二个子元素通常是信息区域

      // 使用递归查找标题元素
      function findTitle(el) {
        if (!el) return '';
        // 如果是叶子节点且文本长度合适
        if (el.children.length === 0 || (el.children.length === 1 && el.children[0].tagName === 'IMG')) {
          const text = (el.textContent || '').trim();
          if (text.length > 10 && !text.includes('到手价') && !text.includes('月销') && !text.includes('佣金') && !text.includes('加选品车')) {
            return text;
          }
        }
        // 递归子元素
        for (const child of el.children) {
          const result = findTitle(child);
          if (result) return result;
        }
        return '';
      }

      product.title = findTitle(card);

      // 到手价
      const priceMatch = fullText.match(/到手价\s*[¥￥]?\s*([\d.]+)/);
      product.price = priceMatch ? priceMatch[1] : '';

      // 月销
      const salesMatch = fullText.match(/(?:同款)?月销\s*([\d,.]+万?)/);
      product.monthlySales = salesMatch ? salesMatch[1] : '';

      // 佣金比例 - 取第一个百分比
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

      // 店铺评分 - XX分
      const scoreMatch = fullText.match(/(\d{2,3})分/);
      product.shopScore = scoreMatch ? scoreMatch[1] + '分' : '';

      // 店铺名称 - 评分前面紧挨的文本
      // 在卡片底部，格式通常是"店铺名\n评分"
      const shopArea = card.children[card.children.length - 1]; // 最后一个子元素通常是店铺信息
      if (shopArea) {
        const shopTexts = [];
        const walker = document.createTreeWalker(shopArea, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const t = walker.currentNode.textContent.trim();
          if (t) shopTexts.push(t);
        }
        // 店铺名通常是第一个非空文本（排除纯数字和符号）
        for (const t of shopTexts) {
          if (t.length > 2 && !/^\d+$/.test(t) && !t.includes('分') && !t.includes('加选品车')) {
            product.shopName = t;
            break;
          }
        }
      }
      if (!product.shopName) product.shopName = '';

      // 榜单信息 - XX爆款榜·第X名
      const rankMatch = fullText.match(/([一-龥\w]+爆款榜·第\d+名)/);
      product.ranking = rankMatch ? rankMatch[1] : '';

      if (product.title && !seenTitles.has(product.title)) {
        seenTitles.add(product.title);
        products.push(product);
      }
    } catch (e) {}
  });

  return JSON.stringify(products);
})()
