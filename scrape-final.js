async (page) => {
  const CONFIG = {
    TARGET_COUNT: 50,
    VIEW_MODE: 'table',
    MAX_SCROLL: 20,
    APPLY_UI_FILTERS: false,
    POST_FILTER: true,
    FILTER: {
      tagsInclude: ['商家投千川', '高结算率']
    }
  };

  console.log('=== 抖音选品广场数据爬取 ===');
  console.log('模式：' + CONFIG.VIEW_MODE + ' | 目标：' + CONFIG.TARGET_COUNT + ' 条\n');

  const switchToTableView = async () => {
    console.log('检查视图模式...');
    try {
      const result = await page.evaluate(() => {
        // 检查当前是否已经有表格行
        const hasTable = document.querySelectorAll('.auxo-table-row-level-0').length > 0;
        if (hasTable) {
          return 'already in table view';
        }

        // 查找视图切换按钮
        const switcher = document.querySelector('[class*="switch-pick-type"]');
        if (!switcher) return 'switcher not found';

        const spans = switcher.querySelectorAll('span');
        if (spans.length < 2) return 'not enough spans: ' + spans.length;

        // 检查哪个是激活的
        const activeSpan = switcher.querySelector('[class*="active"]');
        let targetSpan;

        if (activeSpan) {
          // 点击非激活的那个
          targetSpan = activeSpan === spans[0] ? spans[1] : spans[0];
        } else {
          // 如果没有激活状态，点击第一个（假设是列表视图）
          targetSpan = spans[0];
        }

        targetSpan.click();
        return 'clicked';
      });
      await page.waitForTimeout(2000);
      console.log('切换结果：' + result);
    } catch (e) {
      console.log('切换视图失败：' + e.message);
    }
  };

  const filterResults = [];

  const applyFilters = async () => {
    filterResults.push('--- 开始应用筛选条件 ---');

    const clickFilterBox = async (filterName) => {
      try {
        const result = await page.evaluate((name) => {
          const all = document.querySelectorAll('[class*="index_module"]');
          let bestMatch = null;
          let bestLength = Infinity;
          for (const el of all) {
            // 精确匹配：元素文本恰好等于目标名称
            if (el.textContent.trim() === name) {
              // 优先选最短文本的（最小/叶子节点元素）
              const textLen = el.textContent.length;
              if (textLen < bestLength) {
                bestLength = textLen;
                bestMatch = el;
              }
            }
          }
          if (bestMatch) {
            const box = bestMatch.querySelector('.index_module__box____17c1');
            if (box) { box.click(); return 'clicked box: ' + name; }
            bestMatch.click();
            return 'clicked element: ' + name;
          }
          const texts = Array.from(all).map(e => e.textContent.trim()).filter(t => t && t.length < 15);
          return 'not found: ' + name + ' | available: ' + texts.join(', ');
        }, filterName);
        await page.waitForTimeout(800);
        filterResults.push('  ' + result);
        return result.includes('clicked');
      } catch (e) {
        filterResults.push('  点击 ' + filterName + ' 失败：' + e.message);
        return false;
      }
    };

    const selectDropdownOption = async (optionText) => {
      try {
        await page.waitForTimeout(1000);
        const result = await page.evaluate((text) => {
          const dropdowns = document.querySelectorAll('.auxo-select-dropdown');
          const visible = Array.from(dropdowns).filter(d => d.offsetParent !== null);
          if (visible.length === 0) return 'no visible dropdown';
          const allEls = visible[0].querySelectorAll('*');
          for (const el of allEls) {
            if (el.textContent.trim() === text && el.children.length === 0) {
              el.click();
              return 'clicked: ' + text;
            }
          }
          const options = Array.from(allEls)
            .filter(e => e.children.length === 0 && e.textContent.trim())
            .map(e => e.textContent.trim())
            .slice(0, 10);
          return 'option not found: ' + text + ' | available: ' + options.join(', ');
        }, optionText);
        await page.waitForTimeout(500);
        filterResults.push('    ' + result);
        return result.includes('clicked');
      } catch (e) {
        filterResults.push('    选择 ' + optionText + ' 失败：' + e.message);
        return false;
      }
    };

    // 点击页面空白区域关闭当前下拉菜单
    const closeCurrentDropdown = async () => {
      await page.evaluate(() => {
        const backdrop = document.querySelector('.auxo-picker-backdrop') ||
                         document.querySelector('[class*="backdrop"]') ||
                         document.querySelector('[class*="mask"]');
        if (backdrop) { backdrop.click(); return 'clicked backdrop'; }
        // 没有遮罩层时，点击 body 的空白位置
        document.body.click();
        return 'clicked body';
      });
      await page.waitForTimeout(500);
    };

    const F = CONFIG.FILTER;

    filterResults.push('[带货情况]');
    if (F.monthlySalesMin > 0) {
      const clicked = await clickFilterBox('月销');
      if (clicked) { await selectDropdownOption('≥1000'); await closeCurrentDropdown(); }
    }

    filterResults.push('[商品信息]');
    if (F.commissionMin || F.commissionMax) {
      const clicked = await clickFilterBox('佣金区间');
      if (clicked) { await selectDropdownOption('10%-20%'); await closeCurrentDropdown(); }
    }

    if (F.shopScoreMin > 0) {
      const clicked = await clickFilterBox('商家体验分');
      if (clicked) { await selectDropdownOption('90分以上'); await closeCurrentDropdown(); }
    }

    if (F.goodReviewMin > 0) {
      const clicked = await clickFilterBox('好评率');
      if (clicked) { await selectDropdownOption('≥90%'); await closeCurrentDropdown(); }
    }

    if (F.shortVideoPush) {
      const clicked = await clickFilterBox('服务与权益');
      if (clicked) { await selectDropdownOption('短视频随心推'); await closeCurrentDropdown(); }
    }

    filterResults.push('等待筛选结果加载...');
    await page.waitForTimeout(2000);
    filterResults.push('--- 筛选条件应用完成 ---');
  };

  const extractTableProducts = async () => {
    return await page.evaluate(() => {
      const products = [];
      const seenTitlesLocal = new Set();

      const rows = document.querySelectorAll('.auxo-table-row-level-0');

      rows.forEach(row => {
        try {
          const product = {};
          const cells = Array.from(row.children);
          if (cells.length < 7) return;

          const fullText = row.textContent || '';

          // 列 0: 商品信息（标题 + 标签 + 店铺）
          if (cells[0]) {
            const cellText = cells[0].textContent || '';

            // 标题 - 使用 elementtiming 属性定位
            const textEls = cells[0].querySelectorAll('[elementtiming="element-timing"]');
            let title = '';
            for (const el of textEls) {
              const t = el.textContent.trim();
              if (t.length > 10 && !el.className.includes('label') && !el.className.includes('name') && !el.className.includes('score')) {
                title = t;
                break;
              }
            }
            product.title = title;

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

            // 店铺名称 - 使用特定类名
            const nameEl = cells[0].querySelector('.index_module__name___c3657');
            product.shopName = nameEl ? nameEl.textContent.trim() : '';

            // 店铺评分 - 使用特定类名
            const scoreEl = cells[0].querySelector('.index_module__score___c3657');
            product.shopScore = scoreEl ? scoreEl.textContent.trim() : '';
          }

          // 提取商品 ID 并构造 URL
          let productId = '';
          const allElements = row.querySelectorAll('*');
          for (const el of allElements) {
            const keys = Object.keys(el).filter(k => k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance'));
            for (const key of keys) {
              let current = el[key];
              while (current) {
                if (current.memoizedProps) {
                  const props = current.memoizedProps;
                  if (props.product_id) { productId = props.product_id; break; }
                  if (props.record && props.record.product_id) { productId = props.record.product_id; break; }
                  if (props.data && props.data.product_id) { productId = props.data.product_id; break; }
                }
                current = current.return;
              }
              if (productId) break;
            }
            if (productId) break;
          }
          product.productUrl = productId ? 'https://buyin.jinritemai.com/dashboard/product/detail?product_id=' + productId : '';

          // 列 1: 到手价
          if (cells[1]) {
            const priceText = cells[1].textContent || '';
            const pm = priceText.match(/[¥￥]?\s*([\d.]+)/);
            product.price = pm ? pm[1] : '';
          }

          // 列 2: 佣金
          if (cells[2]) {
            const commText = cells[2].textContent || '';
            const cm = commText.match(/(\d+)\s*%/);
            product.commissionRate = cm ? cm[1] + '%' : '';
            if (commText.includes('双佣金')) product.commissionType = '双佣金';
            else if (commText.includes('团长')) product.commissionType = '团长';
            else product.commissionType = '佣金';

            const earnMatch = commText.match(/赚\s*[¥￥]?([\d.]+)/);
            product.estimatedEarning = earnMatch ? earnMatch[1] : '';

            const invM = commText.match(/投放期\s*(\d+%)/);
            product.investmentCommission = invM ? invM[1] : '';
          }

          // 列 3: 好评率
          if (cells[3]) {
            const reviewText = cells[3].textContent || '';
            const rm = reviewText.match(/([\d.]+)\s*%/);
            product.goodReviewRate = rm ? rm[1] + '%' : '';
          }

          // 列 4: 带货达人数
          if (cells[4]) {
            const sellerText = cells[4].textContent || '';
            const sm = sellerText.match(/([\d,]+)/);
            product.sellerCount = sm ? sm[1] : '';
          }

          // 列 5: 销量
          if (cells[5]) {
            const volText = cells[5].textContent || '';
            const vm = volText.match(/([\d,.]+[万]?)/);
            product.salesVolume = vm ? vm[1] : '';

            const salesMatch = volText.match(/(?:同款)?月销\s*([\d,.]+[万]?)/);
            product.monthlySales = salesMatch ? salesMatch[1] : '';
          }

          product.ranking = '';
          const rankMatch = fullText.match(/([一 - 龥（）\w]+爆款榜·第\d+名)/);
          if (rankMatch) product.ranking = rankMatch[1].replace(/^\d+/, '').replace(/加选品车/g, '').trim();

          if (product.title && product.title.length > 3 && !seenTitlesLocal.has(product.title)) {
            seenTitlesLocal.add(product.title);
            products.push(product);
          }
        } catch (e) {}
      });

      return products;
    });
  };

  const extractGridProducts = async () => {
    return await page.evaluate(() => {
      const products = [];
      const seenTitlesLocal = new Set();
      const cards = document.querySelectorAll('[class*="index_module__wrapper___"]');

      cards.forEach(card => {
        try {
          const product = {};
          const fullText = card.textContent || '';
          if (fullText.length < 30) return;

          const content = card.querySelector('[class*="index_module__content___"]');
          if (!content) return;

          const sections = Array.from(content.children);

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

          const priceMatch = fullText.match(/到手价\s*[¥￥]?\s*([\d.]+)/);
          product.price = priceMatch ? priceMatch[1] : '';

          const salesMatch = fullText.match(/(?:同款)?月销\s*([\d,.]+[万]?)/);
          product.monthlySales = salesMatch ? salesMatch[1] : '';

          const commissionMatch = fullText.match(/(\d+)\s*%/);
          product.commissionRate = commissionMatch ? commissionMatch[1] + '%' : '';

          const earnMatch = fullText.match(/赚\s*[¥￥]?([\d.]+)/);
          product.estimatedEarning = earnMatch ? earnMatch[1] : '';

          let commissionType = '';
          if (fullText.includes('双佣金')) commissionType = '双佣金';
          else if (fullText.includes('团长')) commissionType = '团长';
          else if (fullText.includes('佣金')) commissionType = '佣金';
          product.commissionType = commissionType;

          const investMatch = fullText.match(/投放期\s*(\d+%)/);
          product.investmentCommission = investMatch ? investMatch[1] : '';

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
            const hasRanking = fullText.includes('爆款榜');
            if (hasRanking) {
              const rankMatch = fullText.match(/([一 - 龥（）\w]+爆款榜·第\d+名)/);
              product.ranking = rankMatch ? rankMatch[1] : '';
              product.ranking = product.ranking.replace(/^\d+/, '').replace(/加选品车/g, '').trim();
            }
            for (const t of shopTexts) {
              if (/^\d{2,3}$/.test(t)) {
                product.shopScore = t + '分';
              } else if (t.length > 1 && !t.includes('加选品车') && !t.includes('爆款榜')) {
                product.shopName = t;
              }
            }
          }

          if (product.title && product.title.length > 3 && !seenTitlesLocal.has(product.title)) {
            seenTitlesLocal.add(product.title);
            products.push(product);
          }
        } catch (e) {}
      });

      return products;
    });
  };

  const scrollPage = async () => {
    await page.evaluate(() => {
      const container = document.getElementById('portal');
      if (container) {
        container.scrollTop = container.scrollHeight;
      } else {
        window.scrollTo(0, document.body.scrollHeight);
      }
    });
    await page.waitForTimeout(2500);
  };

  const filterProducts = (products) => {
    if (!CONFIG.POST_FILTER) return products;
    const F = CONFIG.FILTER;

    const filtered = products.filter(p => {
      // 标签过滤：包含任一指定标签
      if (F.tagsInclude && F.tagsInclude.length > 0 && p.tags) {
        const hasRequiredTag = F.tagsInclude.some(tag => p.tags.includes(tag));
        if (!hasRequiredTag) return false;
      }

      // 预估收益过滤：≥ 指定金额
      if (F.estimatedEarningMin) {
        const earning = parseFloat(p.estimatedEarning);
        if (!earning || earning < F.estimatedEarningMin) return false;
      }

      // 带货达人数/销量比例过滤
      if (F.salesConversionMin) {
        const sellerCount = parseInt((p.sellerCount || '').replace(/,/g, ''));
        const salesVolume = parseInt((p.salesVolume || '').replace(/[,.万]/g, '').replace(/万/, '0000'));
        if (sellerCount && salesVolume) {
          const ratio = (sellerCount / salesVolume) * 100;
          if (ratio <= F.salesConversionMin) return false;
        }
      }

      return true;
    });

    console.log('后处理过滤：' + products.length + ' → ' + filtered.length + ' 条');
    return filtered;
  };

  // 主流程（playwright-cli 连接到用户已打开的浏览器，所以不需要导航和登录检查）
  if (CONFIG.VIEW_MODE === 'table') {
    await switchToTableView();
  }

  if (CONFIG.APPLY_UI_FILTERS) {
    await applyFilters();
  }

  const allProducts = [];
  const seenTitles = new Set();
  let noNewDataCount = 0;
  let lastProductCount = 0;
  let scrollAttempts = 0;

  const extractFn = CONFIG.VIEW_MODE === 'table' ? extractTableProducts : extractGridProducts;

  while (allProducts.length < CONFIG.TARGET_COUNT && scrollAttempts < CONFIG.MAX_SCROLL) {
    const products = await extractFn();

    let newCount = 0;
    for (const p of products) {
      if (!seenTitles.has(p.title)) {
        seenTitles.add(p.title);
        allProducts.push(p);
        newCount++;
      }
    }

    console.log('第 ' + (scrollAttempts + 1) + ' 次扫描：发现 ' + products.length + ' 个，新增 ' + newCount + ' 个，总计 ' + allProducts.length + '/' + CONFIG.TARGET_COUNT);

    if (allProducts.length >= CONFIG.TARGET_COUNT) {
      console.log('已达到目标数量！');
      break;
    }

    if (allProducts.length === lastProductCount) {
      noNewDataCount++;
      if (noNewDataCount >= 3) {
        console.log('连续 ' + noNewDataCount + ' 次没有新数据，停止爬取');
        break;
      }
    } else {
      noNewDataCount = 0;
    }
    lastProductCount = allProducts.length;

    await scrollPage();
    scrollAttempts++;
  }

  let finalProducts = allProducts.slice(0, CONFIG.TARGET_COUNT);

  if (CONFIG.POST_FILTER) {
    finalProducts = filterProducts(finalProducts);
    if (finalProducts.length < CONFIG.TARGET_COUNT) {
      console.log('过滤后数量不足，继续爬取...');
      let extraScrolls = 0;
      while (finalProducts.length < CONFIG.TARGET_COUNT && extraScrolls < CONFIG.MAX_SCROLL) {
        await scrollPage();
        const products = await extractFn();
        for (const p of products) {
          if (!seenTitles.has(p.title)) {
            seenTitles.add(p.title);
            allProducts.push(p);
          }
        }
        const reFiltered = filterProducts(allProducts.slice(0, CONFIG.TARGET_COUNT * 3));
        if (reFiltered.length === finalProducts.length) {
          extraScrolls++;
          if (extraScrolls >= 3) break;
        } else {
          finalProducts = reFiltered.slice(0, CONFIG.TARGET_COUNT);
          extraScrolls = 0;
        }
      }
      finalProducts = filterProducts(allProducts).slice(0, CONFIG.TARGET_COUNT);
    }
  }

  finalProducts.forEach((p, i) => p.index = i + 1);

  console.log('\n=== 爬取完成！共获取 ' + finalProducts.length + ' 条商品数据 ===\n');

  if (finalProducts.length > 0) {
    console.log('--- 数据预览（前 3 条）---');
    finalProducts.slice(0, 3).forEach(p => {
      console.log(p.index + '. ' + p.title);
      console.log('   价格：¥' + p.price + ' | 佣金：' + p.commissionType + ' ' + p.commissionRate + ' | 预估赚：¥' + p.estimatedEarning);
      console.log('   好评率：' + (p.goodReviewRate || '-') + ' | 达人数：' + (p.sellerCount || '-') + ' | 销量：' + (p.salesVolume || '-'));
      console.log('   店铺：' + (p.shopName || '-') + ' (' + (p.shopScore || '-') + ') ' + (p.ranking || ''));
      console.log('   标签：' + (p.tags || '-'));
      console.log('   链接：' + (p.productUrl || '-'));
      console.log('');
    });
  }

  return JSON.stringify({products: finalProducts, filterLog: filterResults});
}
