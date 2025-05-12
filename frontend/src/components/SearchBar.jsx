// components/SearchBar.jsx
import { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import axios from 'axios';
import ChapterModal from './ChapterModal';
import { Search, Book, Loader, X, ArrowRight, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SearchBar = forwardRef(({ onDownloaded }, ref) => {
  const [url, setUrl] = useState('');
  const [seriesList, setSeriesList] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [activeSeries, setActiveSeries] = useState(null);
  const [loadingSeries, setLoadingSeries] = useState(false);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);

  // Expose functions to parent component through ref
  useImperativeHandle(ref, () => ({
    setAndSearch: (siteUrl) => {
      setUrl(siteUrl);
      setTimeout(() => fetchSeries(siteUrl), 100); // Small timeout to ensure state updates
    }
  }));

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

  async function fetchSeries(manualUrl) {
    const trimmed = manualUrl || url.trim();
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
    <div className="w-full max-w-4xl mx-auto my-8">
      <motion.div 
        className="relative"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
      >
        <div className={`relative flex items-center bg-black/20 backdrop-blur-md rounded-2xl overflow-hidden transition-all duration-300 ${isFocused ? 'ring-2 ring-purple-500 shadow-lg shadow-purple-500/20' : 'shadow-md'}`}>
          <Search className="ml-4 text-purple-400" size={22} />
          
          <input
            ref={inputRef}
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Enter manga URL..."
            className="w-full bg-transparent px-4 py-5 text-white placeholder-purple-300/50 focus:outline-none"
          />
          
          <AnimatePresence>
            {url && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="p-2 mr-1 text-purple-300 hover:text-white transition-colors"
                onClick={() => setUrl('')}
              >
                <X size={18} />
              </motion.button>
            )}
          </AnimatePresence>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 px-6 py-4 rounded-r-2xl text-white font-medium flex items-center transition-all duration-300"
            onClick={() => fetchSeries()}
            disabled={loadingSeries}
          >
            {loadingSeries ? (
              <Loader size={20} className="animate-spin" />
            ) : (
              <>
                <span>Search</span>
                <ArrowRight size={16} className="ml-2" />
              </>
            )}
          </motion.button>
        </div>
        
        {/* Glowing particles on focus */}
        <AnimatePresence>
          {isFocused && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-10 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full blur-sm"
              />
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.1 }}
                className="absolute -right-1 top-1/3 w-2 h-2 bg-purple-400 rounded-full blur-sm"
              />
            </>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Search Results */}
      <AnimatePresence>
        {seriesList.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: 20, height: 0 }}
            className="mt-4 bg-black/30 backdrop-blur-md rounded-2xl overflow-hidden shadow-xl"
          >
            <div className="p-4">
              <div className="flex items-center mb-3">
                <Book size={18} className="text-purple-400 mr-2" />
                <h3 className="text-lg font-semibold text-white">Available Manga</h3>
                <div className="ml-2 px-2 py-0.5 bg-purple-500/20 rounded-full text-xs text-purple-200">
                  {seriesList.length} found
                </div>
              </div>
              
              <div className="grid gap-3">
                {seriesList.map((series, idx) => (
                  <motion.div
                    key={series.url}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-black/20 rounded-xl p-3 hover:bg-black/40 transition-colors group cursor-pointer"
                    onClick={() => pickSeries(series)}
                  >
                    <div className="flex items-start">
                      {series.cover ? (
                        <img 
                          src={series.cover} 
                          alt={series.title} 
                          className="w-16 h-20 object-cover rounded-md shadow-md"
                        />
                      ) : (
                        <div className="w-16 h-20 bg-gray-800 rounded-md flex items-center justify-center">
                          <Book size={20} className="text-gray-600" />
                        </div>
                      )}
                      
                      <div className="ml-3 flex-1">
                        <p className="font-semibold text-white group-hover:text-purple-300 transition-colors flex items-center">
                          {series.title}
                          <Sparkles size={16} className="ml-2 text-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </p>
                        <p className="text-sm text-gray-400 mt-1 line-clamp-2">{series.description || 'No description available'}</p>
                      </div>
                      
                      <motion.div 
                        className="text-purple-400 group-hover:text-white"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <ArrowRight size={20} />
                      </motion.div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chapter Modal */}
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
});

export default SearchBar;
