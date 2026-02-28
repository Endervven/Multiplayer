import React from 'react';
import { User } from '../App';

interface MainMenuProps {
  user: User;
  onJoin: (roomId: string) => void;
  onSettings: () => void;
  onAdmin: () => void;
  onLogout: () => void;
  onLevelEditor: () => void;
  onMapStore: () => void;
}

export default function MainMenu({ user, onJoin, onSettings, onAdmin, onLogout, onLevelEditor, onMapStore }: MainMenuProps) {
  const servers = [
    { id: 'forest', name: 'Forest Ruins', desc: 'A lush, overgrown area with standard physics.' },
    { id: 'ice', name: 'Ice Caverns', desc: 'Slippery platforms and cold environments.' },
    { id: 'lava', name: 'Lava Core', desc: 'Dangerous jumps over a fiery pit.' },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-white p-4">
      <div className="w-full max-w-4xl space-y-8">
        <div className="flex justify-between items-center bg-zinc-900 p-6 rounded-2xl border border-zinc-800 shadow-xl">
          <div>
            <h1 className="text-3xl font-bold text-indigo-400">Main Menu</h1>
            <p className="text-zinc-400 mt-1">Welcome back, <span className="text-white font-semibold">{user.displayName}</span></p>
          </div>
          <div className="flex gap-3">
            {user.isAdmin && (
              <button onClick={onAdmin} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 rounded-lg text-sm font-medium transition-colors">
                Admin Panel
              </button>
            )}
            <button onClick={onSettings} className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm font-medium transition-colors">
              Settings
            </button>
            <button onClick={onLogout} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm font-medium transition-colors">
              Logout
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col items-center text-center">
            <h2 className="text-2xl font-bold text-emerald-400 mb-2">Level Editor</h2>
            <p className="text-zinc-400 mb-6 flex-grow">Create your own custom maps, place platforms, coins, and hazards, and publish them for others to play!</p>
            <button onClick={onLevelEditor} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold transition-colors">Open Editor</button>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col items-center text-center">
            <h2 className="text-2xl font-bold text-amber-400 mb-2">Community Maps</h2>
            <p className="text-zinc-400 mb-6 flex-grow">Browse and play custom maps created by other players in the community.</p>
            <button onClick={onMapStore} className="w-full py-3 bg-amber-600 hover:bg-amber-700 rounded-xl font-bold transition-colors">Browse Maps</button>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4 text-zinc-300">Official Servers</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {servers.map(s => (
              <div key={s.id} className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl hover:border-indigo-500 transition-colors flex flex-col">
                <h3 className="text-lg font-bold text-white mb-2">{s.name}</h3>
                <p className="text-sm text-zinc-400 flex-grow mb-6">{s.desc}</p>
                <button
                  onClick={() => onJoin(s.id)}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Join Server
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
