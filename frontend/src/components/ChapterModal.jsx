import React from 'react';

export default function ChapterModal({ chapters, onClose, onDownload, loading, downloading, progress }) {
  const [sel, setSel] = React.useState([]);
  const toggle = (ch) => setSel(s => s.includes(ch) ? s.filter(x => x !== ch) : [...s, ch]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-gray-800 p-6 rounded-lg w-96">
        <h3 className="text-lg mb-4">Select Chapters</h3>
        {loading ? (
          <div className="text-center text-white">Loading chapters...</div>
        ) : (
        <div className="max-h-64 overflow-y-auto">
          {chapters.map(c => (
            <label key={c.url} className="flex items-center mb-2 text-white">
              <input
                type="checkbox"
                className="mr-2"
                onChange={() => toggle(c)}
                disabled={downloading}
                checked={sel.includes(c)}
              />
              {c.title}
            </label>
          ))}
        </div>
        )}
        {downloading && (
          <div className="mt-4">
            <div className="w-full bg-gray-600 rounded h-2 mb-2">
              <div className="bg-blue-500 h-2 rounded" style={{ width: `${progress}%` }} />
            </div>
            <div className="text-center text-white">Downloading... {progress}%</div>
          </div>
        )}
        <div className="mt-4 flex justify-end space-x-2">
          <button onClick={onClose} disabled={downloading}>Cancel</button>
          <button
            className="bg-blue-600 px-4 rounded text-white"
            onClick={() => onDownload(sel)}
            disabled={!sel.length || downloading}
          >
            {downloading ? 'Processing...' : 'Download'}
          </button>
        </div>
      </div>
    </div>
  );
}
