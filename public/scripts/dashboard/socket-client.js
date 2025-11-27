(() => {
  if (typeof io === 'undefined') {
    console.warn('[WS] socket.io client no disponible en esta página');
    return;
  }

  const socket = io({
    withCredentials: true,
  });

  socket.on('connect', () => {
    console.log('[WS] Conectado al servidor de sockets:', socket.id);
  });

  socket.on('disconnect', () => {
    console.log('[WS] Desconectado de sockets');
  });

  socket.on('votacion:actualizada', (payload) => {
    console.log('[WS] Evento votacion:actualizada recibido:', payload);

    const params = new URLSearchParams(window.location.search);
    const section = params.get('section');

    // Si estamos en la sección de votación (lista de auxiliaturas matriculadas), recargar la tabla
    if (section === 'votacion') {
      if (typeof window.recargarMisAuxiliaturas === 'function') {
        window.recargarMisAuxiliaturas();
      }
    }

    // Si estamos en el panel de votación de un auxiliar_materia concreto, recargar su disponibilidad
    if (section === 'votacion-panel') {
      const auxMateriaIdRaw = params.get('auxMateriaId');
      const auxMateriaId = auxMateriaIdRaw ? parseInt(auxMateriaIdRaw, 10) : NaN;
      const payloadId = payload && payload.auxiliar_materia_id;
      if (auxMateriaId && !Number.isNaN(auxMateriaId) && payloadId === auxMateriaId) {
        if (typeof window.recargarVotacionPanel === 'function') {
          window.recargarVotacionPanel(auxMateriaId);
        }
      }
    }

    // Página independiente de administración de auxiliatura (aux-matricula.html)
    if (window.location.pathname.endsWith('/aux-matricula.html')) {
      const paramsDetalle = new URLSearchParams(window.location.search);
      const auxMateriaIdRaw = paramsDetalle.get('auxMateriaId');
      const auxMateriaId = auxMateriaIdRaw ? parseInt(auxMateriaIdRaw, 10) : NaN;
      const payloadId = payload && payload.auxiliar_materia_id;
      if (auxMateriaId && !Number.isNaN(auxMateriaId) && payloadId === auxMateriaId) {
        if (typeof window.recargarAuxMatDetalle === 'function') {
          window.recargarAuxMatDetalle();
        }
      }
    }
  });

  socket.on('votacion:disponibilidad-actualizada', (payload) => {
    console.log('[WS] Evento votacion:disponibilidad-actualizada recibido:', payload);

    const params = new URLSearchParams(window.location.search);
    const section = params.get('section');
    const payloadId = payload && payload.auxiliar_materia_id;

    if (section === 'votacion-panel') {
      const auxMateriaIdRaw = params.get('auxMateriaId');
      const auxMateriaId = auxMateriaIdRaw ? parseInt(auxMateriaIdRaw, 10) : NaN;
      if (auxMateriaId && !Number.isNaN(auxMateriaId) && payloadId === auxMateriaId) {
        if (typeof window.recargarVotacionPanel === 'function') {
          window.recargarVotacionPanel(auxMateriaId);
        }
      }
    }

    if (window.location.pathname.endsWith('/aux-matricula.html')) {
      const paramsDetalle = new URLSearchParams(window.location.search);
      const auxMateriaIdRaw = paramsDetalle.get('auxMateriaId');
      const auxMateriaId = auxMateriaIdRaw ? parseInt(auxMateriaIdRaw, 10) : NaN;
      if (auxMateriaId && !Number.isNaN(auxMateriaId) && payloadId === auxMateriaId) {
        if (typeof window.recargarAuxMatDetalle === 'function') {
          window.recargarAuxMatDetalle();
        }
      }
    }
  });

  socket.on('matriculacion:actualizada', (payload) => {
    console.log('[WS] Evento matriculacion:actualizada recibido:', payload);

    const params = new URLSearchParams(window.location.search);
    const section = params.get('section');

    // Vista de estudiante: recargar lista de auxiliaturas matriculadas
    if (section === 'votacion') {
      if (typeof window.recargarMisAuxiliaturas === 'function') {
        window.recargarMisAuxiliaturas();
      }
    }

    // Panel auxiliar dentro del dashboard principal
    if (section === 'panel-auxiliar') {
      if (typeof window.recargarPanelAuxiliar === 'function') {
        window.recargarPanelAuxiliar();
      }
    }

    // Página de detalle de auxiliatura para el auxiliar
    if (window.location.pathname.endsWith('/aux-matricula.html')) {
      const paramsDetalle = new URLSearchParams(window.location.search);
      const auxMateriaIdRaw = paramsDetalle.get('auxMateriaId');
      const auxMateriaId = auxMateriaIdRaw ? parseInt(auxMateriaIdRaw, 10) : NaN;
      const payloadId = payload && payload.auxiliar_materia_id;
      if (auxMateriaId && !Number.isNaN(auxMateriaId) && payloadId === auxMateriaId) {
        if (typeof window.recargarAuxMatDetalle === 'function') {
          window.recargarAuxMatDetalle();
        }
      }
    }
  });
})();
