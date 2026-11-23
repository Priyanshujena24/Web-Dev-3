const io = require('socket.io-client');
const http = require('http');

const API_BASE = process.env.API_BASE || 'http://localhost:5000';
const EMAIL = process.argv[2] || 'seller1@shop.test';
const PASSWORD = process.argv[3] || 'Password@123';

console.log(`\n======================================================`);
console.log(`    E-Commerce CLI Real-Time Socket Event Listener   `);
console.log(`======================================================`);
console.log(`Target API: ${API_BASE}`);
console.log(`Authenticating as: ${EMAIL}\n`);

// 1. Authenticate via REST
const loginData = JSON.stringify({ email: EMAIL, password: PASSWORD });

const url = new URL(`${API_BASE}/api/v1/auth/login`);

const req = http.request(
  {
    hostname: url.hostname,
    port: url.port,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(loginData)
    }
  },
  (res) => {
    let body = '';
    res.on('data', (chunk) => (body += chunk));
    res.on('end', () => {
      if (res.statusCode !== 200) {
        console.error(`Login failed (${res.statusCode}):`, body);
        process.exit(1);
      }

      const parsed = JSON.parse(body);
      const token = parsed.data.accessToken;
      const user = parsed.data.user;

      console.log(`✔ Logged in as: ${user.name} [Role: ${user.role}]`);
      console.log(`✔ Connecting to Socket.IO server with JWT auth...`);

      // 2. Connect Socket.IO client
      const socket = io(API_BASE, {
        auth: { token },
        transports: ['websocket']
      });

      socket.on('connect', () => {
        console.log(`\n✔ Socket connected successfully! [Socket ID: ${socket.id}]`);
        console.log(`👂 Listening for real-time events ('order:new', 'order:status', 'stock:low')...\n`);
      });

      socket.on('connect_error', (err) => {
        console.error('✖ Connection Error:', err.message);
      });

      socket.on('order:new', (payload) => {
        console.log(`\n[EVENT order:new] 🔔 New order received!`);
        console.log(JSON.stringify(payload, null, 2));
      });

      socket.on('order:status', (payload) => {
        console.log(`\n[EVENT order:status] 📦 Order status updated!`);
        console.log(JSON.stringify(payload, null, 2));
      });

      socket.on('stock:low', (payload) => {
        console.log(`\n[EVENT stock:low] ⚠️ Low stock warning!`);
        console.log(JSON.stringify(payload, null, 2));
      });
    });
  }
);

req.on('error', (err) => {
  console.error('Request failed:', err.message);
});

req.write(loginData);
req.end();
