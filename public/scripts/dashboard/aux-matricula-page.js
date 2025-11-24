(() => {
  const els = {
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
    auxMateriaId: null,
    cargandoDetalle: false,
  };

  const confirmEls = {
    modal: document.getElementById('confirmRemoveAuxStudentModal'),
    text: document.getElementById('confirmRemoveAuxStudentText'),
    message: document.getElementById('confirmRemoveAuxStudentMessage'),
    confirmBtn: document.getElementById('btnConfirmRemoveAuxStudent'),
  };

  let estudiantePendienteEliminar = null;

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

  // Construir un grid de horario para mostrar el resultado de la votación en modo solo lectura
  function construirGridVotacionIfNeeded() {
    if (!els.votacionGrid || els.votacionGrid.childElementCount > 0) return;

    const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    const headerRow = document.createElement('div');
    headerRow.className = 'schedule-row header-row';

    const emptyCell = document.createElement('div');
    emptyCell.className = 'time-column header-cell';
    headerRow.appendChild(emptyCell);

    dias.forEach((diaNombre, index) => {
      const cell = document.createElement('div');
      cell.className = 'day-header';
      cell.dataset.dia = String(index + 1);
      cell.textContent = diaNombre;
      headerRow.appendChild(cell);
    });

    els.votacionGrid.appendChild(headerRow);

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

  function setBreadcrumbMateria(auxMat) {
    const pathEl = document.getElementById('breadcrumb-path');
    if (!pathEl) return;

    const baseHref = 'principal.html?section=panel-auxiliar';
    const nombre = auxMat.materia_nombre || 'Auxiliatura';
    const sigla = auxMat.sigla || '';
    const tituloMateria = sigla ? `${sigla} · ${nombre}` : nombre;

    pathEl.innerHTML = '';

    const link = document.createElement('a');
    link.href = baseHref;
    link.textContent = 'Panel auxiliar';
    link.className = 'breadcrumb-link';
    pathEl.appendChild(link);

    pathEl.appendChild(document.createTextNode(' / '));

    const span = document.createElement('span');
    span.textContent = tituloMateria;
    span.className = 'breadcrumb-current';
    pathEl.appendChild(span);
  }

  function syncVotacionButton(matriculacion, votacion) {
    const btn = els.detalleIniciarVotacionBtn;
    if (!btn) return;

    if (!matriculacion) {
      btn.disabled = true;
      btn.textContent = 'Iniciar votación';
      btn.dataset.votacionActiva = '0';
      return;
    }

    btn.disabled = false;

    if (votacion && votacion.activa) {
      btn.textContent = 'Finalizar votación';
      btn.dataset.votacionActiva = '1';
    } else {
      btn.textContent = 'Iniciar votación';
      btn.dataset.votacionActiva = '0';
    }
  }

  async function cargarDetalleMateria() {
    if (!state.auxMateriaId) return;
    if (!els.detalleSection) return;

    try {
      state.cargandoDetalle = true;
      setDetalleMessage('info', 'Cargando información de la auxiliatura...');

      const res = await fetch(`/api/auxiliar-materias/${state.auxMateriaId}/matriculacion`, {
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

      setBreadcrumbMateria(auxMat);

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

      // Mostrar estado de votación en modo solo lectura debajo del detalle
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
          els.votacionSection.hidden = false;
          if (els.votacionEstadoTexto) {
            els.votacionEstadoTexto.textContent =
              'La votación está activa. Debajo se muestra el horario con el total de votos por bloque. Esta vista es solo de consulta; no puedes emitir votos aquí.';
          }
          await cargarVotacionSoloLectura(state.auxMateriaId);
        }
      }

      syncVotacionButton(matriculacion, votacion);
    } catch (err) {
      console.error('Error al cargar detalle de matriculación:', err);
      setDetalleMessage('error', 'Error de conexión al cargar la auxiliatura');
    } finally {
      state.cargandoDetalle = false;
    }
  }

  async function manejarGenerarCodigo() {
    const id = state.auxMateriaId;
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
      if (els.detalleGenerarBtn) els.detalleGenerarBtn.disabled = false;
    }
  }

  async function manejarCerrarMatriculacion() {
    const auxMateriaId = state.auxMateriaId;
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

  async function manejarToggleVotacion() {
    const auxMateriaId = state.auxMateriaId;
    const btn = els.detalleIniciarVotacionBtn;
    if (!auxMateriaId || !btn) return;

    const votacionActiva = btn.dataset.votacionActiva === '1';
    const endpoint = votacionActiva ? 'finalizar' : 'iniciar';

    try {
      btn.disabled = true;
      setDetalleMessage('info', votacionActiva ? 'Finalizando votación...' : 'Iniciando votación...');

      const res = await fetch(`/api/auxiliar-materias/${auxMateriaId}/votacion/${endpoint}`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDetalleMessage('error', data.message || 'No se pudo cambiar el estado de la votación');
        btn.disabled = false;
        return;
      }

      await cargarDetalleMateria();
      setDetalleMessage('success', data.message || `Votación ${votacionActiva ? 'finalizada' : 'iniciada'} correctamente.`);
    } catch (err) {
      console.error('Error al cambiar el estado de la votación:', err);
      setDetalleMessage('error', 'Error de conexión al cambiar el estado de la votación');
    } finally {
      btn.disabled = false;
    }
  }

  async function manejarEliminarInscrito(estudianteId) {
    const auxMateriaId = state.auxMateriaId;
    if (!auxMateriaId || !estudianteId) return false;

    try {
      setDetalleMessage('info', 'Eliminando estudiante...');
      const res = await fetch(`/api/auxiliar-materias/${auxMateriaId}/matriculacion/estudiantes/${estudianteId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDetalleMessage('error', data.message || 'No se pudo eliminar al estudiante');
        return false;
      }
      await cargarDetalleMateria();
      setDetalleMessage('success', 'Estudiante eliminado de la lista de inscritos');
      return true;
    } catch (err) {
      console.error('Error al eliminar estudiante:', err);
      setDetalleMessage('error', 'Error de conexión al eliminar al estudiante');
      return false;
    }
  }

  async function loadUserInfoBreadcrumbRight() {
    try {
      const res = await fetch('/api/protected', {
        method: 'GET',
        credentials: 'include',
      });
      if (!res.ok) return;
      const data = await res.json().catch(() => ({}));
      if (!data.user) return;

      const roleEl = document.getElementById('breadcrumb-role');
      if (!roleEl) return;

      let rolNombre = 'Usuario';
      switch (data.user.rol_id) {
        case 1: rolNombre = 'Estudiante'; break;
        case 2: rolNombre = 'Auxiliar'; break;
        case 3: rolNombre = 'Administrador'; break;
      }

      roleEl.innerHTML = `<span class="role-text">${rolNombre}:</span> <span class="name-text">${data.user.nombre_completo}</span>`;
    } catch (err) {
      console.error('Error al cargar información de usuario en aux-matricula-page:', err);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const idStr = params.get('auxMateriaId');
    const id = idStr ? parseInt(idStr, 10) : NaN;

    if (!id || Number.isNaN(id)) {
      setDetalleMessage('error', 'No se indicó una auxiliatura válida. Vuelve al Panel auxiliar.');
      if (els.detalleSection) els.detalleSection.hidden = true;
    } else {
      state.auxMateriaId = id;
      cargarDetalleMateria().catch(err => console.error('Error al cargar detalle de auxiliatura:', err));
    }

    if (els.detalleGenerarBtn) {
      els.detalleGenerarBtn.addEventListener('click', () => {
        manejarGenerarCodigo();
      });
    }

    if (els.detalleCerrarMatriculacionBtn) {
      els.detalleCerrarMatriculacionBtn.addEventListener('click', () => {
        manejarCerrarMatriculacion();
      });
    }

    if (els.detalleIniciarVotacionBtn) {
      els.detalleIniciarVotacionBtn.disabled = true;
      els.detalleIniciarVotacionBtn.textContent = 'Iniciar votación';
      els.detalleIniciarVotacionBtn.dataset.votacionActiva = '0';
      els.detalleIniciarVotacionBtn.addEventListener('click', () => {
        manejarToggleVotacion();
      });
    }

    if (els.detalleInscritosBody) {
      els.detalleInscritosBody.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-aux-mat-remove]');
        if (!btn) return;
        const id = parseInt(btn.getAttribute('data-aux-mat-remove'), 10);
        if (!id || Number.isNaN(id)) return;

        estudiantePendienteEliminar = id;

        // Construir texto descriptivo con el nombre del estudiante
        let nombre = '';
        const row = btn.closest('tr');
        if (row) {
          const cells = row.querySelectorAll('td');
          if (cells[1]) nombre = cells[1].textContent.trim();
        }

        if (confirmEls.text) {
          const base = nombre || 'este estudiante';
          confirmEls.text.textContent = `¿Deseas quitar a ${base} de esta auxiliatura?`;
        }

        if (confirmEls.message) {
          confirmEls.message.style.display = 'none';
          confirmEls.message.textContent = '';
        }

        if (confirmEls.modal) {
          confirmEls.modal.classList.add('show');
          confirmEls.modal.setAttribute('aria-hidden', 'false');
        }
      });
    }

    if (confirmEls.confirmBtn && confirmEls.modal) {
      confirmEls.confirmBtn.addEventListener('click', async () => {
        if (!estudiantePendienteEliminar) return;
        const ok = await manejarEliminarInscrito(estudiantePendienteEliminar);
        if (ok) {
          estudiantePendienteEliminar = null;
          confirmEls.modal.classList.remove('show');
          confirmEls.modal.setAttribute('aria-hidden', 'true');
        }
      });
    }

    if (confirmEls.modal) {
      confirmEls.modal.addEventListener('click', (e) => {
        if (e.target.matches('[data-close-modal]')) {
          confirmEls.modal.classList.remove('show');
          confirmEls.modal.setAttribute('aria-hidden', 'true');
          estudiantePendienteEliminar = null;
          if (confirmEls.message) {
            confirmEls.message.style.display = 'none';
            confirmEls.message.textContent = '';
          }
        }
      });
    }

    loadUserInfoBreadcrumbRight().catch(() => {});

    // Fallback de navegación para el header en esta página independiente
    if (typeof window.navigateToSection !== 'function') {
      window.navigateToSection = function (section) {
        const href = section ? `/pages/dashboard/principal.html?section=${section}` : '/pages/dashboard/principal.html';
        window.location.href = href;
      };
    }
  });
})();
