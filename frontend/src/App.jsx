// App.jsx
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Header from './components/Header';
import SearchBar from './components/SearchBar';
import SiteCard from './components/SiteCard';
import RecentGrid from './components/RecentGrid';
import StarsBackground from './components/StarsBackground';

export default function App() {
  const [sites, setSites] = useState([]);
  const [recent, setRecent] = useState([]);
  const searchBarRef = useRef(null);

  useEffect(() => {
    axios.get('https://mangaplumo.onrender.com/api/manga/sites')
      .then(r => setSites(r.data))
      .catch(console.error);

    // Load recent from localStorage
    setRecent(JSON.parse(localStorage.getItem('recent') || '[]'));
  }, []);

  function onDownloaded(item) {
    setRecent(r => {
      const nr = [item, ...r].slice(0, 6);
      localStorage.setItem('recent', JSON.stringify(nr));
      return nr;
    });
  }

  // Function to handle site selection from SiteCard
  const handleSiteSelect = (siteUrl) => {
    if (searchBarRef.current) {
      searchBarRef.current.setAndSearch(siteUrl);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <StarsBackground />
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        <Header />
        <SearchBar ref={searchBarRef} onDownloaded={onDownloaded} />
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 my-12">
          {sites.map(site => (
            <SiteCard 
              key={site.name} 
              site={site}
              onSiteSelect={handleSiteSelect}
            />
          ))}
        </div>

        {recent.length > 0 && (
          <div className="bg-black/30 backdrop-blur-lg rounded-2xl p-6 shadow-xl">
            <h2 className="text-2xl font-bold mb-6 text-purple-400 glow-text">
              Recently downloaded
            </h2>
            <RecentGrid recent={recent} />
          </div>
        )}
      </div>
    </div>
  );
}
