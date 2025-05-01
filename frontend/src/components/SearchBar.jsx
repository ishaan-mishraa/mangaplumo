// src/components/SearchBar.jsx

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

  // Unified function to fetch & show chapters for a given series or direct chapter
  async function pickSeries(s) {
    setActiveSeries(s);
    try {
      const res = await axios.post(
        'https://mangaplumo.onrender.com/api/manga/chapters',
        { seriesUrl: s.url }
      );
      setChapters(res.data);
      setShowModal(true);
    } catch (err) {
      console.error('Error fetching chapters:', err);
      alert('Failed to fetch chapters. Check the URL or server.');
    }
  }

  // Called when user clicks "Fetch Series"
  async function fetchSeries() {
    if (!url.trim()) {
      return alert('Please enter a URL.');
    }

    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      return alert('Please enter a valid URL (must start with http:// or https://).');
    }

    // Count non-empty path segments
    const segments = parsed.pathname.split('/').filter(Boolean);

    if (segments.length === 0) {
      // === Site root: list all series
      try {
        const res = await axios.post(
          'https://mangaplumo.onrender.com/api/manga/series',
          { siteUrl: url }
        );
        setSeriesList(res.data);
      } catch (err) {
        console.error('Error fetching series:', err);
        alert(err.response?.data?.error || 'Failed to fetch series.');
      }
    } else {
      // === Series or Chapter URL: go straight to pickSeries
      // You could further distinguish series vs chapter by segments.length,
      // but both use /chapters to get the list anyway.
      await pickSeries({ title: parsed.pathname.split('/').pop(), url });
    }
  }

  // Download handler unchanged
  async function handleDownload(selectedChapters) {
    try {
      const resp = await axios.post(
        'https://mangaplumo.onrender.com/api/manga/download',
        {
          seriesUrl: activeSeries.url,
          chapters: selectedChapters
        },
        { responseType: 'blob' }
      );

      const cd = resp.headers['content-disposition'] || '';
      const match = cd.match(/filename="(.+)"/);
      const filename = match ? match[1] : 'download';

      const blob = new Blob([resp.data], { type: resp.data.type || 'application/octet-stream' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);

      onDownloaded(activeSeries);
      setShowModal(false);
    } catch (err) {
      console.error('Download failed:', err);
      alert('Failed to download file. Check console for details.');
    }
  }

  return (
    <div className="mt-6">
      {/* URL input */}
      <div className="flex">
        <input
          className="flex-grow p-3 rounded-l-lg bg-gray-700 text-white"
          placeholder="Paste manga site or series URL here"
          value={url}
          onChange={e => setUrl(e.target.value)}
        />
        <button
          className="bg-blue-600 px-6 rounded-r-lg text-white"
          onClick={fetchSeries}
        >
          Fetch Series
        </button>
      </div>

      {/* Quick site buttons */}
      <div className="grid grid-cols-4 gap-4 mt-6">
        {sites.map(s => (
          <SiteCard
            key={s.name}
            site={s}
            onClick={() => setUrl(s.homepage)}
          />
        ))}
      </div>

      {/* Series list (only if root URL was fetched) */}
      {seriesList.length > 0 && (
        <div className="mt-4">
          <h3 className="text-white mb-2">Select a series:</h3>
          <ul className="list-disc pl-5 text-white">
            {seriesList.map(s => (
              <li key={s.url}>
                <button
                  className="underline hover:text-blue-300"
                  onClick={() => pickSeries(s)}
                >
                  {s.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Chapter selection modal */}
      {showModal && (
        <ChapterModal
          chapters={chapters}
          onClose={() => setShowModal(false)}
          onDownload={handleDownload}
        />
      )}
    </div>
  );
}
