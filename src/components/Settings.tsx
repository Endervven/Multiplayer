import React, { useState } from 'react';
import { User } from '../App';

interface SettingsProps {
  user: User;
  onUpdate: (displayName: string) => void;
  onBack: () => void;
}

export default function Settings({ user, onUpdate, onBack }: SettingsProps) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [message, setMessage] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings/name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username, displayName }),
      });
      if (res.ok) {
        setMessage('Display name updated successfully!');
        onUpdate(displayName);
      } else {
        setMessage('Failed to update display name.');
      }
    } catch (err) {
      setMessage('Network error.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-white p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-800">
        <h1 className="text-3xl font-bold text-center text-indigo-400">Settings</h1>
        
        {message && (
          <div className={`p-3 text-sm rounded-lg ${message.includes('successfully') ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-2 mt-1 bg-zinc-950 border border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-zinc-900 transition-colors"
          >
            Save Changes
          </button>
        </form>

        <button
          onClick={onBack}
          className="w-full py-2 font-medium text-zinc-300 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
        >
          Back to Menu
        </button>
      </div>
    </div>
  );
}
