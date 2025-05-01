export default function SiteCard({ site, onClick }) {
    if (!site) return null; // Handle undefined site
    return (
      <div
        className="bg-gray-800 p-4 rounded-lg cursor-pointer hover:bg-gray-700"
        onClick={onClick}
      >
        <div className="font-semibold">{site.name || 'Unknown Site'}</div>
      </div>
    );
  }
  