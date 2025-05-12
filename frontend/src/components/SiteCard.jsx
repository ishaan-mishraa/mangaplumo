// components/SiteCard.jsx
import { motion } from 'framer-motion';
import { ExternalLink, Star } from 'lucide-react';

export default function SiteCard({ site, onSiteSelect }) {
  if (!site) return null; // Handle undefined site

  // Function to handle clicking on a site card
  const handleClick = () => {
    if (onSiteSelect && site.url) {
      onSiteSelect(site.url);
    }
  };

  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      className="bg-black/30 backdrop-blur-md rounded-2xl p-4 shadow-lg overflow-hidden group cursor-pointer relative anime-card"
      onClick={handleClick}
    >
      {/* Animated star particles */}
      <div className="absolute top-0 right-0 w-12 h-12 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <Star className="absolute top-3 right-3 text-yellow-300 w-3 h-3 animate-pulse" />
        <Star className="absolute top-6 right-6 text-purple-300 w-2 h-2 animate-pulse" style={{animationDelay: '0.3s'}} />
        <Star className="absolute top-2 right-8 text-pink-300 w-2 h-2 animate-pulse" style={{animationDelay: '0.6s'}} />
      </div>

      <div className="flex flex-col h-full">
        <div className="mb-3 flex items-center">
          {site.icon ? (
            <img src={site.icon} alt={site.name} className="w-8 h-8 rounded-full mr-2" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 mr-2 flex items-center justify-center">
              {site.name.charAt(0)}
            </div>
          )}
          <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors">
            {site.name}
          </h3>
        </div>

        <p className="text-sm text-gray-300 mb-3 line-clamp-2">{site.description || "Manga download source"}</p>

        <div className="mt-auto flex items-center text-sm text-purple-300">
          <ExternalLink size={14} className="mr-1" />
          <span className="truncate">{site.url}</span>
        </div>
      </div>
    </motion.div>
  );
}
