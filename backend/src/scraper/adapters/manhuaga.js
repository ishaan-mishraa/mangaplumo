const puppeteer = require('puppeteer');

/**
 * Adapter for manhuaga.com with robust selectors and fallback logic
 */
async function safeGoto(page, url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      // Use domcontentloaded instead of networkidle2
      // domcontentloaded will trigger once the HTML is parsed, not waiting for all resources
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      
      // Add a small delay to allow critical scripts to initialize
      // Replace waitForTimeout with Promise+setTimeout
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return;
    } catch (err) {
      console.warn(`[Retry ${i + 1}] Navigation failed for ${url}: ${err.message}`);
      
      if (i === retries - 1) {
        throw err;
      }
      
      // Increase wait time between retries
      const waitTime = 3000 * (i + 1);
      console.log(`Waiting ${waitTime}ms before next retry...`);
      await new Promise(res => setTimeout(res, waitTime));
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
  },

  async fetchPageImageUrls(chapterUrl, browser) {
    console.log(`[manhuaga] Fetching images from: ${chapterUrl}`);
    const page = await browser.newPage();
    
    // Set a more realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.84 Safari/537.36');
    
    // Disable timeout for navigation
    await page.setDefaultNavigationTimeout(0);
    
    // Block unnecessary resource types to speed up loading
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      // Block ads, analytics, and other unnecessary resources
      if (['stylesheet', 'font', 'media', 'texttrack', 'object', 'beacon', 'csp_report', 'imageset'].includes(resourceType)) {
        request.abort();
      } else if (resourceType === 'image' && !request.url().includes('.jpg') && !request.url().includes('.png') && !request.url().includes('.gif') && !request.url().includes('.webp')) {
        // Block small images like ads/trackers but allow manga images
        request.abort();
      } else if (resourceType === 'script' && (request.url().includes('ads') || request.url().includes('analytics'))) {
        request.abort();
      } else {
        request.continue();
      }
    });

    try {
      // Use domcontentloaded instead of networkidle2 for faster loading
      console.log(`[manhuaga] Navigating to chapter page...`);
      await page.goto(chapterUrl, { waitUntil: 'domcontentloaded' });
      
      // Look for the reader area with a generous timeout
      console.log(`[manhuaga] Waiting for reader area...`);
      
      // Try multiple selectors with a fallback approach
      const imageSelectors = [
        '#readerarea img.ts-main-image',
        '#readerarea img',
        '.reading-content img',
        '.entry-content img'
      ];
      
      let urls = [];
      for (const selector of imageSelectors) {
        try {
          console.log(`[manhuaga] Trying selector: ${selector}`);
          
          // Wait for at least one image to appear
          await page.waitForSelector(selector, { timeout: 30000 });
          
          // Extract image URLs
          urls = await page.$$eval(
            selector,
            imgs => imgs.map(img => img.src || img.getAttribute('data-src'))
              .filter(src => src && (src.includes('.jpg') || src.includes('.png') || src.includes('.jpeg') || src.includes('.webp')))
          );
          
          if (urls.length > 0) {
            console.log(`[manhuaga] Found ${urls.length} images with selector: ${selector}`);
            break;
          }
        } catch (err) {
          console.warn(`[manhuaga] Selector ${selector} failed: ${err.message}`);
        }
      }
      
      // If no images found with standard selectors, try a last-resort approach
      if (urls.length === 0) {
        console.log(`[manhuaga] No images found with standard selectors, trying generic image tags...`);
        
        // Evaluate any image on the page that might be a manga page
        urls = await page.$$eval(
          'img',
          imgs => imgs
            .filter(img => {
              const src = img.src;
              const width = parseInt(img.width || img.getAttribute('width') || 0);
              // Only include larger images likely to be manga pages (filter out icons/ads)
              return src && width > 200 && (
                src.includes('.jpg') || 
                src.includes('.jpeg') || 
                src.includes('.png') || 
                src.includes('.webp')
              );
            })
            .map(img => img.src)
            .filter(Boolean)
        );
        
        console.log(`[manhuaga] Found ${urls.length} images with generic selector`);
      }
      
      await page.close();
      return urls;
    } catch (err) {
      console.error(`[manhuaga] Error fetching images: ${err.message}`);
      await page.close();
      return [];
    }
  }
};
