// BubbleTown MVP (CommonJS) – eenvoudige multiplayer (lopen + chat)
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
app.use(cors());
app.use(express.static('public'));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = process.env.PORT || 3000;

// Wereld-instellingen
const WORLD = { cols: 12, rows: 12 };
const rooms = new Map(); // roomId -> { players: Map, furniture: [] }

function getRoom(roomId = 'lobby') {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      players: new Map(),
      furniture: [
        {id:'a', x:3, y:3, h:1.2, color:'#6db0ff'},
        {id:'b', x:4, y:3, h:0.8, color:'#9bd97d'},
        {id:'c', x:8, y:7, h:1.6, color:'#e07be0'},
        {id:'d', x:7, y:9, h:1.0, color:'#f59f66'}
      ]
    });
  }
  return rooms.get(roomId);
}

function rngColor() {
  const c = ['#ffce6b','#9ad1ff','#f69fb8','#a4f4a4','#c6b3ff','#f7d08a'];
  return c[Math.floor(Math.random()*c.length)];
}

io.on('connection', (socket) => {
  let roomId = 'lobby';
  const room = getRoom(roomId);

  // Spawn speler
  const spawn = { x: 5 + Math.floor(Math.random()*3), y: 5 + Math.floor(Math.random()*3) };
  const player = {
    id: socket.id,
    name: 'Guest-' + (Math.floor(Math.random()*900)+100),
    color: rngColor(),
    x: spawn.x, y: spawn.y,
    tx: spawn.x, ty: spawn.y,
    lastChatAt: 0
  };
  room.players.set(socket.id, player);
  socket.join(roomId);

  // Stuur init naar nieuwe speler
  socket.emit('hello', {
    you: player,
    world: WORLD,
    furniture: room.furniture,
    players: Array.from(room.players.values())
  });

  // Laat aan room weten dat iemand binnenkomt
  socket.to(roomId).emit('system', { text: `${player.name} is binnengekomen.` });

  // Verplaatsing (doel-tegel)
  socket.on('moveTo', ({x,y}) => {
    if (typeof x !== 'number' || typeof y !== 'number') return;
    const px = Math.max(0, Math.min(WORLD.cols-1, Math.round(x)));
    const py = Math.max(0, Math.min(WORLD.rows-1, Math.round(y)));
    player.tx = px; player.ty = py;
  });

  // Chat
  socket.on('chat', (text) => {
    const now = Date.now();
    if (now - player.lastChatAt < 700) return; // simpele rate-limit
    player.lastChatAt = now;
    text = String(text || '').slice(0, 140);
    if (!text.trim()) return;
    io.to(roomId).emit('chat', { id: player.id, name: player.name, text });
  });

  socket.on('disconnect', () => {
    const r = getRoom(roomId);
    if (r.players.has(socket.id)) {
      const gone = r.players.get(socket.id);
      r.players.delete(socket.id);
      socket.to(roomId).emit('system', { text: `${gone.name} is vertrokken.` });
      io.to(roomId).emit('remove', { id: gone.id });
    }
  });
});

// Server tick: lerp posities en broadcast state
const TICK_HZ = 15;
setInterval(() => {
  for (const [roomId, room] of rooms) {
    for (const p of room.players.values()) {
      const speed = 0.25; // fraction per tick
      p.x += (p.tx - p.x) * speed;
      p.y += (p.ty - p.y) * speed;
    }
    const snapshot = {
      type: 'state',
      players: Array.from(room.players.values()).map(p => ({
        id: p.id, name: p.name, color: p.color, x: p.x, y: p.y, tx: p.tx, ty: p.ty
      }))
    };
    io.to(roomId).emit('state', snapshot);
  }
}, 1000 / TICK_HZ);

server.listen(PORT, () => {
  console.log('✅ BubbleTown draait op http://localhost:' + PORT);
});
