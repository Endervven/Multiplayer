import React, { useEffect, useState } from 'react';
import { User } from '../App';

interface AdminPanelProps {
  user: User;
  onBack: () => void;
}

export default function AdminPanel({ user, onBack }: AdminPanelProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [maps, setMaps] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'users' | 'maps'>('users');

  const fetchUsers = async () => {
    try {
      const res = await fetch(`/api/admin/users?email=${encodeURIComponent(user.email)}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      } else {
        setError('Unauthorized or failed to fetch users.');
      }
    } catch (err) {
      setError('Network error.');
    }
  };

  const fetchMaps = async () => {
    try {
      const res = await fetch('/api/maps');
      if (res.ok) {
        const data = await res.json();
        setMaps(data.maps);
      }
    } catch (err) {
      setError('Network error fetching maps.');
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchMaps();
  }, [user.email]);

  const handleDeleteUser = async (id: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await fetch(`/api/admin/users/${id}?email=${encodeURIComponent(user.email)}`, { method: 'DELETE' });
      if (res.ok) fetchUsers();
    } catch (e) {}
  };

  const handleDeleteMap = async (id: number) => {
    if (!confirm('Are you sure you want to delete this map?')) return;
    try {
      const res = await fetch(`/api/admin/maps/${id}?email=${encodeURIComponent(user.email)}`, { method: 'DELETE' });
      if (res.ok) fetchMaps();
    } catch (e) {}
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-white p-4">
      <div className="w-full max-w-5xl p-8 space-y-6 bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-800">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-rose-500">Admin Panel</h1>
          <button
            onClick={onBack}
            className="px-4 py-2 font-medium text-zinc-300 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
          >
            Back to Menu
          </button>
        </div>
        
        {error && (
          <div className="p-3 text-sm rounded-lg bg-red-500/20 text-red-400">
            {error}
          </div>
        )}

        <div className="flex gap-4 border-b border-zinc-800 pb-2">
          <button 
            onClick={() => setTab('users')} 
            className={`px-4 py-2 font-bold rounded-lg ${tab === 'users' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Users
          </button>
          <button 
            onClick={() => setTab('maps')} 
            className={`px-4 py-2 font-bold rounded-lg ${tab === 'maps' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Maps
          </button>
        </div>

        <div className="overflow-x-auto">
          {tab === 'users' && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-700 text-zinc-400">
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Username</th>
                  <th className="py-3 px-4">Display Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Admin</th>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                    <td className="py-3 px-4">{u.id}</td>
                    <td className="py-3 px-4 font-mono text-indigo-300">{u.username}</td>
                    <td className="py-3 px-4">{u.display_name}</td>
                    <td className="py-3 px-4 text-zinc-400">{u.email}</td>
                    <td className="py-3 px-4">
                      {u.is_admin ? (
                        <span className="px-2 py-1 text-xs font-semibold bg-rose-500/20 text-rose-400 rounded-full">Admin</span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-semibold bg-zinc-700 text-zinc-300 rounded-full">User</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {!u.is_admin && (
                        <button onClick={() => handleDeleteUser(u.id)} className="text-rose-500 hover:text-rose-400 font-bold text-sm">Delete</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'maps' && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-700 text-zinc-400">
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Author</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {maps.map(m => (
                  <tr key={m.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                    <td className="py-3 px-4">{m.id}</td>
                    <td className="py-3 px-4 font-bold text-indigo-300">{m.name}</td>
                    <td className="py-3 px-4">{m.author}</td>
                    <td className="py-3 px-4 text-zinc-400">{new Date(m.created_at).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      <button onClick={() => handleDeleteMap(m.id)} className="text-rose-500 hover:text-rose-400 font-bold text-sm">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
