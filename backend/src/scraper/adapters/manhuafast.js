// scraper/adapters/manhuafast.js
const puppeteer = require('puppeteer');

// Add a reliable navigation function
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
  name: 'manhuafast.net',

  supports(url) {
    return url.includes('manhuafast.net');
  },

  /**
   * SITE‑WIDE MANGA LISTING
   */
  async fetchMangaList(baseUrl, browser) {
    console.log("[manhuafast] Fetching manga list from:", baseUrl);
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await safeGoto(page, baseUrl);

    let mangaList = [];
    
    // Try multiple selectors to handle potential site changes
    const selectors = [
      'div.page-item-detail.manga .item-summary .post-title h3 a',
      '.c-tabs-item__content .post-title h3 a',
      '.manga-title-badges',
      '.c-tabs-item .row .col-12 h3 a'
    ];
    
    for (const selector of selectors) {
      try {
        console.log(`[manhuafast] Trying selector: ${selector}`);
        await page.waitForSelector(selector, { timeout: 5000 });
        mangaList = await page.$$eval(
          selector,
          links => links.map(a => ({
            title: a.textContent.trim(),
            url: a.href,
            cover: a.closest('.c-tabs-item') ? 
                   a.closest('.c-tabs-item').querySelector('img')?.src : null
          }))
        );
        if (mangaList.length > 0) {
          console.log(`[manhuafast] Found ${mangaList.length} manga with selector: ${selector}`);
          break;
        }
      } catch (err) {
        console.warn(`[manhuafast] Selector ${selector} failed: ${err.message}`);
      }
    }
    
    // If all selectors fail, try a generic approach
    if (mangaList.length === 0) {
      console.warn('[manhuafast] All specific selectors failed, falling back to generic manga links');
      
      // Go to the manga archive page for better results
      try {
        await safeGoto(page, 'https://manhuafast.net/manga/', { timeout: 30000 });
        
        mangaList = await page.$$eval(
          'a[href*="/manga/"]',
          links => {
            const seen = new Set();
            return links
              .filter(a => a.href.includes('/manga/') && 
                       !a.href.includes('/chapter/') && 
                       a.textContent.trim().length > 0)
              .map(a => {
                // Try to find a parent element with image
                const parent = a.closest('.c-image-hover') || 
                               a.closest('.page-item-detail') ||
                               a.closest('.c-tabs-item');
                const imgSrc = parent ? parent.querySelector('img')?.src : null;
                
                return { 
                  title: a.textContent.trim(), 
                  url: a.href,
                  cover: imgSrc
                };
              })
              .filter(item => !seen.has(item.url) && seen.add(item.url));
          }
        );
        console.log(`[manhuafast] Found ${mangaList.length} manga with fallback method`);
      } catch (err) {
        console.error(`[manhuafast] Fallback method failed: ${err.message}`);
      }
    }

    await page.close();
    return mangaList;
  },

  /**
   * CHAPTER LIST FOR A GIVEN MANGA
   */
  async fetchChapterList(seriesUrl, browser) {
    console.log("[manhuafast] Fetching chapters from:", seriesUrl);
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await safeGoto(page, seriesUrl);

    // Try multiple selectors for chapters
    const chapterSelectors = [
      'li.wp-manga-chapter a', 
      '.wp-manga-chapter a',
      '.chapter-link',
      '.chapter a'
    ];
    
    let chapters = [];
    
    for (const selector of chapterSelectors) {
      try {
        console.log(`[manhuafast] Trying chapter selector: ${selector}`);
        await page.waitForSelector(selector, { timeout: 5000 });
        chapters = await page.$$eval(selector, (links) =>
          links.map((a, i, all) => ({
            title: a.textContent.trim(),
            url: a.href,
            date: a.closest('li')?.querySelector('.chapter-release-date')?.innerText.trim() || ''
          }))
        );
        if (chapters.length > 0) {
          console.log(`[manhuafast] Found ${chapters.length} chapters with selector: ${selector}`);
          break;
        }
      } catch (err) {
        console.warn(`[manhuafast] Chapter selector ${selector} failed: ${err.message}`);
      }
    }
    
    // If we have chapters but they don't have proper titles, add chapter numbers
    if (chapters.length > 0) {
      chapters = chapters.map((ch, i, all) => ({
        ...ch,
        title: ch.title.includes('Chapter') ? ch.title : `Chapter ${all.length - i}`
      }));
    } else {
      // If all selectors fail, fallback to generic chapter detection
      console.warn('[manhuafast] All chapter selectors failed, falling back to generic chapter links');
      chapters = await page.$$eval(
        'a[href*="/chapter/"]',
        links => {
          const seen = new Set();
          return links
            .filter(a => a.href.includes('/chapter/'))
            .map(a => ({ 
              title: a.textContent.trim() || a.href.split('/').pop().replace(/-/g, ' '), 
              url: a.href,
              date: ''
            }))
            .filter(item => !seen.has(item.url) && seen.add(item.url));
        }
      );
      
      // Add numbering
      chapters = chapters.map((ch, i, all) => ({
        ...ch,
        title: `Chapter ${all.length - i}`
      }));
      console.log(`[manhuafast] Found ${chapters.length} chapters with fallback method`);
    }

    await page.close();
    return chapters;
  },

  /**
   * IMAGE URL FETCHING
   */
  async fetchPageImageUrls(chapterUrl, browser) {
    console.log("[manhuafast] Fetching images from:", chapterUrl);
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await safeGoto(page, chapterUrl);
    
    // Try multiple selectors for images
    const imageSelectors = [
      'div.page-break.no-gaps img',
      '.reading-content img',
      '.entry-content img',
      '.wp-manga-chapter-img'
    ];
    
    let imageUrls = [];
    
    for (const selector of imageSelectors) {
      try {
        console.log(`[manhuafast] Trying image selector: ${selector}`);
        await page.waitForSelector(selector, { timeout: 5000 });
        imageUrls = await page.$$eval(
          selector,
          imgs => imgs.map(img => 
            img.getAttribute('data-src') || 
            img.getAttribute('data-lazy-src') || 
            img.src
          ).filter(Boolean)
        );
        if (imageUrls.length > 0) {
          console.log(`[manhuafast] Found ${imageUrls.length} images with selector: ${selector}`);
          break;
        }
      } catch (err) {
        console.warn(`[manhuafast] Image selector ${selector} failed: ${err.message}`);
      }
    }
    
    // If all selectors fail, try a generic approach
    if (imageUrls.length === 0) {
      console.warn('[manhuafast] All image selectors failed, falling back to generic image tags');
      imageUrls = await page.$$eval(
        'img',
        imgs => imgs
          .filter(img => {
            const src = img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.src;
            const width = parseInt(img.getAttribute('width') || img.width || 0);
            // Filter out small images like icons
            return src && width > 100 && (
              src.includes('.jpg') || 
              src.includes('.jpeg') || 
              src.includes('.png') || 
              src.includes('.webp')
            );
          })
          .map(img => img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.src)
          .filter(Boolean)
      );
      console.log(`[manhuafast] Found ${imageUrls.length} images with fallback method`);
    }

    await page.close();
    return imageUrls;
  }
};
