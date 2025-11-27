(() => {
  const els = {
    section: document.getElementById('panelAuxiliarSection'),
    materiasGrid: document.getElementById('auxMateriasGrid'),
    detalleSection: document.getElementById('auxMatDetalleSection'),
    detalleTitulo: document.getElementById('auxMatMateriaTitulo'),
    detalleSubtitulo: document.getElementById('auxMatMateriaSubtitulo'),
    detalleCodigoInput: document.getElementById('auxMatCodigoInput'),
    detalleGenerarBtn: document.getElementById('auxMatGenerarBtn'),
    detalleCerrarMatriculacionBtn: document.getElementById('auxMatCerrarMatriculacionBtn'),
    detalleIniciarVotacionBtn: document.getElementById('auxMatIniciarVotacionBtn'),
    detalleMessage: document.getElementById('auxMatMessage'),
    detalleInscritosBody: document.getElementById('auxMatInscritosBody'),
    detalleNoInscritos: document.getElementById('auxMatNoInscritos'),
    votacionSection: document.getElementById('auxMatVotacionSection'),
    votacionEstadoTexto: document.getElementById('auxMatVotacionEstadoTexto'),
    votacionHorarioWrapper: document.getElementById('auxMatVotacionHorarioWrapper'),
    votacionGrid: document.getElementById('auxMatVotacionGrid'),
  };

  const state = {
    materiasAsignadas: [],
    cargado: false,
    selectedMateriaId: null,
    cargandoDetalle: false,
  };

  async function fetchMateriasAsignadas() {
    try {
      const res = await fetch('/api/mis-auxiliar-materias', { credentials: 'include' });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Error al cargar materias asignadas al auxiliar:', err);
      return [];
    }
  }

  // Render simple del horario de votación en modo solo lectura para el auxiliar.
  // Reutilizamos los mismos días y bloques que en el dashboard: columnas de 1 a 6, horas 07-21 en pasos de 2h.
  function construirGridVotacionIfNeeded() {
    if (!els.votacionGrid || els.votacionGrid.childElementCount > 0) return;

    // Cabeceras de días
    const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    const headerRow = document.createElement('div');
    headerRow.className = 'schedule-row header-row';

    const emptyCell = document.createElement('div');
    emptyCell.className = 'time-column header-cell';
    headerRow.appendChild(emptyCell);

    dias.forEach((diaNombre, index) => {
      const cell = document.createElement('div');
      cell.className = 'day-header-cell';
      cell.dataset.dia = String(index + 1);
      cell.textContent = diaNombre;
      headerRow.appendChild(cell);
    });

    els.votacionGrid.appendChild(headerRow);

    // Filas de horas (07-09, 09-11, 11-13, 14-16, 16-18, 18-20, 20-22)
    const bloquesInicioHoras = [7, 9, 11, 14, 16, 18, 20];

    bloquesInicioHoras.forEach((hInicio) => {
      const row = document.createElement('div');
      row.className = 'schedule-row';

      const timeCell = document.createElement('div');
      timeCell.className = 'time-column';
      const hFin = hInicio + 2;
      const label = `${String(hInicio).padStart(2, '0')}:00 - ${String(hFin).padStart(2, '0')}:00`;
      timeCell.textContent = label;
      row.appendChild(timeCell);

      for (let dia = 1; dia <= 6; dia += 1) {
        if (dia === 6 && hInicio >= 14) {
          const cell = document.createElement('div');
          cell.className = 'schedule-cell';
          cell.dataset.dia = String(dia);
          cell.dataset.hora = `${String(hInicio).padStart(2, '0')}:00`;
          row.appendChild(cell);
          continue;
        }
        const cell = document.createElement('div');
        cell.className = 'schedule-cell';
        cell.dataset.dia = String(dia);
        cell.dataset.hora = `${String(hInicio).padStart(2, '0')}:00`;
        row.appendChild(cell);
      }

      els.votacionGrid.appendChild(row);
    });
  }

  async function cargarVotacionSoloLectura(auxMateriaId) {
    if (!els.votacionHorarioWrapper || !els.votacionGrid) return;

    // Construir el grid de horario si aún no existe
    if (els.votacionGrid.childElementCount === 0) {
      construirGridVotacionIfNeeded();
    }

    // Limpiar posibles cards anteriores
    els.votacionGrid.querySelectorAll('.votacion-slot-card').forEach((card) => card.remove());

    try {
      const res = await fetch(`/api/auxiliar-materias/${auxMateriaId}/votacion/disponibilidad`, {
        method: 'GET',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !Array.isArray(data.disponibilidad)) {
        if (els.votacionEstadoTexto) {
          els.votacionEstadoTexto.textContent = data.message || 'No se pudo cargar el estado de votación.';
        }
        els.votacionHorarioWrapper.hidden = true;
        return;
      }

      const disponibilidad = data.disponibilidad;
      if (!disponibilidad.length) {
        if (els.votacionEstadoTexto) {
          els.votacionEstadoTexto.textContent = 'No hay bloques configurados para mostrar disponibilidad.';
        }
        els.votacionHorarioWrapper.hidden = true;
        return;
      }

      els.votacionHorarioWrapper.hidden = false;

      disponibilidad.forEach((item) => {
        const dia = parseInt(item.dia_semana, 10);
        const horaInicio = typeof item.hora_inicio === 'string'
          ? item.hora_inicio.substring(0, 5)
          : item.hora_inicio;
        if (!dia || !horaInicio) return;

        const cell = els.votacionGrid.querySelector(`.schedule-cell[data-dia="${dia}"][data-hora="${horaInicio}"]`);
        if (!cell) return;

        const estado = item.estado || 'neutral';
        const totalEst = item.total_estudiantes ?? null;
        const dispEst = item.estudiantes_disponibles ?? null;
        const porc = item.porcentaje_disponibles;
        const aulasCantidad = item.aulas_disponibles ?? 0;
        const votosSlot = typeof item.votos_slot === 'number' ? item.votos_slot : 0;

        const card = document.createElement('div');
        card.className = 'votacion-slot-card';
        if (estado === 'recomendada') {
          card.classList.add('votacion-estado-recomendada');
        } else if (estado === 'no_disponible') {
          card.classList.add('votacion-estado-no-disponible');
        } else {
          card.classList.add('votacion-estado-neutral');
        }

        const votosResumenTexto = `${votosSlot} voto${votosSlot === 1 ? '' : 's'}`;

        let fraccionTexto = '-';
        if (dispEst != null && totalEst != null) {
          fraccionTexto = `${dispEst}/${totalEst}`;
        }

        let porcentajeTexto = '-';
        if (porc != null) {
          porcentajeTexto = `${porc}%`;
        }

        card.innerHTML = `
          <div class="votacion-slot-main">
            <span class="votacion-slot-votar">${estado === 'no_disponible' ? 'No disponible' : 'Horario'}</span>
            ${votosResumenTexto ? `<span class="votacion-slot-votos-resumen">${votosResumenTexto}</span>` : ''}
          </div>
          <div class="votacion-slot-row">
            <span class="votacion-slot-label">Cantidad de aulas</span>
            <span class="votacion-slot-value">${aulasCantidad}</span>
          </div>
          <div class="votacion-slot-disponibilidad">
            <div class="votacion-slot-disponibilidad-label">Disponibilidad de estudiantes</div>
            <div class="votacion-slot-disponibilidad-data">
              <span class="votacion-slot-fraccion">${fraccionTexto}</span>
              <span class="votacion-slot-porcentaje">${porcentajeTexto}</span>
            </div>
          </div>
        `;

        cell.appendChild(card);
      });
    } catch (err) {
      console.error('Error al cargar votación en modo solo lectura:', err);
      if (els.votacionEstadoTexto) {
        els.votacionEstadoTexto.textContent = 'Error de conexión al cargar el estado de votación.';
      }
      els.votacionHorarioWrapper.hidden = true;
    }
  }

  function setDetalleMessage(type, text) {
    const el = els.detalleMessage;
    if (!el) return;
    if (!text) {
      el.style.display = 'none';
      return;
    }
    el.textContent = text;
    el.className = `message ${type}`;
    el.style.display = 'block';
  }

  function marcarCardSeleccionada(auxMateriaId) {
    if (!els.materiasGrid) return;
    els.materiasGrid.querySelectorAll('.aux-materia-card').forEach(card => {
      const idStr = card.getAttribute('data-aux-materia-id');
      const id = idStr ? parseInt(idStr, 10) : null;
      card.classList.toggle('is-selected', id === auxMateriaId);
    });
  }

  function renderDetalleInscritos(estudiantes) {
    const body = els.detalleInscritosBody;
    const empty = els.detalleNoInscritos;
    if (!body || !empty) return;

    if (!estudiantes || !estudiantes.length) {
      body.innerHTML = '';
      empty.textContent = 'Aún no hay estudiantes inscritos en esta auxiliatura.';
      empty.style.display = 'block';
      return;
    }

    empty.style.display = 'none';
    body.innerHTML = estudiantes.map((e, index) => {
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
    }).join('');
  }

  async function cargarDetalleMateria(auxMateriaId) {
    if (!auxMateriaId) return;
    if (!els.detalleSection) return;

    try {
      state.cargandoDetalle = true;
      setDetalleMessage('info', 'Cargando información de la auxiliatura...');

      const res = await fetch(`/api/auxiliar-materias/${auxMateriaId}/matriculacion`, {
        method: 'GET',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDetalleMessage('error', data.message || 'No se pudo cargar la información de la auxiliatura');
        return;
      }

      const auxMat = data.auxiliarMateria || {};
      const matriculacion = data.matriculacion || null;
      const votacion = data.votacion || null;
      if (els.detalleTitulo) {
        const base = auxMat.materia_nombre || 'Auxiliatura';
        const sigla = auxMat.sigla || '';
        const grupo = auxMat.grupo ? `Grupo ${auxMat.grupo}` : '';
        const titulo = sigla ? `${sigla} · ${base}` : base;
        els.detalleTitulo.textContent = titulo;
        if (els.detalleSubtitulo) {
          els.detalleSubtitulo.textContent = grupo || '';
        }
      }

      if (els.detalleCodigoInput) {
        els.detalleCodigoInput.value = matriculacion?.codigo || '';
      }

      renderDetalleInscritos(data.estudiantes || []);

      if (!matriculacion) {
        setDetalleMessage('info', 'Aún no generaste un código de matriculación para esta auxiliatura.');
        if (els.detalleCerrarMatriculacionBtn) {
          els.detalleCerrarMatriculacionBtn.disabled = true;
        }
      } else if (matriculacion.activo) {
        setDetalleMessage('success', 'Matriculación ABIERTA. Comparte el código con tus estudiantes.');
        if (els.detalleCerrarMatriculacionBtn) {
          els.detalleCerrarMatriculacionBtn.disabled = false;
        }
      } else {
        setDetalleMessage('info', 'Matriculación CERRADA. Nadie más puede inscribirse, pero el código se mantiene.');
        if (els.detalleCerrarMatriculacionBtn) {
          els.detalleCerrarMatriculacionBtn.disabled = true;
        }
      }

      // Actualizar panel de votación en modo solo lectura
      if (els.votacionSection) {
        if (!votacion || !votacion.activa) {
          els.votacionSection.hidden = false;
          if (els.votacionEstadoTexto) {
            els.votacionEstadoTexto.textContent =
              'La votación aún no está activa para esta auxiliatura. Cuando la inicies, aquí podrás ver cuántos votos tiene cada horario.';
          }
          if (els.votacionHorarioWrapper) {
            els.votacionHorarioWrapper.hidden = true;
          }
          if (els.votacionGrid) {
            els.votacionGrid.innerHTML = '';
          }
        } else {
          // Hay votación activa: mostrar estado actual de votos por horario
          els.votacionSection.hidden = false;
          if (els.votacionEstadoTexto) {
            els.votacionEstadoTexto.textContent =
              'La votación está activa. Debajo se muestra el horario con el total de votos por bloque. Esta vista es solo de consulta; no puedes emitir votos aquí.';
          }
          await cargarVotacionSoloLectura(auxMateriaId);
        }
      }
    } catch (err) {
      console.error('Error al cargar detalle de matriculación:', err);
      setDetalleMessage('error', 'Error de conexión al cargar la auxiliatura');
    } finally {
      state.cargandoDetalle = false;
    }
  }

  async function manejarGenerarCodigo() {
    const id = state.selectedMateriaId;
    if (!id || !els.detalleGenerarBtn) return;

    let codigo = els.detalleCodigoInput ? els.detalleCodigoInput.value.trim() : '';
    const body = codigo ? { codigo } : {};

    try {
      state.cargandoDetalle = true;
      els.detalleGenerarBtn.disabled = true;
      setDetalleMessage('info', 'Generando código...');

      const res = await fetch(`/api/auxiliar-materias/${id}/matriculacion/generar`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDetalleMessage('error', data.message || 'No se pudo generar el código');
        return;
      }

      const codigoFinal = data.matriculacion?.codigo || codigo;
      if (els.detalleCodigoInput && codigoFinal) {
        els.detalleCodigoInput.value = codigoFinal;
      }
      setDetalleMessage('success', 'Código de matriculación listo para usar.');
      if (els.detalleCerrarMatriculacionBtn) {
        els.detalleCerrarMatriculacionBtn.disabled = false;
      }
    } catch (err) {
      console.error('Error al generar código de matriculación:', err);
      setDetalleMessage('error', 'Error de conexión al generar el código');
    } finally {
      state.cargandoDetalle = false;
      els.detalleGenerarBtn.disabled = false;
    }
  }

  async function manejarCerrarMatriculacion() {
    const auxMateriaId = state.selectedMateriaId;
    if (!auxMateriaId || !els.detalleCerrarMatriculacionBtn) return;

    try {
      els.detalleCerrarMatriculacionBtn.disabled = true;
      setDetalleMessage('info', 'Cerrando matriculación...');

      const res = await fetch(`/api/auxiliar-materias/${auxMateriaId}/matriculacion/cerrar`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDetalleMessage('error', data.message || 'No se pudo cerrar la matriculación');
        els.detalleCerrarMatriculacionBtn.disabled = false;
        return;
      }

      if (els.detalleCodigoInput && data.matriculacion?.codigo) {
        els.detalleCodigoInput.value = data.matriculacion.codigo;
      }

      setDetalleMessage('success', 'Matriculación cerrada. Ya no se aceptan nuevas inscripciones.');
    } catch (err) {
      console.error('Error al cerrar la matriculación:', err);
      setDetalleMessage('error', 'Error de conexión al cerrar la matriculación');
      if (els.detalleCerrarMatriculacionBtn) {
        els.detalleCerrarMatriculacionBtn.disabled = false;
      }
    }
  }

  async function manejarEliminarInscrito(estudianteId) {
    const auxMateriaId = state.selectedMateriaId;
    if (!auxMateriaId || !estudianteId) return;

    try {
      setDetalleMessage('info', 'Eliminando estudiante...');
      const res = await fetch(`/api/auxiliar-materias/${auxMateriaId}/matriculacion/estudiantes/${estudianteId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDetalleMessage('error', data.message || 'No se pudo eliminar al estudiante');
        return;
      }
      await cargarDetalleMateria(auxMateriaId);
      setDetalleMessage('success', 'Estudiante eliminado de la lista de inscritos');
    } catch (err) {
      console.error('Error al eliminar estudiante:', err);
      setDetalleMessage('error', 'Error de conexión al eliminar al estudiante');
    }
  }

  function manejarCerrarDetalle() {
    state.selectedMateriaId = null;
    if (els.detalleSection) {
      els.detalleSection.hidden = true;
    }
    setDetalleMessage('', '');
    if (els.detalleInscritosBody) {
      els.detalleInscritosBody.innerHTML = '';
    }
    if (els.detalleCodigoInput) {
      els.detalleCodigoInput.value = '';
    }
  }

  function abrirAdministrarMateria(auxMateriaId) {
    if (!auxMateriaId) return;

    // Recordar la última materia seleccionada para resaltar su tarjeta
    state.selectedMateriaId = auxMateriaId;
    try {
      if (window.sessionStorage) {
        window.sessionStorage.setItem('panelAuxiliar:lastMateriaId', String(auxMateriaId));
      }
    } catch (e) {
      console.warn('No se pudo guardar la última materia seleccionada en sessionStorage:', e);
    }

    // Navegar a la nueva página independiente de administración de matriculación
    const url = `/pages/dashboard/aux-matricula.html?auxMateriaId=${auxMateriaId}`;
    window.location.href = url;
  }

  function renderMateriasGrid(materias) {
    if (!els.materiasGrid) return;

    if (!materias.length) {
      els.materiasGrid.innerHTML = `
        <div class="aux-materia-card">
          <div class="aux-materia-header">
            <h3 class="aux-materia-title">Sin materias asignadas</h3>
          </div>
          <div class="aux-materia-grupo-row">
            <span class="aux-materia-grupo-label">El administrador aún no te asignó materias.</span>
          </div>
        </div>
      `;
      return;
    }

    const cardsHtml = materias.map(a => {
      const totalHoras = (a.veces_por_semana || 0) * (a.horas_por_clase || 0);
      const nombre = a.materia_nombre || 'Materia';
      const sigla = a.sigla || '';
      const grupo = a.grupo || '—';

      return `
        <div class="aux-materia-card" data-aux-materia-id="${a.id}">
          <div class="aux-materia-header">
            <h3 class="aux-materia-title">${nombre}</h3>
            <span class="aux-materia-sigla">${sigla || '&mdash;'}</span>
          </div>
          <div class="aux-materia-grupo-row">
            <span class="aux-materia-grupo-label">Grupo:</span>
            <span class="aux-materia-grupo-value">${grupo}</span>
          </div>
          <div class="aux-materia-carga">
            ${a.veces_por_semana}×/sem · ${a.horas_por_clase}h/clase (${totalHoras}h/sem)
          </div>
          <button type="button" class="btn aux-materia-btn" data-aux-materia-id="${a.id}">
            Administrar materia
          </button>
        </div>
      `;
    }).join('');

    els.materiasGrid.innerHTML = cardsHtml;

    marcarCardSeleccionada(state.selectedMateriaId);

    // Botones "Administrar" abren el panel de detalle dentro del mismo módulo
    els.materiasGrid.querySelectorAll('.aux-materia-btn[data-aux-materia-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idStr = btn.getAttribute('data-aux-materia-id');
        const id = parseInt(idStr, 10);
        if (!id || Number.isNaN(id)) return;
        abrirAdministrarMateria(id);
      });
    });
  }

  async function cargarPanelAuxiliar() {
    const materias = await fetchMateriasAsignadas();
    state.materiasAsignadas = materias;
    state.cargado = true;

    renderMateriasGrid(materias);

    // Resaltar la última materia administrada (si existe en sessionStorage)
    try {
      const lastIdStr = window.sessionStorage ? window.sessionStorage.getItem('panelAuxiliar:lastMateriaId') : null;
      const lastId = lastIdStr ? parseInt(lastIdStr, 10) : null;
      if (lastId && !Number.isNaN(lastId)) {
        state.selectedMateriaId = lastId;
        marcarCardSeleccionada(lastId);
      }
    } catch (e) {
      console.warn('No se pudo restaurar la última materia seleccionada desde sessionStorage:', e);
    }
  }

  function syncVisibilityWithSection() {
    const params = new URLSearchParams(window.location.search);
    const section = params.get('section');
    const show = section === 'panel-auxiliar';

    if (els.section) els.section.hidden = !show;

    if (show && !state.cargado) {
      cargarPanelAuxiliar().catch(err => console.error('Error en panel auxiliar:', err));
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!els.section) return;

    syncVisibilityWithSection();
  });

  window.addEventListener('popstate', syncVisibilityWithSection);

  const originalNavigate = window.navigateToSection;
  if (typeof originalNavigate === 'function') {
    window.navigateToSection = function (section) {
      originalNavigate(section);
      setTimeout(syncVisibilityWithSection, 80);
    };
  }

  window.recargarPanelAuxiliar = function () {
    try {
      const params = new URLSearchParams(window.location.search);
      const section = params.get('section');
      if (section !== 'panel-auxiliar') return;

      cargarPanelAuxiliar().catch(err => {
        console.error('Error al recargar panel auxiliar desde sockets:', err);
      });
    } catch (e) {
      console.error('Error al preparar recarga del panel auxiliar desde sockets:', e);
    }
  };

})();
