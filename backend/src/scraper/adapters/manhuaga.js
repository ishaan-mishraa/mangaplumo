/**
 * Given a chapter URL & a Puppeteer instance, return its image URLs.
 */
const puppeteer = require('puppeteer');

async function safeGoto(page, url, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        await page.goto(url, {
          waitUntil: 'networkidle2',
          timeout: 60000  // Extended to 60s
        });
        return;
      } catch (err) {
        if (i === retries - 1) throw err;
        console.warn(`[Retry ${i + 1}] Navigation failed for ${url}. Retrying...`);
        await new Promise(res => setTimeout(res, 2000)); // wait 2 seconds before retrying
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
      await page.goto(baseUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });
  
      await page.waitForSelector('.bsx .bigor .tt a', { timeout: 10000 });
  
      const mangaList = await page.$$eval(
        '.bsx .bigor .tt a',
        links => links.map(a => ({
          title: a.textContent.trim(),
          url:   a.href
        }))
      );
  
      await page.close();
      return mangaList;
    },
  
    async fetchChapterList(seriesUrl) {
      const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0');
  
      try {
        await page.goto(seriesUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 60000,
        });
  
        await page.waitForSelector('#chapterlist li', { timeout: 10000 });
  
        const chapters = await page.$$eval('#chapterlist li', items =>
          items.map(li => {
            const aTag = li.querySelector('a');
            const dateTag = li.querySelector('.chapterdate');
            return {
              title: aTag?.innerText.trim().replace(/\s+/g, ' ') || 'Untitled',
              url: aTag?.href || '',
              date: dateTag?.innerText.trim() || ''
            };
          }).filter(ch => ch.url)
        );
  
        return chapters.reverse().map((ch, i) => ({
          ...ch,
          title: `Chapter ${i + 1}`
        }));
      } catch (err) {
        console.error('[manhuaga] fetchChapterList error:', err);
        throw err;
      } finally {
        await browser.close();
      }
    },
  
    async fetchPageImageUrls(chapterUrl, browser) {
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0');
  
      await safeGoto(page, chapterUrl); // Use retryable navigation
  
      await page.waitForSelector('#readerarea img.ts-main-image', { timeout: 10000 });
  
      const urls = await page.$$eval(
        '#readerarea img.ts-main-image',
        imgs => imgs.map(img => img.src)
      );
  
      await page.close();
      return urls;
    }
  };
  