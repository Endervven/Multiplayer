import React, { useState } from 'react';
import Login from './components/Login';
import MainMenu from './components/MainMenu';
import GameClient from './components/GameClient';
import Settings from './components/Settings';
import AdminPanel from './components/AdminPanel';
import LevelEditor from './components/LevelEditor';
import MapStore from './components/MapStore';

export interface User {
  username: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [screen, setScreen] = useState<'login' | 'menu' | 'game' | 'settings' | 'admin' | 'editor' | 'store'>('login');
  const [roomId, setRoomId] = useState<string>('');

  if (!user) {
    return <Login onLogin={(u) => { setUser(u); setScreen('menu'); }} />;
  }

  switch (screen) {
    case 'menu':
      return (
        <MainMenu 
          user={user} 
          onJoin={(room) => { setRoomId(room); setScreen('game'); }} 
          onSettings={() => setScreen('settings')} 
          onAdmin={() => setScreen('admin')} 
          onLogout={() => { setUser(null); setScreen('login'); }} 
          onLevelEditor={() => setScreen('editor')}
          onMapStore={() => setScreen('store')}
        />
      );
    case 'settings':
      return (
        <Settings 
          user={user} 
          onUpdate={(name) => setUser({ ...user, displayName: name })} 
          onBack={() => setScreen('menu')} 
        />
      );
    case 'admin':
      return <AdminPanel user={user} onBack={() => setScreen('menu')} />;
    case 'editor':
      return <LevelEditor user={user} onBack={() => setScreen('menu')} />;
    case 'store':
      return <MapStore user={user} onJoin={(room) => { setRoomId(room); setScreen('game'); }} onBack={() => setScreen('menu')} />;
    case 'game':
      return (
        <GameClient 
          roomId={roomId} 
          displayName={user.displayName} 
          onLeave={() => setScreen('menu')} 
        />
      );
    default:
      return <Login onLogin={(u) => { setUser(u); setScreen('menu'); }} />;
  }
}
