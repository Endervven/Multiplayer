import React, { useState, useRef, useEffect } from 'react';
import { User } from '../App';

interface LevelEditorProps {
  user: User;
  onBack: () => void;
}

export default function LevelEditor({ user, onBack }: LevelEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [platforms, setPlatforms] = useState<{x: number, y: number, width: number, height: number, type: string}[]>([]);
  const [coins, setCoins] = useState<{id: string, x: number, y: number, collected: boolean}[]>([]);
  const [hazards, setHazards] = useState<{x: number, y: number, width: number, height: number, speedX: number, speedY: number}[]>([]);
  
  const [currentTool, setCurrentTool] = useState<'platform' | 'ice' | 'lava' | 'coin' | 'hazard' | 'eraser'>('platform');
  const [isDrawing, setIsDrawing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [currentY, setCurrentY] = useState(0);

  const [mapName, setMapName] = useState('');
  const [mapDesc, setMapDesc] = useState('');
  const [message, setMessage] = useState('');

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw platforms
    for (const plat of platforms) {
      if (plat.type === 'ice') ctx.fillStyle = '#bae6fd';
      else if (plat.type === 'lava') ctx.fillStyle = '#fca5a5';
      else ctx.fillStyle = '#a3e635';
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
    }

    // Draw coins
    ctx.fillStyle = '#fbbf24';
    for (const c of coins) {
      ctx.beginPath();
      ctx.arc(c.x + 10, c.y + 10, 10, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw hazards
    ctx.fillStyle = '#ef4444';
    for (const h of hazards) {
      ctx.fillRect(h.x, h.y, h.width, h.height);
    }

    // Draw current shape
    if (isDrawing && currentTool !== 'eraser' && currentTool !== 'coin') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      const w = currentX - startX;
      const h = currentY - startY;
      ctx.fillRect(startX, startY, w, h);
    }
  };

  useEffect(() => {
    draw();
  }, [platforms, coins, hazards, isDrawing, currentX, currentY]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (currentTool === 'eraser') {
      setPlatforms(platforms.filter(p => !(x >= p.x && x <= p.x + p.width && y >= p.y && y <= p.y + p.height)));
      setCoins(coins.filter(c => !(x >= c.x && x <= c.x + 20 && y >= c.y && y <= c.y + 20)));
      setHazards(hazards.filter(h => !(x >= h.x && x <= h.x + h.width && y >= h.y && y <= h.y + h.height)));
      return;
    }

    if (currentTool === 'coin') {
      setCoins([...coins, { id: `c_${Date.now()}`, x: x - 10, y: y - 10, collected: false }]);
      return;
    }

    setIsDrawing(true);
    setStartX(x);
    setStartY(y);
    setCurrentX(x);
    setCurrentY(y);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCurrentX(e.clientX - rect.left);
    setCurrentY(e.clientY - rect.top);
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    const w = currentX - startX;
    const h = currentY - startY;
    
    if (Math.abs(w) < 10 || Math.abs(h) < 10) return; // Too small

    const x = w > 0 ? startX : currentX;
    const y = h > 0 ? startY : currentY;
    const width = Math.abs(w);
    const height = Math.abs(h);

    if (currentTool === 'hazard') {
      setHazards([...hazards, { x, y, width, height, speedX: 2, speedY: 0 }]);
    } else {
      setPlatforms([...platforms, { x, y, width, height, type: currentTool }]);
    }
  };

  const handlePublish = async () => {
    if (!mapName) {
      setMessage('Please enter a map name.');
      return;
    }
    try {
      const res = await fetch('/api/maps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: user.displayName,
          name: mapName,
          description: mapDesc,
          data: { platforms, coins, hazards }
        }),
      });
      if (res.ok) {
        setMessage('Map published successfully!');
        setMapName('');
        setMapDesc('');
      } else {
        setMessage('Failed to publish map.');
      }
    } catch (e) {
      setMessage('Network error.');
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-zinc-950 text-white p-4">
      <div className="w-full max-w-[1200px] flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-indigo-400">Level Editor</h1>
        <button onClick={onBack} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium">Back to Menu</button>
      </div>

      <div className="flex gap-4 w-full max-w-[1200px]">
        <div className="flex-grow bg-zinc-900 p-2 rounded-xl border border-zinc-800">
          <canvas
            ref={canvasRef}
            width={1200}
            height={800}
            className="w-full h-auto bg-zinc-950 cursor-crosshair rounded-lg"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>

        <div className="w-64 flex flex-col gap-4">
          <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 space-y-2">
            <h2 className="font-bold text-zinc-300">Tools</h2>
            <button onClick={() => setCurrentTool('platform')} className={`w-full py-2 rounded ${currentTool === 'platform' ? 'bg-lime-600' : 'bg-zinc-800'}`}>Normal Platform</button>
            <button onClick={() => setCurrentTool('ice')} className={`w-full py-2 rounded ${currentTool === 'ice' ? 'bg-sky-600' : 'bg-zinc-800'}`}>Ice Platform</button>
            <button onClick={() => setCurrentTool('lava')} className={`w-full py-2 rounded ${currentTool === 'lava' ? 'bg-red-600' : 'bg-zinc-800'}`}>Lava (Bouncy)</button>
            <button onClick={() => setCurrentTool('coin')} className={`w-full py-2 rounded ${currentTool === 'coin' ? 'bg-amber-600' : 'bg-zinc-800'}`}>Coin</button>
            <button onClick={() => setCurrentTool('hazard')} className={`w-full py-2 rounded ${currentTool === 'hazard' ? 'bg-rose-600' : 'bg-zinc-800'}`}>Moving Hazard</button>
            <button onClick={() => setCurrentTool('eraser')} className={`w-full py-2 rounded ${currentTool === 'eraser' ? 'bg-zinc-600' : 'bg-zinc-800'}`}>Eraser</button>
          </div>

          <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 space-y-4">
            <h2 className="font-bold text-zinc-300">Publish Map</h2>
            {message && <div className="text-sm text-emerald-400">{message}</div>}
            <input
              type="text"
              placeholder="Map Name"
              value={mapName}
              onChange={e => setMapName(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded focus:outline-none focus:border-indigo-500"
            />
            <textarea
              placeholder="Description"
              value={mapDesc}
              onChange={e => setMapDesc(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded focus:outline-none focus:border-indigo-500 h-24 resize-none"
            />
            <button onClick={handlePublish} className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 rounded font-medium">Publish</button>
          </div>
        </div>
      </div>
    </div>
  );
}
