const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

let io = null;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: env.CLIENT_ORIGIN === '*' ? '*' : env.CLIENT_ORIGIN,
      methods: ['GET', 'POST']
    }
  });

  // Authentication middleware using access JWT
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
      socket.handshake.query?.token;

    if (!token) {
      return next(new Error('Authentication error: Token required'));
    }

    try {
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
      socket.user = {
        id: decoded.sub,
        role: decoded.role
      };
      return next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const { id, role } = socket.user;

    // Join personal user room
    socket.join(`user:${id}`);

    // Join role-specific rooms
    if (role === 'admin') {
      socket.join('role:admin');
    } else if (role === 'seller') {
      socket.join('role:seller');
    }

    if (process.env.NODE_ENV !== 'test') {
      console.log(`Socket client connected: ${socket.id} (user:${id}, role:${role})`);
    }

    socket.on('disconnect', () => {
      if (process.env.NODE_ENV !== 'test') {
        console.log(`Socket client disconnected: ${socket.id}`);
      }
    });
  });

  return io;
};

const getIO = () => {
  return io;
};

const emitToUser = (userId, event, payload) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, payload);
  }
};

const emitToRole = (role, event, payload) => {
  if (io) {
    io.to(`role:${role}`).emit(event, payload);
  }
};

module.exports = {
  initSocket,
  getIO,
  emitToUser,
  emitToRole
};
