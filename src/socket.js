import { Server } from 'socket.io';

let ioInstance = null;

export function initSocket(server) {
  ioInstance = new Server(server, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  ioInstance.on('connection', (socket) => {
    console.log('[WS] Nuevo cliente conectado:', socket.id);
  });

  return ioInstance;
}

export function getIO() {
  if (!ioInstance) {
    throw new Error('Socket.io no está inicializado');
  }
  return ioInstance;
}
