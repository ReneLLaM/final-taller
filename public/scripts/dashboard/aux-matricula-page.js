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
    votacionResultadosSection: document.getElementById('auxMatVotacionResultadosSection'),
    votacionResultadosBody: document.getElementById('auxMatVotacionResultadosBody'),
    votacionAulaModal: document.getElementById('auxMatAulaModal'),
    votacionAulaModalTexto: document.getElementById('auxMatAulaModalTexto'),
    votacionAulaModalMessage: document.getElementById('auxMatAulaModalMessage'),
    votacionAulaInput: document.getElementById('auxMatAulaInput'),
    votacionAulaRecomendada: document.getElementById('auxMatAulaRecomendada'),
    votacionAulaGuardarBtn: document.getElementById('auxMatAulaGuardarBtn'),
  };

  const state = {
    auxMateriaId: null,
    cargandoDetalle: false,
    auxVotacionDisponibilidad: [],
    votacionActiva: false,
    tieneVotacion: false,
  };

  async function handleLogoutLocal() {
    try {
      const res = await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        window.location.href = '/pages/auth/login.html';
        return;
      }
    } catch (err) {
      console.error('Error al cerrar sesión desde aux-matricula-page:', err);
    }
    window.location.href = '/pages/auth/login.html';
  }

  if (typeof window !== 'undefined' && typeof window.handleLogout !== 'function') {
    window.handleLogout = handleLogoutLocal;
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
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

  const confirmEls = {
    modal: document.getElementById('confirmRemoveAuxStudentModal'),
    text: document.getElementById('confirmRemoveAuxStudentText'),
    message: document.getElementById('confirmRemoveAuxStudentMessage'),
    confirmBtn: document.getElementById('btnConfirmRemoveAuxStudent'),
  };

  let estudiantePendienteEliminar = null;
  let votacionAulaSlotActual = null;

  function nombreDiaLocal(dia) {
    const nombres = [null, 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return nombres[dia] || 'Día';
  }

  async function guardarAulaDesdeModal() {
    const modal = els.votacionAulaModal;
    const selectEl = els.votacionAulaInput;
    const messageEl = els.votacionAulaModalMessage;

    if (!modal || !selectEl || !votacionAulaSlotActual || !state.auxMateriaId) return;

    const aula = (selectEl.value || '').trim();
    if (!aula) {
      if (messageEl) {
        messageEl.textContent = 'Selecciona un aula para guardar.';
        messageEl.className = 'message error';
        messageEl.style.display = 'block';
      }
      return;
    }

    if (messageEl) {
      messageEl.style.display = 'none';
      messageEl.textContent = '';
    }

    const payload = {
      dia_semana: votacionAulaSlotActual.dia,
      hora_inicio: votacionAulaSlotActual.horaInicio,
      hora_fin: votacionAulaSlotActual.horaFin,
      aula,
    };

    try {
      if (messageEl) {
        messageEl.textContent = 'Guardando aula...';
        messageEl.className = 'message info';
        messageEl.style.display = 'block';
      }

      const res = await fetch(`/api/auxiliar-materias/${state.auxMateriaId}/votacion/aula`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (messageEl) {
          messageEl.textContent = data.message || 'No se pudo actualizar el aula para este horario.';
          messageEl.className = 'message error';
          messageEl.style.display = 'block';
        }
        return;
      }

      if (messageEl) {
        messageEl.textContent = data.message || 'Aula actualizada para este horario de auxiliatura.';
        messageEl.className = 'message success';
        messageEl.style.display = 'block';
      }

      await cargarDetalleMateria();

      setTimeout(() => {
        cerrarModalAdministrarAula();
      }, 600);
    } catch (err) {
      console.error('Error al actualizar aula de auxiliatura:', err);
      if (messageEl) {
        messageEl.textContent = 'Error de conexión al actualizar el aula';
        messageEl.className = 'message error';
        messageEl.style.display = 'block';
      }
    }
  }

  function abrirModalAdministrarAula(slotInfo) {
    const modal = els.votacionAulaModal;
    if (!modal) return;

    votacionAulaSlotActual = slotInfo;

    const { dia, rango, aulaActual, aulaSugerida, totalEstudiantes, aulasDetalle } = slotInfo;
    const diaNombre = nombreDiaLocal(dia);

    if (els.votacionAulaModalTexto) {
      els.votacionAulaModalTexto.textContent = `${diaNombre} · ${rango}`;
    }

    const selectEl = els.votacionAulaInput;
    if (selectEl) {
      const selectedValor = aulaActual || aulaSugerida || '';
      const detalle = Array.isArray(aulasDetalle) ? aulasDetalle.slice() : [];
      const total = typeof totalEstudiantes === 'number' ? totalEstudiantes : 0;

      selectEl.innerHTML = '';

      const placeholderOpt = document.createElement('option');
      placeholderOpt.value = '';
      placeholderOpt.textContent = 'Selecciona un aula';
      placeholderOpt.disabled = true;
      placeholderOpt.selected = !selectedValor;
      selectEl.appendChild(placeholderOpt);

      if (selectedValor && !detalle.some((a) => a.sigla === selectedValor)) {
        const optActual = document.createElement('option');
        optActual.value = selectedValor;
        optActual.textContent = `${selectedValor} (asignada actualmente)`;
        selectEl.appendChild(optActual);
      }

      detalle.sort((a, b) => {
        const grpA = !a.disponible ? 2 : (a.capacidad_suficiente ? 0 : 1);
        const grpB = !b.disponible ? 2 : (b.capacidad_suficiente ? 0 : 1);
        if (grpA !== grpB) return grpA - grpB;
        const capA = typeof a.capacidad === 'number' ? a.capacidad : 0;
        const capB = typeof b.capacidad === 'number' ? b.capacidad : 0;
        if (capA !== capB) return capB - capA;
        return String(a.sigla || '').localeCompare(String(b.sigla || ''));
      });

      detalle.forEach((aula) => {
        const opt = document.createElement('option');
        opt.value = aula.sigla;
        const partes = [`${aula.sigla}`, `cap. ${aula.capacidad}`];
        if (!aula.disponible) {
          partes.push('ocupada');
          opt.disabled = true;
        } else if (!aula.capacidad_suficiente && total > 0) {
          partes.push('capacidad < inscritos');
        } else if (aula.capacidad_suficiente) {
          partes.push('recomendada');
        }
        opt.textContent = partes.join(' · ');

        if (!aula.capacidad_suficiente && total > 0) {
          opt.style.color = '#b91c1c';
        }

        selectEl.appendChild(opt);
      });

      if (selectedValor) {
        selectEl.value = selectedValor;
      }
    }

    if (els.votacionAulaRecomendada) {
      if (aulaSugerida) {
        let capTexto = '';
        if (Array.isArray(aulasDetalle)) {
          const match = aulasDetalle.find((a) => a.sigla === aulaSugerida);
          if (match && typeof match.capacidad === 'number') {
            capTexto = ` (cap. ${match.capacidad})`;
          }
        }
        els.votacionAulaRecomendada.textContent = `Recomendada según capacidad: ${aulaSugerida}${capTexto}`;
      } else {
        els.votacionAulaRecomendada.textContent = '';
      }
    }

    if (els.votacionAulaModalMessage) {
      els.votacionAulaModalMessage.style.display = 'none';
      els.votacionAulaModalMessage.textContent = '';
    }

    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
  }

  function cerrarModalAdministrarAula() {
    const modal = els.votacionAulaModal;
    if (!modal) return;
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
    votacionAulaSlotActual = null;
  }

  async function cargarVotacionSoloLectura(auxMateriaId, options = {}) {
    const mostrarAdministrar = options.mostrarAdministrar === true;
    if (!els.votacionHorarioWrapper || !els.votacionGrid) return;
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
        if (els.votacionResultadosSection && els.votacionResultadosBody) {
          els.votacionResultadosSection.hidden = true;
          els.votacionResultadosBody.innerHTML = '';
        }
        return;
      }

      const disponibilidad = data.disponibilidad;

      state.auxVotacionDisponibilidad = disponibilidad;
      if (!disponibilidad.length) {
        if (els.votacionEstadoTexto) {
          els.votacionEstadoTexto.textContent = 'No hay bloques configurados para mostrar disponibilidad.';
        }
        els.votacionHorarioWrapper.hidden = true;
        if (els.votacionResultadosSection && els.votacionResultadosBody) {
          els.votacionResultadosSection.hidden = true;
          els.votacionResultadosBody.innerHTML = '';
        }
        return;
      }

      els.votacionHorarioWrapper.hidden = false;

      const existingCards = new Map();
      els.votacionGrid.querySelectorAll('.votacion-slot-card').forEach((card) => {
        const cell = card.closest('.schedule-cell');
        if (!cell) return;
        const diaAttr = cell.getAttribute('data-dia');
        const horaAttr = cell.getAttribute('data-hora');
        if (!diaAttr || !horaAttr) return;
        const key = `${diaAttr}|${horaAttr}`;
        existingCards.set(key, card);
      });

      renderVotacionResultadosAux(data, mostrarAdministrar);

      disponibilidad.forEach((item) => {
        const dia = parseInt(item.dia_semana, 10);
        const horaInicio = typeof item.hora_inicio === 'string'
          ? item.hora_inicio.substring(0, 5)
          : item.hora_inicio;
        if (!dia || !horaInicio) return;

        const key = `${dia}|${horaInicio}`;

        const cell = els.votacionGrid.querySelector(`.schedule-cell[data-dia="${dia}"][data-hora="${horaInicio}"]`);
        if (!cell) return;

        let card = existingCards.get(key);
        if (!card) {
          card = document.createElement('div');
          cell.appendChild(card);
        }
        existingCards.delete(key);

        const estado = item.estado || 'neutral';
        const totalEst = item.total_estudiantes ?? null;
        const dispEst = item.estudiantes_disponibles ?? null;
        const porc = item.porcentaje_disponibles;
        const aulasCantidad = item.aulas_disponibles ?? 0;
        const votosSlot = typeof item.votos_slot === 'number' ? item.votos_slot : 0;

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
      });

      existingCards.forEach((card) => {
        if (card && card.parentElement) {
          card.parentElement.removeChild(card);
        }
      });
    } catch (err) {
      console.error('Error al cargar votación en modo solo lectura:', err);
      if (els.votacionEstadoTexto) {
        els.votacionEstadoTexto.textContent = 'Error de conexión al cargar el estado de votación.';
      }
      els.votacionHorarioWrapper.hidden = true;
      if (els.votacionResultadosSection && els.votacionResultadosBody) {
        els.votacionResultadosSection.hidden = true;
        els.votacionResultadosBody.innerHTML = '';
      }
    }
  }

  function renderVotacionResultadosAux(payload, mostrarAdministrar) {
    const section = els.votacionResultadosSection;
    const tbody = els.votacionResultadosBody;
    if (!section || !tbody) return;

    const disponibilidad = Array.isArray(payload?.disponibilidad) ? payload.disponibilidad : [];
    const conVotos = disponibilidad.filter((item) => {
      const votos = typeof item.votos_slot === 'number' ? item.votos_slot : 0;
      return votos > 0;
    });

    if (!conVotos.length) {
      section.hidden = true;
      tbody.innerHTML = '';
      return;
    }

    const maxVotos = typeof payload.max_votos === 'number'
      ? payload.max_votos
      : (payload.veces_por_semana || 0);
    const filasPorVoto = 5;
    const topNBase = maxVotos > 0 ? maxVotos * filasPorVoto : filasPorVoto;

    const ordenados = conVotos.slice().sort((a, b) => {
      const votosA = typeof a.votos_slot === 'number' ? a.votos_slot : 0;
      const votosB = typeof b.votos_slot === 'number' ? b.votos_slot : 0;
      if (votosB !== votosA) return votosB - votosA;
      const porcA = a.porcentaje_disponibles ?? 0;
      const porcB = b.porcentaje_disponibles ?? 0;
      if (porcB !== porcA) return porcB - porcA;
      if (a.dia_semana !== b.dia_semana) return a.dia_semana - b.dia_semana;
      return String(a.hora_inicio).localeCompare(String(b.hora_inicio));
    });

    const top = ordenados.slice(0, topNBase);

    const vecesPorSemana = typeof payload.veces_por_semana === 'number'
      ? payload.veces_por_semana
      : (typeof payload.max_votos === 'number' ? payload.max_votos : 1);

    const candidatosGanadores = conVotos.slice().sort((a, b) => {
      const votosA = typeof a.votos_slot === 'number' ? a.votos_slot : 0;
      const votosB = typeof b.votos_slot === 'number' ? b.votos_slot : 0;
      if (votosB !== votosA) return votosB - votosA;
      if (a.dia_semana !== b.dia_semana) return a.dia_semana - b.dia_semana;
      return String(a.hora_inicio).localeCompare(String(b.hora_inicio));
    });

    const ganadoresBase = candidatosGanadores.slice(0, Math.max(1, vecesPorSemana));
    const ganadorKeys = new Set();
    ganadoresBase.forEach((g) => {
      const diaKey = parseInt(g.dia_semana, 10) || 0;
      const horaKey = typeof g.hora_inicio === 'string'
        ? g.hora_inicio.substring(0, 5)
        : g.hora_inicio;
      if (!diaKey || !horaKey) return;
      ganadorKeys.add(`${diaKey}|${horaKey}`);
    });

    const totalVotosGlobal = top.reduce((sum, item) => {
      const v = typeof item.votos_slot === 'number' ? item.votos_slot : 0;
      return sum + v;
    }, 0);

    let maxVotosSlot = 0;
    top.forEach((item) => {
      const v = typeof item.votos_slot === 'number' ? item.votos_slot : 0;
      if (v > maxVotosSlot) maxVotosSlot = v;
    });
    if (maxVotosSlot <= 0) maxVotosSlot = 1;

    tbody.innerHTML = top.map((item) => {
      const votosSlot = typeof item.votos_slot === 'number' ? item.votos_slot : 0;
      const horaInicioStr = typeof item.hora_inicio === 'string'
        ? item.hora_inicio.substring(0, 5)
        : item.hora_inicio;
      const horaFinStr = typeof item.hora_fin === 'string'
        ? item.hora_fin.substring(0, 5)
        : item.hora_fin;
      const rango = `${horaInicioStr || '--:--'} - ${horaFinStr || '--:--'}`;
      const diaNum = parseInt(item.dia_semana, 10) || 1;
      const diaNombre = nombreDiaLocal(diaNum);
      const porcentajeVotos = totalVotosGlobal > 0
        ? Math.round((votosSlot * 100) / totalVotosGlobal)
        : 0;
      const barWidth = Math.round((votosSlot * 100) / maxVotosSlot);
      const aula = item.aula_sugerida || '—';

      const key = `${diaNum}|${horaInicioStr}`;
      const esGanador = ganadorKeys.has(key);
      const rowClass = esGanador ? ' class="votacion-resultado-ganador"' : '';

      const adminCell = mostrarAdministrar
        ? `<button type="button" class="btn btn-secondary" data-aux-aula-admin="1" data-dia="${diaNum}" data-hora-inicio="${horaInicioStr}" data-hora-fin="${horaFinStr}" data-aula-actual="${escapeHtml(aula)}" data-aula-sugerida="${escapeHtml(item.aula_sugerida || '')}">Administrar</button>`
        : '&mdash;';

      return `
        <tr${rowClass}>
          <td>${escapeHtml(rango)}</td>
          <td>${escapeHtml(diaNombre)}</td>
          <td>
            <div class="admin-chart-bar-track">
              <div class="admin-chart-bar-fill chart-aulas" style="width:${barWidth}%;"></div>
            </div>
          </td>
          <td class="admin-chart-bar-number">${porcentajeVotos}%</td>
          <td class="admin-chart-bar-number">${votosSlot}</td>
          <td>${escapeHtml(aula)}</td>
          <td>${adminCell}</td>
        </tr>
      `;
    }).join('');

    section.hidden = false;
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

      state.tieneVotacion = !!votacion;
      state.votacionActiva = !!(votacion && votacion.activa);

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

      if (els.votacionSection) {
        if (!votacion) {
          els.votacionSection.hidden = false;
          if (els.votacionEstadoTexto) {
            els.votacionEstadoTexto.textContent =
              'La votación aún no está creada para esta auxiliatura. Cuando la inicies, aquí podrás ver cuántos votos tiene cada horario.';
          }
          if (els.votacionHorarioWrapper) {
            els.votacionHorarioWrapper.hidden = true;
          }
          if (els.votacionGrid) {
            els.votacionGrid.querySelectorAll('.votacion-slot-card').forEach((card) => card.remove());
          }
          if (els.votacionResultadosSection && els.votacionResultadosBody) {
            els.votacionResultadosSection.hidden = true;
            els.votacionResultadosBody.innerHTML = '';
          }
        } else if (votacion.activa) {
          els.votacionSection.hidden = false;
          if (els.votacionEstadoTexto) {
            els.votacionEstadoTexto.textContent =
              'La votación está activa. Debajo se muestra el horario con el total de votos por bloque. Esta vista es solo de consulta; no puedes emitir votos aquí.';
          }
          await cargarVotacionSoloLectura(state.auxMateriaId, { mostrarAdministrar: false });
        } else {
          els.votacionSection.hidden = false;
          if (els.votacionEstadoTexto) {
            els.votacionEstadoTexto.textContent =
              'La votación fue finalizada. Debajo se muestran los horarios ganadores y el aula asignada para la auxiliatura.';
          }
          await cargarVotacionSoloLectura(state.auxMateriaId, { mostrarAdministrar: true });
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

      if (!votacionActiva && els.votacionSection) {
        try {
          els.votacionSection.hidden = false;
          els.votacionSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (e) {
          try {
            const rect = els.votacionSection.getBoundingClientRect();
            const top = rect.top + window.pageYOffset - 80;
            window.scrollTo({ top, behavior: 'smooth' });
          } catch (e2) {
            // Ignorar errores de scroll en navegadores antiguos
          }
        }
      }

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
    (async () => {
      try {
        const authRes = await fetch('/api/protected', {
          method: 'GET',
          credentials: 'include',
        });

        if (!authRes.ok) {
          window.location.href = '/pages/auth/login.html';
          return;
        }

        const authData = await authRes.json().catch(() => ({}));
        const user = authData.user;

        if (!user || user.rol_id !== 2) {
          window.location.href = '/pages/auth/login.html';
          return;
        }

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

        loadUserInfoBreadcrumbRight().catch(() => {});
      } catch (err) {
        console.error('Error al verificar autenticación en aux-matricula-page:', err);
        window.location.href = '/pages/auth/login.html';
      }
    })();

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

        if (confirmEls.text) {
          const base = 'este estudiante';
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

    if (els.votacionResultadosBody) {
      els.votacionResultadosBody.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-aux-aula-admin]');
        if (!btn) return;

        const dia = parseInt(btn.getAttribute('data-dia'), 10) || 0;
        const horaInicio = btn.getAttribute('data-hora-inicio') || '';
        const horaFin = btn.getAttribute('data-hora-fin') || '';
        const rango = `${horaInicio || '--:--'} - ${horaFin || '--:--'}`;
        const aulaActual = btn.getAttribute('data-aula-actual') || '';
        const aulaSugerida = btn.getAttribute('data-aula-sugerida') || '';

        if (!dia || !horaInicio || !horaFin) return;

        let totalEstudiantes = null;
        let aulasDetalle = [];
        const dispo = Array.isArray(state.auxVotacionDisponibilidad) ? state.auxVotacionDisponibilidad : [];
        const slot = dispo.find((item) => {
          const slotDia = parseInt(item.dia_semana, 10) || 0;
          const slotHora = typeof item.hora_inicio === 'string'
            ? item.hora_inicio.substring(0, 5)
            : item.hora_inicio;
          return slotDia === dia && slotHora === horaInicio;
        });
        if (slot) {
          if (typeof slot.total_estudiantes === 'number') {
            totalEstudiantes = slot.total_estudiantes;
          } else if (typeof slot.totalEstudiantes === 'number') {
            totalEstudiantes = slot.totalEstudiantes;
          }
          if (Array.isArray(slot.aulas_detalle)) {
            aulasDetalle = slot.aulas_detalle;
          }
        }

        abrirModalAdministrarAula({
          dia,
          horaInicio,
          horaFin,
          rango,
          aulaActual,
          aulaSugerida,
          totalEstudiantes,
          aulasDetalle,
        });
      });
    }

    if (els.votacionAulaModal) {
      els.votacionAulaModal.addEventListener('click', (e) => {
        if (e.target.matches('[data-close-modal]')) {
          cerrarModalAdministrarAula();
        }
      });
    }

    if (els.votacionAulaGuardarBtn) {
      els.votacionAulaGuardarBtn.addEventListener('click', () => {
        guardarAulaDesdeModal();
      });
    }

    window.refrescarAuxMatVotacion = function () {
      if (!state.auxMateriaId) return;
      const mostrarAdministrar = state.tieneVotacion && !state.votacionActiva;
      cargarVotacionSoloLectura(state.auxMateriaId, { mostrarAdministrar }).catch((err) => {
        console.error('Error al refrescar votación de auxiliatura desde sockets:', err);
      });
    };

    window.recargarAuxMatDetalle = function () {
      if (!state.auxMateriaId || state.cargandoDetalle) return;
      cargarDetalleMateria().catch((err) => {
        console.error('Error al recargar detalle de auxiliatura desde sockets:', err);
      });
    };

    if (typeof window.navigateToSection !== 'function') {
      window.navigateToSection = function (section) {
        const href = section ? `/pages/dashboard/principal.html?section=${section}` : '/pages/dashboard/principal.html';
        window.location.href = href;
      };
    }
  });
})();
