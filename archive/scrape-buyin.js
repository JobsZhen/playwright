// 抖音电商选品数据爬取脚本
const fs = require('fs');
const path = require('path');

// CSV 转义函数
function escapeCsvField(field) {
  if (field === null || field === undefined) return '';
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

// 将数据转换为 CSV 格式
function convertToCsv(data, headers) {
  const headerRow = headers.map(escapeCsvField).join(',');
  const rows = data.map(item =>
    headers.map(header => escapeCsvField(item[header])).join(',')
  );
  return [headerRow, ...rows].join('\n');
}

// 等待指定毫秒数
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 等待登录完成
async function waitForLogin(page, maxWaitTime = 300000) { // 默认5分钟
  console.log('等待扫码登录...');
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    const currentUrl = page.url();
    // 登录成功后 URL 会变化，不再包含 /account/login
    if (!currentUrl.includes('/account/login')) {
      console.log('登录成功！');
      return true;
    }
    await sleep(2000); // 每2秒检查一次
  }

  throw new Error('登录超时，请重试');
}

// 等待并点击"选品"菜单
async function clickXuanpinMenu(page) {
  console.log('等待页面加载完成...');
  await sleep(3000);

  // 尝试多种可能的选择器
  const selectors = [
    'text=选品',
    '[data-testid="选品"]',
    'a:has-text("选品")',
    'span:has-text("选品")',
    'div:has-text("选品")',
    'button:has-text("选品")'
  ];

  for (const selector of selectors) {
    try {
      const element = await page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 })) {
        console.log(`找到"选品"菜单: ${selector}`);
        await element.click();
        console.log('已点击"选品"菜单');
        await sleep(5000); // 等待5秒让商品列表加载
        return true;
      }
    } catch (e) {
      // 继续尝试下一个选择器
    }
  }

  throw new Error('未找到"选品"菜单');
}

// 爬取当前页面的商品数据
async function scrapeProducts(page) {
  return await page.evaluate(() => {
    const products = [];

    // 尝试多种可能的商品容器选择器
    const productSelectors = [
      '[class*="product"]',
      '[class*="goods"]',
      '[class*="item"]',
      '[class*="card"]',
      'table tbody tr',
      '[data-product-id]',
      '[data-goods-id]'
    ];

    let productElements = [];
    for (const selector of productSelectors) {
      productElements = document.querySelectorAll(selector);
      if (productElements.length > 0) {
        console.log(`找到商品元素: ${selector}, 数量: ${productElements.length}`);
        break;
      }
    }

    productElements.forEach((element, index) => {
      try {
        const product = {};

        // 提取商品名称
        const titleSelectors = [
          '[class*="title"]',
          '[class*="name"]',
          'h3',
          'h4',
          'a[title]',
          '[data-title]'
        ];

        for (const selector of titleSelectors) {
          const titleEl = element.querySelector(selector);
          if (titleEl) {
            product.title = titleEl.textContent.trim() || titleEl.getAttribute('title') || '';
            if (product.title) break;
          }
        }

        // 提取价格
        const priceSelectors = [
          '[class*="price"]',
          '[class*="Price"]',
          '[data-price]'
        ];

        for (const selector of priceSelectors) {
          const priceEl = element.querySelector(selector);
          if (priceEl) {
            product.price = priceEl.textContent.trim().replace(/[¥￥]/g, '');
            if (product.price) break;
          }
        }

        // 提取销量
        const salesSelectors = [
          '[class*="sales"]',
          '[class*="sold"]',
          '[class*="volume"]'
        ];

        for (const selector of salesSelectors) {
          const salesEl = element.querySelector(selector);
          if (salesEl) {
            product.sales = salesEl.textContent.trim();
            if (product.sales) break;
          }
        }

        // 提取商品链接
        const linkEl = element.querySelector('a[href]');
        if (linkEl) {
          product.link = linkEl.href;
        }

        // 提取商品ID
        const idSelectors = [
          '[data-product-id]',
          '[data-goods-id]',
          '[data-id]'
        ];

        for (const selector of idSelectors) {
          const idEl = element.querySelector(selector);
          if (idEl) {
            product.id = idEl.getAttribute('data-product-id') ||
                        idEl.getAttribute('data-goods-id') ||
                        idEl.getAttribute('data-id') || '';
            if (product.id) break;
          }
        }

        // 提取图片
        const imgEl = element.querySelector('img[src]');
        if (imgEl) {
          product.image = imgEl.src;
        }

        // 只添加有标题的商品
        if (product.title) {
          product.index = index + 1;
          products.push(product);
        }
      } catch (e) {
        console.error('提取商品数据失败:', e);
      }
    });

    return products;
  });
}

// 滚动加载更多内容
async function scrollAndLoad(page, targetCount = 50) {
  let allProducts = [];
  let lastHeight = 0;
  let scrollAttempts = 0;
  const maxAttempts = 30;

  console.log(`开始爬取商品数据，目标: ${targetCount} 条`);

  while (allProducts.length < targetCount && scrollAttempts < maxAttempts) {
    // 爬取当前页面的商品
    const products = await scrapeProducts(page);

    // 去重并添加新商品
    const existingIds = new Set(allProducts.map(p => p.title));
    const newProducts = products.filter(p => !existingIds.has(p.title));
    allProducts = [...allProducts, ...newProducts];

    console.log(`已爬取 ${allProducts.length} 条商品数据`);

    if (allProducts.length >= targetCount) {
      break;
    }

    // 滚动到页面底部
    const currentHeight = await page.evaluate(() => document.body.scrollHeight);

    if (currentHeight === lastHeight) {
      scrollAttempts++;
      console.log(`页面高度未变化，尝试次数: ${scrollAttempts}`);
      if (scrollAttempts >= 3) {
        console.log('已到达页面底部，无法加载更多数据');
        break;
      }
    } else {
      scrollAttempts = 0;
    }

    lastHeight = currentHeight;

    // 执行滚动
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    // 等待加载
    await sleep(2000);

    // 尝试点击"加载更多"按钮（如果存在）
    try {
      const loadMoreBtn = await page.locator('text=加载更多').first();
      if (await loadMoreBtn.isVisible({ timeout: 1000 })) {
        await loadMoreBtn.click();
        console.log('已点击"加载更多"按钮');
        await sleep(2000);
      }
    } catch (e) {
      // 没有"加载更多"按钮，继续滚动
    }
  }

  return allProducts.slice(0, targetCount);
}

// 主函数
async function main(page) {
  try {
    // 1. 等待登录
    await waitForLogin(page);

    // 2. 点击"选品"菜单
    await clickXuanpinMenu(page);

    // 3. 爬取商品数据
    const products = await scrollAndLoad(page, 50);

    console.log(`\n爬取完成！共获取 ${products.length} 条商品数据`);

    // 4. 保存为 CSV
    if (products.length > 0) {
      const headers = ['index', 'id', 'title', 'price', 'sales', 'link', 'image'];
      const csv = convertToCsv(products, headers);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `products_${timestamp}.csv`;
      const filepath = path.join(process.cwd(), filename);

      fs.writeFileSync(filepath, '﻿' + csv, 'utf8'); // 添加 BOM 以支持 Excel 打开
      console.log(`数据已保存到: ${filepath}`);

      // 同时保存 JSON 格式
      const jsonFilename = `products_${timestamp}.json`;
      const jsonFilepath = path.join(process.cwd(), jsonFilename);
      fs.writeFileSync(jsonFilepath, JSON.stringify(products, null, 2), 'utf8');
      console.log(`JSON 数据已保存到: ${jsonFilepath}`);
    } else {
      console.log('未爬取到商品数据');
    }

    return products;
  } catch (error) {
    console.error('爬取过程中出错:', error.message);
    throw error;
  }
}

module.exports = main;
