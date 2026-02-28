import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface GameClientProps {
  roomId: string;
  displayName: string;
  onLeave: () => void;
}

export default function GameClient({ roomId, displayName, onLeave }: GameClientProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<{id: string, sender: string, text: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('join', { roomId, displayName });
    });

    newSocket.on('chatMessage', (msg) => {
      setMessages(prev => [...prev.slice(-49), msg]);
    });

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    newSocket.on('state', (state) => {
      // Draw background
      const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      if (state.theme === 'Forest Ruins') {
        bgGradient.addColorStop(0, '#022c22'); // emerald-950
        bgGradient.addColorStop(1, '#064e3b'); // emerald-900
      } else if (state.theme === 'Ice Caverns') {
        bgGradient.addColorStop(0, '#082f49'); // sky-950
        bgGradient.addColorStop(1, '#0c4a6e'); // sky-900
      } else if (state.theme === 'Lava Core') {
        bgGradient.addColorStop(0, '#450a0a'); // red-950
        bgGradient.addColorStop(1, '#7f1d1d'); // red-900
      } else {
        bgGradient.addColorStop(0, '#18181b'); // zinc-900
        bgGradient.addColorStop(1, '#27272a'); // zinc-800
      }
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw platforms
      for (const plat of state.platforms) {
        if (plat.type === 'ice') ctx.fillStyle = '#bae6fd'; // sky-200
        else if (plat.type === 'lava' || state.theme === 'Lava Core') ctx.fillStyle = '#fca5a5'; // red-300
        else ctx.fillStyle = '#a3e635'; // lime-400

        ctx.shadowBlur = 15;
        ctx.shadowColor = ctx.fillStyle;
        ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      }
      ctx.shadowBlur = 0;

      // Draw coins
      if (state.coins) {
        ctx.fillStyle = '#fbbf24'; // amber-400
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#fbbf24';
        for (const c of state.coins) {
          if (!c.collected) {
            ctx.beginPath();
            ctx.arc(c.x + 10, c.y + 10, 10, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.shadowBlur = 0;
      }

      // Draw hazards
      if (state.hazards) {
        ctx.fillStyle = '#ef4444'; // red-500
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ef4444';
        for (const h of state.hazards) {
          ctx.fillRect(h.x, h.y, h.width, h.height);
        }
        ctx.shadowBlur = 0;
      }

      // Draw players
      for (const p of state.players) {
        // Draw trail
        if (p.trail && p.trail.length > 0) {
          ctx.beginPath();
          ctx.moveTo(p.trail[0].x + p.width / 2, p.trail[0].y + p.height / 2);
          for (let i = 1; i < p.trail.length; i++) {
            ctx.lineTo(p.trail[i].x + p.width / 2, p.trail[i].y + p.height / 2);
          }
          ctx.strokeStyle = p.color + '66'; // semi-transparent
          ctx.lineWidth = p.width * 0.8;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke();
        }

        // Draw body
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 20;
        ctx.shadowColor = p.color;
        
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(p.x, p.y, p.width, p.height, 8);
        } else {
          ctx.fillRect(p.x, p.y, p.width, p.height);
        }
        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw name and score
        ctx.fillStyle = 'white';
        ctx.font = 'bold 13px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(p.name, p.x + p.width / 2, p.y - 18);
        ctx.fillStyle = '#fbbf24';
        ctx.font = '11px Inter, sans-serif';
        ctx.fillText(`Score: ${p.score || 0}`, p.x + p.width / 2, p.y - 5);
      }
    });

    // Input handling
    const inputs = { left: false, right: false, jump: false };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'ArrowLeft' || e.key === 'a') inputs.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd') inputs.right = true;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') inputs.jump = true;
      newSocket.emit('input', inputs);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'ArrowLeft' || e.key === 'a') inputs.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd') inputs.right = false;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') inputs.jump = false;
      newSocket.emit('input', inputs);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      newSocket.disconnect();
    };
  }, [roomId, displayName]);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim() && socket) {
      socket.emit('chatMessage', chatInput.trim());
      setChatInput('');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-white">
      <div className="mb-4 w-full max-w-[1500px] px-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-indigo-400">Server: {roomId}</h1>
          <p className="text-zinc-400">Playing as <span className="font-semibold text-white">{displayName}</span></p>
        </div>
        <button
          onClick={onLeave}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 rounded-lg text-sm font-medium transition-colors"
        >
          Leave Game
        </button>
      </div>
      
      <div className="flex flex-row gap-4 max-w-[1500px] w-full px-4">
        <div className="relative p-2 bg-zinc-900 rounded-xl shadow-2xl flex-grow border border-zinc-800">
          <canvas
            ref={canvasRef}
            width={1200}
            height={800}
            className="rounded-lg bg-zinc-950 w-full h-auto"
          />
        </div>

        <div className="w-80 bg-zinc-900 rounded-xl shadow-2xl flex flex-col overflow-hidden h-[800px] flex-shrink-0 border border-zinc-800">
          <div className="p-3 bg-zinc-950 border-b border-zinc-800 font-semibold text-zinc-300">
            Server Chat
          </div>
          <div className="flex-grow p-4 overflow-y-auto space-y-2 flex flex-col">
            {messages.map((msg) => (
              <div key={msg.id} className="text-sm break-words">
                <span className="font-bold text-indigo-400">{msg.sender}: </span>
                <span className="text-zinc-300">{msg.text}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={handleSendChat} className="p-3 bg-zinc-950 border-t border-zinc-800 flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-grow px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
              maxLength={100}
            />
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors"
            >
              Send
            </button>
          </form>
        </div>
      </div>

      <div className="mt-4 text-sm text-zinc-500">
        Controls: WASD or Arrows to move and jump
      </div>
    </div>
  );
}
