import { useState } from 'react';

export default function ChapterModal({ chapters, onClose, onDownload, loading, downloading, progress }) {
  const [sel, setSel] = useState([]);

  function toggle(ch) {
    setSel(s => s.includes(ch) ? s.filter(x => x !== ch) : [...s, ch]);
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-gray-800 p-6 rounded-lg w-96">
        <h3 className="text-lg mb-4 text-white">Select Chapters</h3>
        <div className="max-h-64 overflow-y-auto">
          {loading ? (
            <div className="text-center text-white py-4">Loading chapters...</div>
          ) : chapters && chapters.length > 0 ? (
            chapters.map(c => (
              <label
                key={c.url}
                className="flex items-center mb-2 hover:bg-gray-700 p-2 rounded text-white"
              >
                <input
                  type="checkbox"
                  className="mr-2"
                  onChange={() => toggle(c)}
                  checked={sel.includes(c)}
                  disabled={downloading}
                />
                {c.title}
              </label>
            ))
          ) : (
            <div className="text-center text-white py-4">No chapters found.</div>
          )}
        </div>
        {downloading && (
          <div className="mt-4">
            <div className="w-full bg-gray-600 rounded h-2 mb-2">
              <div className="bg-blue-500 h-2 rounded" style={{ width: `${progress}%` }} />
            </div>
            <div className="text-center text-white">Downloading... {progress}%</div>
          </div>
        )}
        <div className="mt-4 flex justify-end space-x-2">
          <button
            onClick={onClose}
            disabled={downloading}
            className="hover:bg-gray-700 px-4 py-2 rounded text-white"
          >
            Cancel
          </button>
          <button
            className="bg-blue-600 hover:bg-blue-700 cursor-pointer px-4 py-2 rounded text-white"
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
