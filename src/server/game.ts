import { Server } from 'socket.io';

export interface Player {
  id: string; name: string; x: number; y: number; vx: number; vy: number;
  width: number; height: number; color: string; isGrounded: boolean;
  inputs: { left: boolean; right: boolean; jump: boolean };
  isBot: boolean; botTimer: number; botDirection: number;
  trail: {x: number, y: number}[];
  score: number;
}

export interface Platform { x: number; y: number; width: number; height: number; type?: string; }
export interface Coin { id: string; x: number; y: number; collected: boolean; }
export interface Hazard { x: number; y: number; width: number; height: number; speedX: number; speedY: number; }

const GRAVITY = 0.6; const JUMP_FORCE = -12; const MAX_FALL_SPEED = 15;
const MAP_WIDTH = 1200; const MAP_HEIGHT = 800;

export class Game {
  players: Map<string, Player> = new Map();
  platforms: Platform[] = [];
  coins: Coin[] = [];
  hazards: Hazard[] = [];
  io: Server; roomId: string; themeName: string; minPlayers = 4;
  interval: NodeJS.Timeout;

  constructor(io: Server, roomId: string, themeName: string, customData?: any) {
    this.io = io; this.roomId = roomId; this.themeName = themeName;
    if (customData) {
      this.platforms = customData.platforms || [];
      this.coins = customData.coins || [];
      this.hazards = customData.hazards || [];
    } else {
      this.setupLevel();
    }
    this.interval = setInterval(() => this.tick(), 1000 / 60);
  }

  destroy() {
    clearInterval(this.interval);
  }

  setupLevel() {
    this.platforms.push({ x: 0, y: MAP_HEIGHT - 40, width: MAP_WIDTH, height: 40 });
    if (this.roomId === 'forest') {
      this.platforms.push({ x: 200, y: 600, width: 200, height: 20 });
      this.platforms.push({ x: 500, y: 450, width: 150, height: 20 });
      this.platforms.push({ x: 800, y: 300, width: 200, height: 20 });
      this.platforms.push({ x: 100, y: 200, width: 150, height: 20 });
      this.coins.push({ id: 'c1', x: 250, y: 550, collected: false });
      this.coins.push({ id: 'c2', x: 550, y: 400, collected: false });
      this.hazards.push({ x: 400, y: 700, width: 40, height: 40, speedX: 2, speedY: 0 });
    } else if (this.roomId === 'ice') {
      this.platforms.push({ x: 100, y: 650, width: 300, height: 20, type: 'ice' });
      this.platforms.push({ x: 600, y: 500, width: 300, height: 20, type: 'ice' });
      this.platforms.push({ x: 200, y: 350, width: 200, height: 20, type: 'ice' });
      this.platforms.push({ x: 700, y: 200, width: 200, height: 20, type: 'ice' });
      this.coins.push({ id: 'c1', x: 750, y: 150, collected: false });
    } else if (this.roomId === 'lava') {
      this.platforms.push({ x: 300, y: 600, width: 100, height: 20 });
      this.platforms.push({ x: 500, y: 500, width: 100, height: 20 });
      this.platforms.push({ x: 700, y: 400, width: 100, height: 20 });
      this.platforms.push({ x: 500, y: 250, width: 100, height: 20 });
      this.hazards.push({ x: 500, y: 700, width: 30, height: 30, speedX: 0, speedY: -3 });
    }
  }

  addPlayer(id: string, name: string) {
    this.players.set(id, {
      id, name, x: Math.random() * (MAP_WIDTH - 100) + 50, y: 100, vx: 0, vy: 0,
      width: 30, height: 30, color: `hsl(${Math.random() * 360}, 80%, 60%)`,
      isGrounded: false, inputs: { left: false, right: false, jump: false },
      isBot: false, botTimer: 0, botDirection: 0, trail: [], score: 0
    });
    this.manageBots();
  }

  removePlayer(id: string) {
    this.players.delete(id);
    this.manageBots();
  }

  handleInput(id: string, inputs: { left: boolean; right: boolean; jump: boolean }) {
    const player = this.players.get(id);
    if (player && !player.isBot) player.inputs = inputs;
  }

  manageBots() {
    let realPlayers = 0; let bots = 0;
    for (const p of this.players.values()) { if (p.isBot) bots++; else realPlayers++; }
    const targetBots = Math.max(0, this.minPlayers - realPlayers);

    if (bots < targetBots) {
      for (let i = 0; i < targetBots - bots; i++) {
        const botId = `bot_${Math.random().toString(36).substr(2, 9)}`;
        this.players.set(botId, {
          id: botId, name: `Bot ${Math.floor(Math.random() * 1000)}`,
          x: Math.random() * (MAP_WIDTH - 100) + 50, y: 100, vx: 0, vy: 0,
          width: 30, height: 30, color: '#a1a1aa', isGrounded: false,
          inputs: { left: false, right: false, jump: false },
          isBot: true, botTimer: 0, botDirection: Math.random() > 0.5 ? 1 : -1, trail: [], score: 0
        });
      }
    } else if (bots > targetBots) {
      let toRemove = bots - targetBots;
      for (const [id, p] of this.players.entries()) {
        if (p.isBot && toRemove > 0) { this.players.delete(id); toRemove--; }
      }
    }
  }

  updateBots() {
    for (const p of this.players.values()) {
      if (p.isBot) {
        p.botTimer--;
        if (p.botTimer <= 0) {
          p.botTimer = Math.random() * 60 + 30;
          p.botDirection = Math.random() > 0.5 ? 1 : -1;
          if (Math.random() < 0.2) p.botDirection = 0;
        }
        p.inputs.left = p.botDirection === -1;
        p.inputs.right = p.botDirection === 1;
        if (p.isGrounded) {
          if (Math.random() < 0.02 || (p.vx === 0 && p.botDirection !== 0)) p.inputs.jump = true;
          else p.inputs.jump = false;
        } else p.inputs.jump = false;
      }
    }
  }

  checkCollision(p: Player | Hazard, plat: Platform) {
    return p.x < plat.x + plat.width && p.x + p.width > plat.x && p.y < plat.y + plat.height && p.y + p.height > plat.y;
  }

  tick() {
    this.updateBots();

    // Update hazards
    for (const h of this.hazards) {
      h.x += h.speedX;
      h.y += h.speedY;
      if (h.x < 0 || h.x + h.width > MAP_WIDTH) h.speedX *= -1;
      if (h.y < 0 || h.y + h.height > MAP_HEIGHT) h.speedY *= -1;
    }

    // Respawn coins occasionally
    if (Math.random() < 0.005) {
      for (const c of this.coins) {
        if (c.collected && Math.random() < 0.1) c.collected = false;
      }
    }

    for (const p of this.players.values()) {
      if (p.inputs.left) p.vx -= 1;
      if (p.inputs.right) p.vx += 1;
      
      let friction = 0.8;
      let onIce = false;
      let onLava = false;
      for (const plat of this.platforms) {
        if (plat.type === 'ice' && p.y + p.height >= plat.y && p.y + p.height <= plat.y + 5 && p.x + p.width > plat.x && p.x < plat.x + plat.width) {
          onIce = true;
        }
        if (plat.type === 'lava' && p.y + p.height >= plat.y && p.y + p.height <= plat.y + 5 && p.x + p.width > plat.x && p.x < plat.x + plat.width) {
          onLava = true;
        }
      }
      if (onIce) friction = 0.98;
      
      p.vx *= friction;
      if (Math.abs(p.vx) < 0.1) p.vx = 0;
      
      p.x += p.vx;

      for (const plat of this.platforms) {
        if (this.checkCollision(p, plat)) {
          if (p.vx > 0) { p.x = plat.x - p.width; p.vx = 0; }
          else if (p.vx < 0) { p.x = plat.x + plat.width; p.vx = 0; }
        }
      }

      if (p.x < 0) { p.x = 0; p.vx = 0; }
      if (p.x + p.width > MAP_WIDTH) { p.x = MAP_WIDTH - p.width; p.vx = 0; }

      p.vy += GRAVITY;
      if (p.vy > MAX_FALL_SPEED) p.vy = MAX_FALL_SPEED;
      
      if (onLava) p.vy = JUMP_FORCE * 1.5; // Bounce on lava

      p.y += p.vy;
      p.isGrounded = false;

      for (const plat of this.platforms) {
        if (this.checkCollision(p, plat)) {
          if (p.vy > 0) { p.y = plat.y - p.height; p.vy = 0; p.isGrounded = true; }
          else if (p.vy < 0) { p.y = plat.y + plat.height; p.vy = 0; }
        }
      }

      if (p.inputs.jump && p.isGrounded) {
        p.vy = JUMP_FORCE; p.isGrounded = false;
        if (p.isBot) p.inputs.jump = false;
      }

      // Hazard collision
      for (const h of this.hazards) {
        if (p.x < h.x + h.width && p.x + p.width > h.x && p.y < h.y + h.height && p.y + p.height > h.y) {
          p.y = 100; p.x = Math.random() * (MAP_WIDTH - 100) + 50; p.vy = 0; p.score = Math.max(0, p.score - 5);
        }
      }

      // Coin collection
      for (const c of this.coins) {
        if (!c.collected && p.x < c.x + 20 && p.x + p.width > c.x && p.y < c.y + 20 && p.y + p.height > c.y) {
          c.collected = true;
          p.score += 10;
        }
      }

      if (p.y > MAP_HEIGHT) {
        p.y = 100; p.x = Math.random() * (MAP_WIDTH - 100) + 50; p.vy = 0; p.score = Math.max(0, p.score - 5);
      }

      p.trail.push({x: p.x, y: p.y});
      if (p.trail.length > 15) p.trail.shift();
    }

    const state = {
      roomId: this.roomId,
      theme: this.themeName,
      players: Array.from(this.players.values()).map(p => ({
        id: p.id, name: p.name, x: Math.round(p.x), y: Math.round(p.y),
        width: p.width, height: p.height, color: p.color, trail: p.trail, score: p.score
      })),
      platforms: this.platforms,
      coins: this.coins,
      hazards: this.hazards
    };

    this.io.to(this.roomId).emit('state', state);
  }
}
