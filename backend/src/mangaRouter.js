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
      const series = await listSeries(req.body.siteUrl);
      return res.json(series);
    } catch (e) {
      console.error('❌ [ /api/manga/series ] error:', e);   // ← should log e.stack
      return res.status(500).json({ error: e.message });
    }
  });
  

// POST /api/manga/chapters { seriesUrl }
router.post('/chapters', async (req, res) => {
  try {
    const { seriesUrl } = req.body;
    const chapters = await listChapters(seriesUrl);
    res.json(chapters);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/manga/download { chapters: [...], seriesUrl }
router.post('/download', async (req, res) => {
    try {
      const { seriesUrl, chapters } = req.body;
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
      console.error('[ /api/manga/download ] error:', err);
      res.status(500).json({ error: err.message || "Unexpected server error" });
    }
  });
  
  
  

module.exports = router;
