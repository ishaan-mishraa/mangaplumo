const { PDFDocument } = require('pdf-lib');
const sharp = require('sharp');
const axios = require('axios');
const ora = require('ora');
const cliProgress = require('cli-progress');
const puppeteer = require('puppeteer');

const adapters = [
  require('./adapters/manhuaga'),
  require('./adapters/manhuafast')
];

async function launchBrowser() {
  return puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ],
    defaultViewport: { width: 1280, height: 1024 }
  });
}

// Update in scraper.js
function listSites() {
  return adapters.map(a => ({ 
    name: a.name, 
    url: a.name.includes('manhuafast') ? 'https://manhuafast.net/' : 
         a.name.includes('manhuaga') ? 'https://manhuaga.com/' : ''
  }));
}


function findAdapter(url) {
  const a = adapters.find(a => a.supports(url));
  if (!a) throw new Error('No adapter for ' + url);
  return a;
}

async function listSeries(siteUrl) {
  console.log(`[scraper] Fetching manga list from: ${siteUrl}`);
  const adapter = findAdapter(siteUrl);
  if (typeof adapter.fetchMangaList !== 'function') {
    throw new Error(`Site ${adapter.name} does not support listing series`);
  }

  const browser = await launchBrowser();
  try {
    const result = await adapter.fetchMangaList(siteUrl, browser);
    console.log(`[scraper] Found ${result.length} manga series`);
    return result;
  } catch (err) {
    console.error(`[scraper] Error in listSeries: ${err.message}`);
    console.error(err.stack);
    throw err;
  } finally {
    await browser.close();
  }
}

async function listChapters(seriesUrl) {
  console.log(`[scraper] Fetching chapters from: ${seriesUrl}`);
  const adapter = findAdapter(seriesUrl);
  if (typeof adapter.fetchChapterList !== 'function') {
    throw new Error(`Site ${adapter.name} does not support listing chapters`);
  }

  const browser = await launchBrowser();
  try {
    const result = await adapter.fetchChapterList(seriesUrl, browser);
    console.log(`[scraper] Found ${result.length} chapters`);
    return result;
  } catch (err) {
    console.error(`[scraper] Error in listChapters: ${err.message}`);
    console.error(err.stack);
    throw err;
  } finally {
    await browser.close();
  }
}

async function downloadChapters(seriesUrl, chapters) {
  const adapter = findAdapter(seriesUrl);
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ],
    defaultViewport: null
  });
  const results = [];

  for (const ch of chapters) {
    let retryCount = 0;
    const maxRetries = 2;
    let success = false;
    
    while (retryCount <= maxRetries && !success) {
      const spinner = ora(`Fetching images for ${ch.title} (Attempt ${retryCount + 1}/${maxRetries + 1})`).start();
      let imageUrls;

      try {
        imageUrls = await adapter.fetchPageImageUrls(ch.url, browser);
        
        if (!imageUrls || imageUrls.length === 0) {
          throw new Error('No images returned');
        }
        
        spinner.succeed(`Found ${imageUrls.length} images`);
        success = true;
        
        const bar = new cliProgress.SingleBar({
          format: `📷 ${ch.title} |{bar}| {value}/{total}`,
          hideCursor: true
        }, cliProgress.Presets.shades_classic);

        bar.start(imageUrls.length, 0);
        const jpegBuffers = [];

        for (const url of imageUrls) {
          try {
            const { data: rawBuffer } = await axios.get(url, { 
              responseType: 'arraybuffer', 
              timeout: 30000,
              headers: {
                'Referer': seriesUrl,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.84 Safari/537.36'
              }
            });
            
            const jpegBuffer = await sharp(rawBuffer).jpeg().toBuffer();
            jpegBuffers.push(jpegBuffer);
            bar.increment();
          } catch (err) {
            console.warn(`⚠️ Failed to download/convert image: ${url} | ${err.message}`);
          }
        }

        bar.stop();

        if (jpegBuffers.length === 0) {
          console.warn(`⚠️ No valid images to create PDF for chapter: ${ch.title}`);
          continue;
        }

        const pdfDoc = await PDFDocument.create();
        for (const jpegBuffer of jpegBuffers) {
          try {
            const jpgImage = await pdfDoc.embedJpg(jpegBuffer);
            const page = pdfDoc.addPage([jpgImage.width, jpgImage.height]);
            page.drawImage(jpgImage, { x: 0, y: 0 });
          } catch (err) {
            console.warn(`⚠️ Failed to embed image in PDF: ${err.message}`);
          }
        }

        const pdfBytes = await pdfDoc.save();
        const safeName = ch.title.replace(/[<>:"/\\|?*]/g, '_');
        
        results.push({
          title: ch.title,
          fileName: `${safeName}.pdf`,
          data: pdfBytes
        });
      } catch (err) {
        retryCount++;
        if (retryCount > maxRetries) {
          spinner.fail(`❌ Error fetching images for ${ch.title}: ${err.message}`);
        } else {
          spinner.warn(`Warning: Failed attempt ${retryCount}/${maxRetries + 1} for ${ch.title}. Retrying...`);
          // Wait before retrying
          await new Promise(res => setTimeout(res, 5000));
        }
      }
    }
  }

  await browser.close();

  if (results.length === 0) {
    console.error('🛑 downloadChapters returned no PDFs.');
  }

  return results;
}


module.exports = {
  listSites,
  listSeries,
  listChapters,
  downloadChapters
};
