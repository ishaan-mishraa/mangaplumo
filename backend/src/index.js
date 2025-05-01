require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mangaRouter = require('./MangaRouter');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/manga', mangaRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🐉 Backend listening on ${PORT}`));
