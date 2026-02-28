import React, { useEffect, useState } from 'react';
import { User } from '../App';

interface MapStoreProps {
  user: User;
  onJoin: (roomId: string) => void;
  onBack: () => void;
}

export default function MapStore({ user, onJoin, onBack }: MapStoreProps) {
  const [maps, setMaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/maps')
      .then(res => res.json())
      .then(data => {
        setMaps(data.maps);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col items-center min-h-screen bg-zinc-950 text-white p-4">
      <div className="w-full max-w-4xl p-8 space-y-6 bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-800">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-indigo-400">Community Maps</h1>
          <button
            onClick={onBack}
            className="px-4 py-2 font-medium text-zinc-300 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
          >
            Back to Menu
          </button>
        </div>

        {loading ? (
          <div className="text-center text-zinc-500 py-10">Loading maps...</div>
        ) : maps.length === 0 ? (
          <div className="text-center text-zinc-500 py-10">No custom maps published yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {maps.map(m => (
              <div key={m.id} className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl hover:border-indigo-500 transition-colors flex flex-col">
                <h3 className="text-xl font-bold text-white mb-1">{m.name}</h3>
                <p className="text-xs text-indigo-400 mb-3">By {m.author} • {new Date(m.created_at).toLocaleDateString()}</p>
                <p className="text-sm text-zinc-400 flex-grow mb-6">{m.description || 'No description provided.'}</p>
                <button
                  onClick={() => onJoin(`custom_${m.id}`)}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Play Map
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
