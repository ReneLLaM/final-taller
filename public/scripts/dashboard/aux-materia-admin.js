(() => {
  const els = {
    titulo: document.getElementById('auxMatMateriaTitulo'),
    subtitulo: document.getElementById('auxMatMateriaSubtitulo'),
    codigoInput: document.getElementById('auxMatCodigoInput'),
    generarBtn: document.getElementById('auxMatGenerarBtn'),
    cancelarBtn: document.getElementById('auxMatCancelarBtn'),
    iniciarVotacionBtn: document.getElementById('auxMatIniciarVotacionBtn'),
    message: document.getElementById('auxMatMessage'),
    inscritosBody: document.getElementById('auxMatInscritosBody'),
    noInscritos: document.getElementById('auxMatNoInscritos'),
  };

  const state = {
    auxMateriaId: null,
    cargando: false,
  };

  function getAuxMateriaIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('auxMateriaId') || params.get('id');
    if (!raw) return null;
    const n = parseInt(raw, 10);
    return Number.isNaN(n) ? null : n;
  }

  function setMessage(type, text) {
    if (!els.message) return;
    if (!text) {
      els.message.style.display = 'none';
      return;
    }
    els.message.textContent = text;
    els.message.className = `message ${type}`;
    els.message.style.display = 'block';
  }

  function syncVotacionButton(matriculacion, votacion) {
    const btn = els.iniciarVotacionBtn;
    if (!btn) return;

    if (!matriculacion) {
      btn.disabled = true;
      btn.textContent = 'Iniciar Votación';
      btn.dataset.votacionActiva = '0';
      return;
    }

    btn.disabled = false;

    if (votacion && votacion.activa) {
      btn.textContent = 'Finalizar Votación';
      btn.dataset.votacionActiva = '1';
    } else {
      btn.textContent = 'Iniciar Votación';
      btn.dataset.votacionActiva = '0';
    }
  }

  function renderInscritos(estudiantes) {
    if (!els.inscritosBody || !els.noInscritos) return;
    if (!estudiantes || !estudiantes.length) {
      els.inscritosBody.innerHTML = '';
      els.noInscritos.textContent = 'Aún no hay estudiantes inscritos en esta auxiliatura.';
      els.noInscritos.style.display = 'block';
      return;
    }
    els.noInscritos.style.display = 'none';
    els.inscritosBody.innerHTML = estudiantes
      .map((e, index) => {
        const nombre = e.nombre_completo || '';
        const cu = e.cu || '';
        const carrera = e.carrera || '';
        const id = e.id;
        return `
          <tr data-estudiante-id="${id}">
            <td>${index + 1}</td>
            <td>${nombre}</td>
            <td>${cu}</td>
            <td>${carrera}</td>
            <td class="actions">
              <button type="button" class="btn btn-danger" data-aux-mat-remove="${id}">Eliminar</button>
            </td>
          </tr>
        `;
      })
      .join('');
  }

  async function cargarDetalle() {
    const id = state.auxMateriaId;
    if (!id) {
      setMessage('error', 'No se pudo determinar la auxiliatura a administrar.');
      return;
    }
    try {
      setMessage('info', 'Cargando información...');
      const res = await fetch(`/api/auxiliar-materias/${id}/matriculacion`, {
        method: 'GET',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage('error', data.message || 'No se pudo cargar la información de la auxiliatura');
        return;
      }
      const votacion = data.votacion || null;
      if (els.titulo) {
        const base = data.auxiliarMateria?.materia_nombre || 'Auxiliatura';
        const sigla = data.auxiliarMateria?.sigla || '';
        const grupo = data.auxiliarMateria?.grupo ? `Grupo ${data.auxiliarMateria.grupo}` : '';
        const titulo = sigla ? `${sigla} · ${base}` : base;
        els.titulo.textContent = titulo;
        if (els.subtitulo) {
          els.subtitulo.textContent = grupo || '';
        }
      }
      if (els.codigoInput) {
        els.codigoInput.value = data.matriculacion?.codigo || '';
      }
      renderInscritos(data.estudiantes || []);
      syncVotacionButton(data.matriculacion || null, votacion);
      setMessage('info', 'Configura el código y comparte con tus estudiantes.');
    } catch (err) {
      console.error('Error al cargar detalle de matriculación:', err);
      setMessage('error', 'Error de conexión al cargar la auxiliatura');
    }
  }

  async function manejarGenerar() {
    if (!state.auxMateriaId || state.cargando) return;
    const id = state.auxMateriaId;
    let codigo = els.codigoInput ? els.codigoInput.value.trim() : '';
    const body = codigo ? { codigo } : {};
    try {
      state.cargando = true;
      setMessage('info', 'Generando código...');
      if (els.generarBtn) els.generarBtn.disabled = true;
      const res = await fetch(`/api/auxiliar-materias/${id}/matriculacion/generar`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage('error', data.message || 'No se pudo generar el código');
        return;
      }
      const codigoFinal = data.matriculacion?.codigo || codigo;
      if (els.codigoInput && codigoFinal) {
        els.codigoInput.value = codigoFinal;
      }
      setMessage('success', 'Código de matriculación listo para usar.');
    } catch (err) {
      console.error('Error al generar código de matriculación:', err);
      setMessage('error', 'Error de conexión al generar el código');
    } finally {
      state.cargando = false;
      if (els.generarBtn) els.generarBtn.disabled = false;
    }
  }

  async function manejarEliminar(estudianteId) {
    if (!state.auxMateriaId || !estudianteId) return;
    try {
      setMessage('info', 'Eliminando estudiante...');
      const res = await fetch(
        `/api/auxiliar-materias/${state.auxMateriaId}/matriculacion/estudiantes/${estudianteId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage('error', data.message || 'No se pudo eliminar al estudiante');
        return;
      }
      await cargarDetalle();
      setMessage('success', 'Estudiante eliminado de la lista de inscritos');
    } catch (err) {
      console.error('Error al eliminar estudiante:', err);
      setMessage('error', 'Error de conexión al eliminar al estudiante');
    }
  }

  async function manejarToggleVotacion() {
    if (!state.auxMateriaId || !els.iniciarVotacionBtn) return;

    const activa = els.iniciarVotacionBtn.dataset.votacionActiva === '1';
    const endpoint = activa ? 'finalizar' : 'iniciar';

    try {
      els.iniciarVotacionBtn.disabled = true;
      setMessage('info', activa ? 'Finalizando votación...' : 'Iniciando votación...');

      const res = await fetch(`/api/auxiliar-materias/${state.auxMateriaId}/votacion/${endpoint}`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage('error', data.message || 'No se pudo cambiar el estado de la votación');
        els.iniciarVotacionBtn.disabled = false;
        return;
      }

      await cargarDetalle();
      setMessage('success', data.message || (activa ? 'Votación finalizada.' : 'Votación iniciada.'));
    } catch (err) {
      console.error('Error al cambiar estado de votación:', err);
      setMessage('error', 'Error de conexión al cambiar el estado de la votación');
    } finally {
      els.iniciarVotacionBtn.disabled = false;
    }
  }

  function init() {
    state.auxMateriaId = getAuxMateriaIdFromUrl();
    if (!state.auxMateriaId) {
      setMessage('error', 'No se especificó la auxiliatura a administrar.');
      return;
    }
    cargarDetalle();

    if (els.generarBtn) {
      els.generarBtn.addEventListener('click', () => {
        manejarGenerar();
      });
    }

    if (els.cancelarBtn) {
      els.cancelarBtn.addEventListener('click', () => {
        window.location.href = 'principal.html?section=panel-auxiliar';
      });
    }

    if (els.iniciarVotacionBtn) {
      els.iniciarVotacionBtn.disabled = true;
      els.iniciarVotacionBtn.textContent = 'Iniciar Votación';
      els.iniciarVotacionBtn.dataset.votacionActiva = '0';
      els.iniciarVotacionBtn.addEventListener('click', () => {
        manejarToggleVotacion();
      });
    }

    if (els.inscritosBody) {
      els.inscritosBody.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-aux-mat-remove]');
        if (!btn) return;
        const id = parseInt(btn.getAttribute('data-aux-mat-remove'), 10);
        if (!id || Number.isNaN(id)) return;
        manejarEliminar(id);
      });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    init();
  });
})();
