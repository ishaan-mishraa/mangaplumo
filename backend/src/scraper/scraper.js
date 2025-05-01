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

function listSites() {
  return adapters.map(a => ({ name: a.name }));
}

function findAdapter(url) {
  const a = adapters.find(a => a.supports(url));
  if (!a) throw new Error('No adapter for ' + url);
  return a;
}

async function listSeries(siteUrl) {
  const adapter = findAdapter(siteUrl);
  if (typeof adapter.fetchMangaList !== 'function') {
    throw new Error(`Site ${adapter.name} does not support listing series`);
  }

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    return await adapter.fetchMangaList(siteUrl, browser);
  } finally {
    await browser.close();
  }
}

async function listChapters(seriesUrl) {
  const adapter = findAdapter(seriesUrl);
  if (typeof adapter.fetchChapterList !== 'function') {
    throw new Error(`Site ${adapter.name} does not support listing chapters`);
  }

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    return await adapter.fetchChapterList(seriesUrl, browser);
  } finally {
    await browser.close();
  }
}

async function downloadChapters(seriesUrl, chapters) {
  const adapter = findAdapter(seriesUrl);
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox'],
    defaultViewport: null
  });
  const results = [];

  for (const ch of chapters) {
    const safeName = ch.title.replace(/[<>:"/\\|?*]/g, '_');
    const spinner = ora(`Fetching images for ${ch.title}`).start();
    let imageUrls;

    try {
      imageUrls = await adapter.fetchPageImageUrls(ch.url, browser, { timeout: 60000 }); // if adapter supports options
      if (!imageUrls || imageUrls.length === 0) throw new Error('No images returned');
      spinner.succeed(`Found ${imageUrls.length} images`);
    } catch (err) {
      spinner.fail(`❌ Error fetching images for ${ch.title}: ${err.message}`);
      continue;
    }

    const bar = new cliProgress.SingleBar({
      format: `📷 ${ch.title} |{bar}| {value}/{total}`,
      hideCursor: true
    }, cliProgress.Presets.shades_classic);

    bar.start(imageUrls.length, 0);
    const jpegBuffers = [];

    for (const url of imageUrls) {
      try {
        const { data: rawBuffer } = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
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
      const jpgImage = await pdfDoc.embedJpg(jpegBuffer);
      const page = pdfDoc.addPage([jpgImage.width, jpgImage.height]);
      page.drawImage(jpgImage, { x: 0, y: 0 });
    }

    const pdfBytes = await pdfDoc.save();
    results.push({
      title: ch.title,
      fileName: `${safeName}.pdf`,
      data: pdfBytes
    });
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
