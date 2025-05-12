const express = require('express');
const scraper = require('./scraper/scraper');
const { listSeries, listChapters, downloadChapters, listSites } = require('./scraper/scraper');
const router = express.Router();


// e.g. GET /api/manga/sites
router.get('/sites', (_req, res) => {
  res.json(listSites());
});

// POST /api/manga/series  { siteUrl }
router.post('/series', async (req, res) => {
  try {
    if (!req.body.siteUrl) {
      return res.status(400).json({ error: 'Site URL is required' });
    }
    
    console.log(`Received request for manga series with URL: ${req.body.siteUrl}`);
    const series = await listSeries(req.body.siteUrl);
    
    if (!series || series.length === 0) {
      console.warn('No series found for URL:', req.body.siteUrl);
      return res.json([]);
    }
    
    return res.json(series);
  } catch (e) {
    console.error('❌ [ /api/manga/series ] error:', e.stack);
    return res.status(500).json({ error: e.message });
  }
});

router.post('/chapters', async (req, res) => {
  try {
    if (!req.body.seriesUrl) {
      return res.status(400).json({ error: 'Series URL is required' });
    }
    
    console.log(`Received request for chapters with URL: ${req.body.seriesUrl}`);
    const chapters = await listChapters(req.body.seriesUrl);
    
    if (!chapters || chapters.length === 0) {
      console.warn('No chapters found for URL:', req.body.seriesUrl);
      return res.json([]);
    }
    
    res.json(chapters);
  } catch (e) {
    console.error('❌ [ /api/manga/chapters ] error:', e.stack);
    res.status(500).json({ error: e.message });
  }
});

router.post('/download', async (req, res) => {
  try {
    const { seriesUrl, chapters } = req.body;
    
    if (!seriesUrl) {
      return res.status(400).json({ error: 'Series URL is required' });
    }
    
    if (!chapters || !Array.isArray(chapters) || chapters.length === 0) {
      return res.status(400).json({ error: 'At least one chapter must be selected' });
    }
    
    console.log(`Downloading ${chapters.length} chapters from ${seriesUrl}`);
    const result = await downloadChapters(seriesUrl, chapters);

    if (!result || !result.length || !result[0]?.fileName || !result[0]?.data) {
      console.error("🛑 downloadChapters returned invalid result:", result);
      return res.status(500).json({ error: "Failed to download chapter(s)." });
    }

    const [firstPdf] = result;

    res
      .set('Content-Type', 'application/pdf')
      .set('Content-Disposition', `attachment; filename="${firstPdf.fileName}"`)
      .send(Buffer.from(firstPdf.data));
  } catch (err) {
    console.error('[ /api/manga/download ] error:', err.stack);
    res.status(500).json({ error: err.message || "Unexpected server error" });
  }
});
  
  

module.exports = router;
