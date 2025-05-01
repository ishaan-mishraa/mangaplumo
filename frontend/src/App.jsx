import { useState, useEffect } from 'react';
import axios from 'axios';
import Header from './components/Header';
import SearchBar from './components/SearchBar';
import SiteCard from './components/SiteCard';
import RecentGrid from './components/RecentGrid';

export default function App() {
  const [sites, setSites] = useState([]);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL}/series`, payload)
      .then(r => setSites(r.data))
      .catch(console.error);
    // load recent from localStorage
    setRecent(JSON.parse(localStorage.getItem('recent')||'[]'));
  }, []);

  function onDownloaded(item) {
    setRecent(r=>{ const nr = [item,...r].slice(0,6); localStorage.setItem('recent',JSON.stringify(nr)); return nr; });
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />
      <main className="p-4 max-w-5xl mx-auto">
        <SearchBar sites={sites} onDownloaded={onDownloaded}/>
        <SiteCard/>
        <h2 className="mt-8 text-xl">Recently downloaded</h2>
        <RecentGrid items={recent}/>
      </main>
    </div>
  );
}
