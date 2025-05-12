const puppeteer = require('puppeteer');

/**
 * Adapter for manhuaga.com with robust selectors and fallback logic
 */
async function safeGoto(page, url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
      return;
    } catch (err) {
      if (i === retries - 1) throw err;
      console.warn(`[Retry ${i + 1}] Navigation failed for ${url}. Retrying...`);
      await new Promise(res => setTimeout(res, 2000));
    }
  }
}

module.exports = {
  name: 'manhuaga.com',

  supports(url) {
    return url.includes('manhuaga.com');
  },

  async fetchMangaList(baseUrl, browser) {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0');
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

    let mangaList = [];
    // attempt primary selector
    try {
      await page.waitForSelector('.bsx .bigor .tt a', { timeout: 10000 });
      mangaList = await page.$$eval(
        '.bsx .bigor .tt a',
        links => links.map(a => ({ title: a.textContent.trim(), url: a.href }))
      );
    } catch (err) {
      console.warn('[manhuaga] Primary series selector failed, falling back to generic links.');
      mangaList = await page.$$eval(
        'a[href*="/manga/"]',
        links => {
          const seen = new Set();
          return links
            .map(a => ({ title: a.textContent.trim() || a.pathname.split('/').pop(), url: a.href }))
            .filter(item => !seen.has(item.url) && seen.add(item.url));
        }
      );
    }

    await page.close();
    return mangaList;
  },

  async fetchChapterList(seriesUrl, browser) {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0');
  await safeGoto(page, seriesUrl);

  console.log('[manhuaga] Fetching chapters from:', seriesUrl);
  
  // Try the specific selector first
  try {
    await page.waitForSelector('#chapterlist li', { timeout: 10000 });
    
    const chapters = await page.$$eval(
      '#chapterlist li .eph-num a',
      (links) => {
        return links.map(a => ({
          title: a.textContent.trim() || a.href.split('/').pop().replace(/-/g, ' '),
          url: a.href,
          num: a.closest('li')?.getAttribute('data-num') || ''
        }));
      }
    );
    
    console.log(`[manhuaga] Found ${chapters.length} chapters with primary selector`);
    
    if (chapters.length > 0) {
      await page.close();
      return chapters.map((ch, i) => ({ ...ch, title: `Chapter ${ch.num || (i + 1)}` }));
    }
  } catch (err) {
    console.warn('[manhuaga] Primary chapter selector failed:', err.message);
  }

  // Fallback approach
  try {
    console.warn('[manhuaga] Trying fallback chapter selectors');
    
    // Try alternative selectors
    const fallbackSelectors = [
      '#chapterlist a', 
      '.eplister a', 
      '.chbox a'
    ];
    
    for (const selector of fallbackSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        
        const chapters = await page.$$eval(
          selector,
          (links) => links
            .filter(a => a.href.includes('/chapter-'))
            .map(a => ({ title: a.textContent.trim(), url: a.href }))
        );
        
        if (chapters.length > 0) {
          console.log(`[manhuaga] Found ${chapters.length} chapters with selector: ${selector}`);
          await page.close();
          return chapters.map((ch, i) => ({ ...ch, title: `Chapter ${i + 1}` }));
        }
      } catch (err) {
        console.warn(`[manhuaga] Fallback selector ${selector} failed`);
      }
    }
    
    // Last resort: generic chapter links
    console.warn('[manhuaga] Trying generic chapter link selector');
    const chapters = await page.$$eval(
      'a[href*="/chapter-"]',
      (links) => {
        const seen = new Set();
        return links
          .map(a => ({ title: a.textContent.trim() || a.href.split('/').pop(), url: a.href }))
          .filter(item => !seen.has(item.url) && seen.add(item.url));
      }
    );
    
    console.log(`[manhuaga] Found ${chapters.length} chapters with generic selector`);
    await page.close();
    return chapters.map((ch, i) => ({ ...ch, title: `Chapter ${i + 1}` }));
  } catch (err) {
    console.error('[manhuaga] All chapter fetch attempts failed:', err);
    await page.close();
    return [];
  }
}
,

  async fetchPageImageUrls(chapterUrl, browser) {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0');
    await safeGoto(page, chapterUrl);
    await page.waitForSelector('#readerarea img.ts-main-image', { timeout: 10000 });

    const urls = await page.$$eval(
      '#readerarea img.ts-main-image',
      imgs => imgs.map(img => img.src)
    );

    await page.close();
    return urls;
  }
};
