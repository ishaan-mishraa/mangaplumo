import { useState } from 'react';
import axios from 'axios';
import ChapterModal from './ChapterModal';
import SiteCard from './SiteCard';

export default function SearchBar({ sites, onDownloaded }) {
  const [url, setUrl] = useState('');
  const [seriesList, setSeriesList] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [activeSeries, setActiveSeries] = useState(null);

  const [loadingSeries, setLoadingSeries] = useState(false);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  async function pickSeries(s) {
    setActiveSeries(s);
    setLoadingChapters(true);
    try {
      const res = await axios.post(
        'https://mangaplumo.onrender.com/api/manga/chapters',
        { seriesUrl: s.url }
      );
      setChapters(res.data);
      setShowModal(true);
    } catch (err) {
      console.error('Error fetching chapters:', err);
      alert('Failed to fetch chapters.');
    } finally {
      setLoadingChapters(false);
    }
  }

  async function fetchSeries() {
    const trimmed = url.trim();
    if (!trimmed) return alert('Please enter a URL.');

    setLoadingSeries(true);
    setSeriesList([]);
    try {
      const res = await axios.post(
        'https://mangaplumo.onrender.com/api/manga/series',
        { siteUrl: trimmed }
      );
      setSeriesList(res.data);
    } catch (err) {
      console.error('Error fetching series:', err);
      alert('Failed to fetch series.');
    } finally {
      setLoadingSeries(false);
    }
  }

  async function handleDownload(selectedChapters) {
    setDownloading(true);
    setDownloadProgress(0);
    try {
      const resp = await axios.post(
        'https://mangaplumo.onrender.com/api/manga/download',
        { seriesUrl: activeSeries.url, chapters: selectedChapters },
        {
          responseType: 'blob',
          onDownloadProgress: (e) => {
            if (e.lengthComputable) {
              setDownloadProgress(Math.round((e.loaded * 100) / e.total));
            }
          }
        }
      );

      const cd = resp.headers['content-disposition'] || '';
      const match = cd.match(/filename="(.+)"/);
      const filename = match ? match[1] : 'download.pdf';

      const blob = new Blob([resp.data], { type: 'application/pdf' });
      const urlBlob = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = urlBlob;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(urlBlob);
      onDownloaded(activeSeries);
      setShowModal(false);
    } catch (err) {
      console.error('Download failed:', err);
      alert('Failed to download file.');
    } finally {
      setDownloading(false);
      setDownloadProgress(0);
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') fetchSeries();
  };

  return (
    <div className="mt-6">
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-0">
        <input
          className="flex-grow p-3 rounded-lg sm:rounded-l-lg bg-gray-700 text-white"
          placeholder="Paste manga site or series URL here"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loadingSeries}
        />
        <button
          className={`bg-blue-600 px-6 rounded-lg sm:rounded-r-lg text-white flex items-center justify-center ${
            loadingSeries ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-800'
          }`}
          onClick={fetchSeries}
          disabled={loadingSeries}
        >
          {loadingSeries ? (
            <span className="animate-pulse">Fetching…</span>
          ) : (
            'Fetch Series'
          )}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
        {sites.filter(Boolean).map((s, i) => (
          <SiteCard
            key={s?.name || i}
            site={s}
            onClick={() => setUrl(s.homepage)}
          />
        ))}
      </div>

      {seriesList.length > 0 && (
        <div className="mt-4">
          <h3 className="text-white mb-2">Select a series:</h3>
          <ul className="list-disc pl-5 text-white space-y-1">
            {seriesList.map(s => (
              <li key={s.url}>
                <button
                  className="underline hover:text-blue-300"
                  onClick={() => pickSeries(s)}
                  disabled={loadingChapters}
                >
                  {s.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showModal && (
        <ChapterModal
          chapters={chapters}
          onClose={() => setShowModal(false)}
          onDownload={handleDownload}
          loading={loadingChapters}
          downloading={downloading}
          progress={downloadProgress}
        />
      )}
    </div>
  );
}
