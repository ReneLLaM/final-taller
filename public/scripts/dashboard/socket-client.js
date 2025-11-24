(() => {
  if (typeof io === 'undefined') {
    console.warn('[WS] socket.io client no disponible en esta página');
    return;
  }

  const socket = io({
    withCredentials: true
  });

  socket.on('connect', () => {
    console.log('[WS] Conectado al servidor de sockets:', socket.id);
  });

  socket.on('disconnect', () => {
    console.log('[WS] Desconectado de sockets');
  });

  socket.on('votacion:actualizada', (payload) => {
    console.log('[WS] Evento votacion:actualizada recibido:', payload);

    // Si estamos en la sección de votación (lista de auxiliaturas matriculadas), recargar la tabla
    const params = new URLSearchParams(window.location.search);
    const section = params.get('section');
    if (section === 'votacion') {
      if (typeof window.recargarMisAuxiliaturas === 'function') {
        window.recargarMisAuxiliaturas();
      }
    }
  });
})();
