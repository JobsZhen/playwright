async (page) => {
  // 查找所有筛选标签
  const result = await page.evaluate(() => {
    const all = document.querySelectorAll('[class*="index_module"]');
    const items = [];
    for (const el of all) {
      const text = el.textContent.trim();
      if (text && text.length < 20) {
        items.push(text);
      }
    }
    return items;
  });

  return JSON.stringify(result);
}
