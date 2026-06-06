async (page) => {
  return await page.evaluate(() => {
    // Find table rows - look for elements with multiple cells
    const allDivs = document.querySelectorAll('div');
    const tableRows = [];

    for (const div of allDivs) {
      const children = Array.from(div.children);
      if (children.length >= 5 && children.length <= 10) {
        const text = div.textContent || '';
        if (text.includes('到手价') && text.includes('佣金') && text.includes('加选品车') && text.length > 50 && text.length < 2000) {
          const cellTexts = children.map(c => c.textContent.trim().substring(0, 100));
          tableRows.push({
            className: div.className.substring(0, 100),
            cellCount: children.length,
            cellTexts: cellTexts
          });
          if (tableRows.length >= 3) break;
        }
      }
    }

    return JSON.stringify(tableRows);
  });
}
