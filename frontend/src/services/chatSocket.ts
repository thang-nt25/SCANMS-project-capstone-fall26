import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

let socket: Socket | null = null;

export const getChatSocket = (): Socket => {
  if (socket && socket.connected) return socket;

  const token = localStorage.getItem('token');

  socket = io(`${SOCKET_URL}/chat`, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => {
    console.log('✅ Chat socket connected:', socket?.id);
  });

  socket.on('connect_error', (err) => {
    console.error('❌ Chat socket error:', err.message);
  });

  return socket;
};

export const disconnectChatSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
