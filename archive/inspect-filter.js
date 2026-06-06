async (page) => {
  return await page.evaluate(() => {
    const el = document.querySelector('.index_module__GroupBoxWrapper____93d5');
    const result = [];
    let cur = el;
    for (let i = 0; i < 5; i++) {
      result.push({
        level: i,
        tag: cur.tagName,
        cls: cur.className.substring(0, 80),
        n: cur.children.length,
        cursor: cur.getAttribute('cursor') || ''
      });
      cur = cur.parentElement;
    }
    return JSON.stringify(result);
  });
}
