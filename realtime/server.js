const express = require('express');
const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 4001;
const JWT_SECRET = process.env.JWT_SECRET || 'talentos-jwt-secret-key';

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'node_ws' }));

const server = app.listen(port, () => {
  console.log(`⚡ TalentOS WebSocket server running on :${port}`);
});

const wss = new WebSocketServer({ server });

// ── Active exam timers ──────────────────────────────────────────────────────
// Map<sessionId, { ws, endsAt, interval }>
const activeSessions = new Map();

wss.on('connection', (ws, req) => {
  console.log('🔌 New WebSocket connection');

  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      ws.send(JSON.stringify({ event: 'error', message: 'Invalid JSON' }));
      return;
    }

    switch (msg.event) {
      case 'auth':
        handleAuth(ws, msg);
        break;
      case 'start_timer':
        handleStartTimer(ws, msg);
        break;
      case 'stop_timer':
        handleStopTimer(ws, msg);
        break;
      case 'ping':
        ws.send(JSON.stringify({ event: 'pong', ts: Date.now() }));
        break;
      default:
        ws.send(JSON.stringify({ event: 'error', message: `Unknown event: ${msg.event}` }));
    }
  });

  ws.on('close', () => {
    // Clean up any timers owned by this ws
    for (const [sid, data] of activeSessions.entries()) {
      if (data.ws === ws) {
        clearInterval(data.interval);
        activeSessions.delete(sid);
        console.log(`🧹 Cleaned timer for session ${sid}`);
      }
    }
  });

  ws.send(JSON.stringify({ event: 'connected', message: 'Welcome to TalentOS realtime server' }));
});

// ── Auth handler ─────────────────────────────────────────────────────────────
function handleAuth(ws, msg) {
  const token = msg.token;
  if (!token) {
    ws.send(JSON.stringify({ event: 'auth_error', message: 'No token provided' }));
    return;
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    ws.userId = decoded.user_id || decoded.sub;
    ws.send(JSON.stringify({ event: 'auth_ok', userId: ws.userId }));
  } catch (err) {
    ws.send(JSON.stringify({ event: 'auth_error', message: 'Invalid token' }));
  }
}

// ── Timer handler ────────────────────────────────────────────────────────────
function handleStartTimer(ws, msg) {
  const { session_id, duration_mins, ends_at } = msg;
  if (!session_id) {
    ws.send(JSON.stringify({ event: 'error', message: 'session_id required' }));
    return;
  }

  // Calculate remaining seconds
  let remainingSec;
  if (ends_at) {
    remainingSec = Math.max(0, Math.floor((new Date(ends_at).getTime() - Date.now()) / 1000));
  } else {
    remainingSec = (duration_mins || 60) * 60;
  }

  // Clean up existing timer for this session
  if (activeSessions.has(session_id)) {
    clearInterval(activeSessions.get(session_id).interval);
  }

  console.log(`⏱️  Timer started: session=${session_id}, remaining=${remainingSec}s`);

  const interval = setInterval(() => {
    remainingSec--;

    if (remainingSec <= 0) {
      clearInterval(interval);
      activeSessions.delete(session_id);
      ws.send(JSON.stringify({
        event: 'timer_expired',
        session_id,
        remaining: 0,
      }));
      console.log(`🛑 Timer expired: session=${session_id}`);
      return;
    }

    // Send tick every second
    ws.send(JSON.stringify({
      event: 'timer_tick',
      session_id,
      remaining: remainingSec,
      minutes: Math.floor(remainingSec / 60),
      seconds: remainingSec % 60,
    }));

    // Warning at 5 min and 1 min marks
    if (remainingSec === 300) {
      ws.send(JSON.stringify({ event: 'timer_warning', session_id, message: '5 minutes remaining!' }));
    } else if (remainingSec === 60) {
      ws.send(JSON.stringify({ event: 'timer_warning', session_id, message: '1 minute remaining!' }));
    }
  }, 1000);

  activeSessions.set(session_id, { ws, endsAt: Date.now() + remainingSec * 1000, interval });
  ws.send(JSON.stringify({ event: 'timer_started', session_id, remaining: remainingSec }));
}

function handleStopTimer(ws, msg) {
  const { session_id } = msg;
  if (activeSessions.has(session_id)) {
    clearInterval(activeSessions.get(session_id).interval);
    activeSessions.delete(session_id);
    ws.send(JSON.stringify({ event: 'timer_stopped', session_id }));
    console.log(`⏹️  Timer stopped: session=${session_id}`);
  }
}

// ── Heartbeat (detect dead connections) ──────────────────────────────────────
const heartbeat = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => clearInterval(heartbeat));
