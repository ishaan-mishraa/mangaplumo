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

    // wait for either old or new chapter selector
    try {
      await page.waitForSelector('#chapterlist li', { timeout: 10000 });
    } catch {
      console.warn('[manhuaga] fetchChapterList: fallback to generic chapter links');
    }

    const chapters = await page.$$eval(
      'a[href*="/manga/"]',
      (links) => {
        const seen = new Set();
        return links
          .filter(a => a.pathname.includes('/chapter'))
          .map(a => ({ title: a.textContent.trim(), url: a.href }))
          .filter(item => !seen.has(item.url) && seen.add(item.url));
      }
    );

    await page.close();
    return chapters.reverse().map((ch, i) => ({ ...ch, title: `Chapter ${i + 1}` }));
  },

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
