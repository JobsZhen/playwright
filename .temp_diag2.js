async (page) => {
  // 1. 尝试点击月销
  const r1 = await page.evaluate(() => {
    const all = document.querySelectorAll('[class*="index_module"]');
    for (const el of all) {
      if (el.textContent.trim() === '月销') {
        const box = el.querySelector('.index_module__box____17c1');
        if (box) { box.click(); return 'clicked 月销 box'; }
        el.click();
        return 'clicked 月销 element';
      }
    }
    return '月销 not found';
  });

  await page.waitForTimeout(1000);

  // 2. 选择 ≥1000
  const r2 = await page.evaluate(() => {
    const dropdowns = document.querySelectorAll('.auxo-select-dropdown');
    const visible = Array.from(dropdowns).filter(d => d.offsetParent !== null);
    if (visible.length === 0) return 'no dropdown';
    const all = visible[0].querySelectorAll('*');
    for (const el of all) {
      if (el.textContent.trim() === '≥1000' && el.children.length === 0) {
        el.click();
        return 'clicked ≥1000';
      }
    }
    return '≥1000 not found';
  });

  await page.waitForTimeout(500);

  // 3. 点击佣金区间
  const r3 = await page.evaluate(() => {
    const all = document.querySelectorAll('[class*="index_module"]');
    for (const el of all) {
      if (el.textContent.trim() === '佣金区间') {
        const box = el.querySelector('.index_module__box____17c1');
        if (box) { box.click(); return 'clicked 佣金区间 box'; }
        el.click();
        return 'clicked 佣金区间 element';
      }
    }
    return '佣金区间 not found';
  });

  await page.waitForTimeout(1000);

  // 4. 选择 10%-20%
  const r4 = await page.evaluate(() => {
    const dropdowns = document.querySelectorAll('.auxo-select-dropdown');
    const visible = Array.from(dropdowns).filter(d => d.offsetParent !== null);
    if (visible.length === 0) return 'no dropdown';
    const all = visible[0].querySelectorAll('*');
    for (const el of all) {
      if (el.textContent.trim() === '10%-20%' && el.children.length === 0) {
        el.click();
        return 'clicked 10pct-20pct';
      }
    }
    return '10pct-20pct not found';
  });

  await page.waitForTimeout(1000);

  // 5. 点击商家体验分
  const r5 = await page.evaluate(() => {
    const all = document.querySelectorAll('[class*="index_module"]');
    for (const el of all) {
      if (el.textContent.trim() === '商家体验分') {
        const box = el.querySelector('.index_module__box____17c1');
        if (box) { box.click(); return 'clicked 商家体验分 box'; }
        el.click();
        return 'clicked 商家体验分 element';
      }
    }
    return '商家体验分 not found';
  });

  await page.waitForTimeout(1000);

  // 6. 选择 90 分以上
  const r6 = await page.evaluate(() => {
    const dropdowns = document.querySelectorAll('.auxo-select-dropdown');
    const visible = Array.from(dropdowns).filter(d => d.offsetParent !== null);
    if (visible.length === 0) return 'no dropdown';
    const all = visible[0].querySelectorAll('*');
    for (const el of all) {
      const t = el.textContent.trim();
      if ((t === '90 分以上' || t === '90分以上') && el.children.length === 0) {
        el.click();
        return 'clicked ' + t;
      }
    }
    return '90分以上 not found';
  });

  await page.waitForTimeout(500);

  // 7. 点击好评率
  const r7 = await page.evaluate(() => {
    const all = document.querySelectorAll('[class*="index_module"]');
    for (const el of all) {
      if (el.textContent.trim() === '好评率') {
        const box = el.querySelector('.index_module__box____17c1');
        if (box) { box.click(); return 'clicked 好评率 box'; }
        el.click();
        return 'clicked 好评率 element';
      }
    }
    return '好评率 not found';
  });

  await page.waitForTimeout(1000);

  // 8. 选择 ≥90%
  const r8 = await page.evaluate(() => {
    const dropdowns = document.querySelectorAll('.auxo-select-dropdown');
    const visible = Array.from(dropdowns).filter(d => d.offsetParent !== null);
    if (visible.length === 0) return 'no dropdown';
    const all = visible[0].querySelectorAll('*');
    for (const el of all) {
      const t = el.textContent.trim();
      if ((t === '≥90%' || t === '>=90%') && el.children.length === 0) {
        el.click();
        return 'clicked ≥90pct';
      }
    }
    return '≥90pct not found';
  });

  await page.waitForTimeout(500);

  // 9. 点击服务与权益
  const r9 = await page.evaluate(() => {
    const all = document.querySelectorAll('[class*="index_module"]');
    for (const el of all) {
      if (el.textContent.trim() === '服务与权益') {
        const box = el.querySelector('.index_module__box____17c1');
        if (box) { box.click(); return 'clicked 服务与权益 box'; }
        el.click();
        return 'clicked 服务与权益 element';
      }
    }
    return '服务与权益 not found';
  });

  await page.waitForTimeout(1000);

  // 10. 选择短视频随心推
  const r10 = await page.evaluate(() => {
    const dropdowns = document.querySelectorAll('.auxo-select-dropdown');
    const visible = Array.from(dropdowns).filter(d => d.offsetParent !== null);
    if (visible.length === 0) return 'no dropdown';
    const all = visible[0].querySelectorAll('*');
    for (const el of all) {
      const t = el.textContent.trim();
      if (t.includes('短视频随心推') && el.children.length === 0) {
        el.click();
        return 'clicked ' + t;
      }
    }
    return '短视频随心推 not found';
  });

  await page.waitForTimeout(2000);

  return JSON.stringify({
    r1_月销: r1,
    r2_选择1000: r2,
    r3_佣金区间: r3,
    r4_选择10_20: r4,
    r5_商家体验分: r5,
    r6_选择90分以上: r6,
    r7_好评率: r7,
    r8_选择90pct: r8,
    r9_服务与权益: r9,
    r10_选择短视频: r10
  });
}
