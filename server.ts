import express from 'express';
import { createServer as createViteServer } from 'vite';
import { Server } from 'socket.io';
import http from 'http';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { Game } from './src/server/game';

const db = new Database('game_v2.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    username TEXT UNIQUE,
    display_name TEXT,
    password TEXT,
    is_admin BOOLEAN DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS maps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    author TEXT,
    name TEXT,
    description TEXT,
    data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: '*' } });
  const PORT = 3000;

  app.use(express.json());

  app.post('/api/register', (req, res) => {
    const { email, username, password } = req.body;
    if (!email || !username || !password) return res.status(400).json({ error: 'Missing fields' });
    try {
      const hash = bcrypt.hashSync(password, 10);
      const isAdmin = email === 'endervven@gmail.com' ? 1 : 0;
      const stmt = db.prepare('INSERT INTO users (email, username, display_name, password, is_admin) VALUES (?, ?, ?, ?, ?)');
      stmt.run(email, username, username, hash, isAdmin);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: 'Email or Username already taken' });
    }
  });

  app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    const user = stmt.get(username) as any;
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    res.json({ 
      success: true, 
      user: { 
        username: user.username, 
        email: user.email, 
        displayName: user.display_name, 
        isAdmin: !!user.is_admin 
      } 
    });
  });

  app.post('/api/settings/name', (req, res) => {
    const { username, displayName } = req.body;
    const stmt = db.prepare('UPDATE users SET display_name = ? WHERE username = ?');
    stmt.run(displayName, username);
    res.json({ success: true });
  });

  // Map Store Endpoints
  app.post('/api/maps', (req, res) => {
    const { author, name, description, data } = req.body;
    try {
      const stmt = db.prepare('INSERT INTO maps (author, name, description, data) VALUES (?, ?, ?, ?)');
      stmt.run(author, name, description, JSON.stringify(data));
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Failed to save map' });
    }
  });

  app.get('/api/maps', (req, res) => {
    const maps = db.prepare('SELECT id, author, name, description, created_at FROM maps ORDER BY created_at DESC').all();
    res.json({ maps });
  });

  app.get('/api/maps/:id', (req, res) => {
    const map = db.prepare('SELECT * FROM maps WHERE id = ?').get(req.params.id);
    if (map) res.json({ map });
    else res.status(404).json({ error: 'Map not found' });
  });

  // Admin Endpoints
  app.get('/api/admin/users', (req, res) => {
    const { email } = req.query;
    if (email !== 'endervven@gmail.com') return res.status(403).json({ error: 'Unauthorized' });
    const users = db.prepare('SELECT id, email, username, display_name, is_admin FROM users').all();
    res.json({ users });
  });

  app.delete('/api/admin/users/:id', (req, res) => {
    const { email } = req.query;
    if (email !== 'endervven@gmail.com') return res.status(403).json({ error: 'Unauthorized' });
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  app.delete('/api/admin/maps/:id', (req, res) => {
    const { email } = req.query;
    if (email !== 'endervven@gmail.com') return res.status(403).json({ error: 'Unauthorized' });
    db.prepare('DELETE FROM maps WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  }

  const games = new Map<string, Game>();
  games.set('forest', new Game(io, 'forest', 'Forest Ruins'));
  games.set('ice', new Game(io, 'ice', 'Ice Caverns'));
  games.set('lava', new Game(io, 'lava', 'Lava Core'));

  io.on('connection', (socket) => {
    let currentRoom = '';

    socket.on('join', ({ roomId, displayName }) => {
      if (currentRoom) {
        socket.leave(currentRoom);
        games.get(currentRoom)?.removePlayer(socket.id);
      }
      currentRoom = roomId;
      socket.join(roomId);

      // Create custom game room if it doesn't exist
      if (roomId.startsWith('custom_') && !games.has(roomId)) {
        const mapId = roomId.split('_')[1];
        const mapData = db.prepare('SELECT * FROM maps WHERE id = ?').get(mapId) as any;
        if (mapData) {
          const parsedData = JSON.parse(mapData.data);
          games.set(roomId, new Game(io, roomId, mapData.name, parsedData));
        } else {
          games.set(roomId, new Game(io, roomId, 'Unknown Custom Map'));
        }
      }

      games.get(roomId)?.addPlayer(socket.id, displayName);
    });

    socket.on('input', (inputs) => {
      if (currentRoom) games.get(currentRoom)?.handleInput(socket.id, inputs);
    });

    socket.on('chatMessage', (text: string) => {
      if (!currentRoom || typeof text !== 'string' || text.trim().length === 0) return;
      let cleanText = text.substring(0, 100).replace(/(fuck|shit|bitch|asshole)/gi, '***');
      const player = games.get(currentRoom)?.players.get(socket.id);
      io.to(currentRoom).emit('chatMessage', {
        id: Math.random().toString(36).substring(2, 9),
        sender: player ? player.name : 'Unknown',
        text: cleanText,
        timestamp: Date.now()
      });
    });

    socket.on('disconnect', () => {
      if (currentRoom) {
        const game = games.get(currentRoom);
        if (game) {
          game.removePlayer(socket.id);
          // Cleanup empty custom rooms
          if (currentRoom.startsWith('custom_') && game.players.size === 0) {
            game.destroy();
            games.delete(currentRoom);
          }
        }
      }
    });
  });

  server.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
}
startServer();
