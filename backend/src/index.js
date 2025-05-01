require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mangaRouter = require('./mangaRouter');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || '*'
}));
app.use(express.json());

app.get('/', (req, res) => {
  res.send('🟢 MangaPlumo Backend is running.');
});

app.use('/api/manga', mangaRouter);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🐉 Backend listening on ${PORT}`));
