// backend/src/scraper/scraper.js

const { PDFDocument } = require('pdf-lib');
const sharp = require('sharp');
const axios = require('axios');
const ora = require('ora');
const cliProgress = require('cli-progress');
const puppeteer = require('puppeteer');

// load your two adapters
const adapters = [
  require('./adapters/manhuaga'),
  require('./adapters/manhuafast')
];

// list supported sites for frontend cards
function listSites() {
  return adapters.map(a => ({ name: a.name }));
}

// pick the right adapter for a given URL
function findAdapter(url) {
  const a = adapters.find(a => a.supports(url));
  if (!a) throw new Error('No adapter for ' + url);
  return a;
}

// list manga series
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

// list chapters
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

// download selected chapters
// returns Array<{ title, fileName, data: Uint8Array }>
async function downloadChapters(seriesUrl, chapters) {
  const adapter = findAdapter(seriesUrl);
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const results = [];

  for (const ch of chapters) {
    const safeName = ch.title.replace(/[<>:"/\\|?*]/g, '_');
    const spinner = ora(`Fetching images for ${ch.title}`).start();
    let imageUrls;

    try {
      imageUrls = await adapter.fetchPageImageUrls(ch.url, browser);
      spinner.succeed(`Found ${imageUrls.length} images`);
    } catch (err) {
      spinner.fail(`Error fetching images for ${ch.title}: ${err.message}`);
      continue;
    }

    // download and convert to JPEG in-memory
    const bar = new cliProgress.SingleBar({
      format: `📷 ${ch.title} |{bar}| {value}/{total}`,
      hideCursor: true
    }, cliProgress.Presets.shades_classic);

    bar.start(imageUrls.length, 0);
    const jpegBuffers = [];

    for (const url of imageUrls) {
      const { data: rawBuffer } = await axios.get(url, { responseType: 'arraybuffer' });
      // convert any format to JPEG
      const jpegBuffer = await sharp(rawBuffer)
        .jpeg()
        .toBuffer();
      jpegBuffers.push(jpegBuffer);
      bar.increment();
    }

    bar.stop();

    // build PDF in memory
    const pdfDoc = await PDFDocument.create();
    for (const jpegBuffer of jpegBuffers) {
      const jpgImage = await pdfDoc.embedJpg(jpegBuffer);
      const page = pdfDoc.addPage([jpgImage.width, jpgImage.height]);
      page.drawImage(jpgImage, { x: 0, y: 0 });
    }

    const pdfBytes = await pdfDoc.save();
    results.push({
      title:    ch.title,
      fileName: `${safeName}.pdf`,
      data:     pdfBytes
    });
  }

  await browser.close();
  return results;
}

module.exports = {
  listSites,
  listSeries,
  listChapters,
  downloadChapters
};
