import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

interface PlayerInfo {
  token: string;
  name: string;
  color: 'w' | 'b';
}

interface RoomMove {
  seq: number;
  color: 'w' | 'b';
  from: { r: number; c: number };
  to: { r: number; c: number };
  promotion?: string;
  ts: number;
}

interface RoomState {
  code: string;
  status: 'waiting' | 'playing' | 'ended';
  whitePlayer: PlayerInfo | null;
  blackPlayer: PlayerInfo | null;
  turn: 'w' | 'b';
  moves: RoomMove[];
  resetCount: number;
  updatedAt: number;
  whiteJoined?: boolean;
  blackJoined?: boolean;
}

const rooms = new Map<string, RoomState>();
const sseClients = new Map<string, Set<Response>>();

function broadcastRoom(room: RoomState) {
  const clients = sseClients.get(room.code);
  if (!clients || clients.size === 0) return;
  const payload = `data: ${JSON.stringify({ type: 'room_state', room })}\n\n`;
  for (const client of clients) {
    try {
      client.write(payload);
    } catch (e) {
      clients.delete(client);
    }
  }
}

// Generate 4-character room code (alphanumeric, easily readable)
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let attempt = 0; attempt < 50; attempt++) {
    code = '';
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    if (!rooms.has(code)) return code;
  }
  return code + Math.floor(Math.random() * 10);
}

// 1. Create Room
app.post('/api/rooms/create', (req: Request, res: Response) => {
  const { preferredColor, playerToken, playerName } = req.body || {};
  const token = String(playerToken || 'tok_' + Math.random().toString(36).slice(2) + Date.now().toString(36));
  const name = String(playerName || 'Jogador 1').trim() || 'Jogador 1';
  const side: 'w' | 'b' = preferredColor === 'b' ? 'b' : 'w';

  const code = generateRoomCode();
  const room: RoomState = {
    code,
    status: 'waiting',
    whitePlayer: side === 'w' ? { token, name, color: 'w' } : null,
    blackPlayer: side === 'b' ? { token, name, color: 'b' } : null,
    turn: 'w',
    moves: [],
    resetCount: 0,
    updatedAt: Date.now()
  };

  rooms.set(code, room);
  res.json({
    ok: true,
    code,
    color: side,
    playerToken: token,
    playerName: name,
    room: {
      ...room,
      whiteJoined: Boolean(room.whitePlayer),
      blackJoined: Boolean(room.blackPlayer)
    }
  });
});

// 2. Join Room
app.post('/api/rooms/join', (req: Request, res: Response) => {
  const { code: rawCode, playerToken, playerName } = req.body || {};
  const code = String(rawCode || '').trim().toUpperCase();
  const token = String(playerToken || 'tok_' + Math.random().toString(36).slice(2) + Date.now().toString(36));
  const name = String(playerName || 'Jogador 2').trim() || 'Jogador 2';

  let room = rooms.get(code);
  if (!room) {
    // If not found in server memory, initialize room with this code
    const side: 'w' | 'b' = 'b';
    room = {
      code,
      status: 'playing',
      whitePlayer: { token: 'host_auto', name: 'Jogador 1', color: 'w' },
      blackPlayer: { token, name, color: 'b' },
      turn: 'w',
      moves: [],
      resetCount: 0,
      updatedAt: Date.now()
    };
    rooms.set(code, room);
    return res.json({
      ok: true,
      code,
      color: side,
      playerToken: token,
      playerName: name,
      room: {
        ...room,
        whiteJoined: Boolean(room.whitePlayer),
        blackJoined: Boolean(room.blackPlayer)
      }
    });
  }

  // Check if player is reconnecting
  if (room.whitePlayer && room.whitePlayer.token === token) {
    room.whitePlayer.name = name;
    broadcastRoom(room);
    return res.json({
      ok: true,
      code,
      color: 'w',
      playerToken: token,
      playerName: name,
      room: {
        ...room,
        whiteJoined: Boolean(room.whitePlayer),
        blackJoined: Boolean(room.blackPlayer)
      }
    });
  }

  if (room.blackPlayer && room.blackPlayer.token === token) {
    room.blackPlayer.name = name;
    broadcastRoom(room);
    return res.json({
      ok: true,
      code,
      color: 'b',
      playerToken: token,
      playerName: name,
      room: {
        ...room,
        whiteJoined: Boolean(room.whitePlayer),
        blackJoined: Boolean(room.blackPlayer)
      }
    });
  }

  // Assign available seat
  let assignedSide: 'w' | 'b' = 'b';
  if (!room.whitePlayer) {
    assignedSide = 'w';
    room.whitePlayer = { token, name, color: 'w' };
  } else if (!room.blackPlayer) {
    assignedSide = 'b';
    room.blackPlayer = { token, name, color: 'b' };
  } else {
    // Both seats occupied, join as spectator or second player
    assignedSide = 'b';
    room.blackPlayer.token = token;
    room.blackPlayer.name = name;
  }

  room.status = room.whitePlayer && room.blackPlayer ? 'playing' : 'waiting';
  room.updatedAt = Date.now();
  broadcastRoom(room);

  res.json({
    ok: true,
    code,
    color: assignedSide,
    playerToken: token,
    playerName: name,
    room: {
      ...room,
      whiteJoined: Boolean(room.whitePlayer),
      blackJoined: Boolean(room.blackPlayer)
    }
  });
});

// 3. Get Room State
app.get('/api/rooms/:code/state', (req: Request, res: Response) => {
  const code = String(req.params.code || '').trim().toUpperCase();
  const room = rooms.get(code);
  if (!room) {
    return res.status(404).json({ ok: false, error: 'Room not found' });
  }
  res.json({
    ok: true,
    room: {
      ...room,
      whiteJoined: Boolean(room.whitePlayer),
      blackJoined: Boolean(room.blackPlayer)
    }
  });
});

// 4. Send Move
app.post('/api/rooms/:code/move', (req: Request, res: Response) => {
  const code = String(req.params.code || '').trim().toUpperCase();
  const room = rooms.get(code);
  if (!room) {
    return res.status(404).json({ ok: false, error: 'Room not found' });
  }

  const { color, from, to, promotion } = req.body || {};
  if (!from || !to || !color) {
    return res.status(400).json({ ok: false, error: 'Invalid move payload' });
  }

  const seq = room.moves.length + 1;
  const newMove: RoomMove = {
    seq,
    color,
    from,
    to,
    promotion: promotion || 'queen',
    ts: Date.now()
  };

  room.moves.push(newMove);
  room.turn = color === 'w' ? 'b' : 'w';
  room.updatedAt = Date.now();

  broadcastRoom({
    ...room,
    whiteJoined: Boolean(room.whitePlayer),
    blackJoined: Boolean(room.blackPlayer)
  });

  res.json({ ok: true, seq });
});

// 5. Reset Game in Room
app.post('/api/rooms/:code/reset', (req: Request, res: Response) => {
  const code = String(req.params.code || '').trim().toUpperCase();
  const room = rooms.get(code);
  if (!room) {
    return res.status(404).json({ ok: false, error: 'Room not found' });
  }

  room.moves = [];
  room.turn = 'w';
  room.resetCount = (room.resetCount || 0) + 1;
  room.updatedAt = Date.now();

  broadcastRoom({
    ...room,
    whiteJoined: Boolean(room.whitePlayer),
    blackJoined: Boolean(room.blackPlayer)
  });

  res.json({ ok: true, resetCount: room.resetCount });
});

// 6. Server-Sent Events (SSE) for Real-Time Synchronization
app.get('/api/rooms/:code/events', (req: Request, res: Response) => {
  const code = String(req.params.code || '').trim().toUpperCase();
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  });
  res.write('\n');

  if (!sseClients.has(code)) {
    sseClients.set(code, new Set());
  }
  const clientSet = sseClients.get(code)!;
  clientSet.add(res);

  // Send initial state immediately if room exists
  const room = rooms.get(code);
  if (room) {
    res.write(`data: ${JSON.stringify({
      type: 'room_state',
      room: {
        ...room,
        whiteJoined: Boolean(room.whitePlayer),
        blackJoined: Boolean(room.blackPlayer)
      }
    })}\n\n`);
  }

  req.on('close', () => {
    clientSet.delete(res);
    if (clientSet.size === 0) {
      sseClients.delete(code);
    }
  });
});

// Mount Vite or static build
async function setupVite() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0' },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Kaldiris Chess server active at http://0.0.0.0:${PORT}`);
  });
}

setupVite().catch((err) => {
  console.error('Failed to start server:', err);
});
