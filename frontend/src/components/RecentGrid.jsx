export default function RecentGrid({ recent }) {
  // More robust safety checks
  if (!recent || !Array.isArray(recent)) return null;
  
  return (
    <div className="grid grid-cols-3 gap-4 mt-4">
      {recent.map((it, i) => (
        <div key={i} className="bg-gray-800 p-4 rounded-lg">
          <div className="h-40 bg-gray-700 flex items-center justify-center">
            <span className="text-sm">{it?.name || 'Cover'}</span>
          </div>
          <div className="mt-2">{it?.name || 'Unnamed'}</div>
        </div>
      ))}
    </div>
  );
}
