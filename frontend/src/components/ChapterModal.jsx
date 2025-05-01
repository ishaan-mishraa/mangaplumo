import { useState } from 'react';

export default function ChapterModal({ chapters, onClose, onDownload }) {
  const [sel, setSel] = useState([]);

  function toggle(ch) {
    setSel(s => s.includes(ch) ? s.filter(x=>x!==ch) : [...s, ch]);
  }

return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
        <div className="bg-gray-800 p-6 rounded-lg w-96">
            <h3 className="text-lg mb-4">Select Chapters</h3>
            <div className="max-h-64 overflow-y-auto">
                {chapters.map(c => (
                    <label
                        key={c.url}
                        className="flex items-center mb-2 hover:bg-gray-700 p-2 rounded"
                    >
                        <input
                            type="checkbox"
                            className="mr-2"
                            onChange={() => toggle(c)}
                            checked={sel.includes(c)}
                        />
                        {c.title}
                    </label>
                ))}
            </div>
            <div className="mt-4 flex justify-end space-x-2">
                <button
                    className="hover:bg-gray-700 px-4 py-2 rounded"
                    onClick={onClose}
                >
                    Cancel
                </button>
                <button
                    className="bg-blue-600 hover:bg-blue-700 cursor-pointer px-4 py-2 rounded"
                    onClick={() => onDownload(sel)}
                    disabled={!sel.length}
                >
                    Download
                </button>
            </div>
        </div>
    </div>
);
}
