// src/components/ChapterModal.jsx
import { useState, useEffect } from 'react';

export default function ChapterModal({
  chapters,
  onClose,
  onDownload,
  loading = false,
  downloading = false,
  progress = 0
}) {
  const [sel, setSel] = useState([]);

  useEffect(() => {
    // reset selection whenever chapters change
    setSel([]);
  }, [chapters]);

  function toggle(ch) {
    setSel(s => 
      s.includes(ch) 
        ? s.filter(x => x !== ch) 
        : [...s, ch]
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg w-96 max-w-full">
        <h3 className="text-lg text-white mb-4">Select Chapters</h3>

        <div className="max-h-64 overflow-y-auto mb-4">
          {loading ? (
            <div className="text-center text-white py-8">
              Loading chapters…
            </div>
          ) : chapters.length === 0 ? (
            <div className="text-center text-white py-8">
              No chapters found.
            </div>
          ) : (
            chapters.map(c => (
              <label
                key={c.url}
                className="flex items-center mb-2 hover:bg-gray-700 p-2 rounded"
              >
                <input
                  type="checkbox"
                  className="mr-2"
                  onChange={() => toggle(c)}
                  checked={sel.includes(c)}
                  disabled={downloading}
                />
                <span className="text-white">{c.title}</span>
              </label>
            ))
          )}
        </div>

        {downloading && (
          <div className="mb-4">
            <div className="text-white mb-1">Downloading… {progress}%</div>
            <div className="w-full bg-gray-700 h-2 rounded">
              <div
                className="bg-blue-500 h-2 rounded"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            disabled={downloading}
            className="px-4 py-2 rounded hover:bg-gray-700 text-white"
          >
            Cancel
          </button>
          <button
            onClick={() => onDownload(sel)}
            disabled={sel.length === 0 || downloading || loading}
            className={`px-4 py-2 rounded text-white ${
              sel.length === 0 || downloading || loading
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            Download
          </button>
        </div>
      </div>
    </div>
  );
}
