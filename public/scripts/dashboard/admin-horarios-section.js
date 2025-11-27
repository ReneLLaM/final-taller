(() => {
  const TIME_SLOTS = [
    '07:00 - 08:00',
    '08:00 - 09:00',
    '09:00 - 10:00',
    '10:00 - 11:00',
    '11:00 - 12:00',
    '12:00 - 13:00',
    '14:00 - 15:00',
    '15:00 - 16:00',
    '16:00 - 17:00',
    '17:00 - 18:00',
    '18:00 - 19:00',
    '19:00 - 20:00',
    '20:00 - 21:00',
    '21:00 - 22:00',
  ];

  const els = {
    section: document.getElementById('adminHorariosSection'),
    schedule: document.querySelector('.dashboard-container'),
    diaSelect: document.getElementById('adminHorariosDiaSelect'),
    times: document.getElementById('adminHorariosTimes'),
    columns: document.getElementById('adminHorariosColumns'),
    modal: document.getElementById('adminHorarioModal'),
    form: document.getElementById('adminHorarioForm'),
    message: document.getElementById('adminHorarioMessage'),
    inputId: document.getElementById('adminHorarioId'),
    inputDia: document.getElementById('adminHorarioDia'),
    inputSlotIndex: document.getElementById('adminHorarioSlotIndex'),
    inputAula: document.getElementById('adminHorarioAula'),
    inputMateria: document.getElementById('adminHorarioMateria'),
    inputGrupo: document.getElementById('adminHorarioGrupo'),
    inputDocente: document.getElementById('adminHorarioDocente'),
    inputHoraInicio: document.getElementById('adminHorarioHoraInicio'),
    inputHoraFin: document.getElementById('adminHorarioHoraFin'),
    resumen: document.getElementById('adminHorarioResumen'),
    diaLabel: document.getElementById('adminHorarioDiaLabel'),
    deleteBtn: document.getElementById('adminHorarioDeleteBtn'),
    insightMateria: document.getElementById('adminInsightMateria'),
    insightDocente: document.getElementById('adminInsightDocente'),
    insightGrupo: document.getElementById('adminInsightGrupo'),
    insightAula: document.getElementById('adminInsightAula'),
    insightHorario: document.getElementById('adminInsightHorario'),
    insightDia: document.getElementById('adminInsightDiaActual'),
  };

  const state = {
    aulas: [],
    horarios: [],
    diaActual: 1,
    timesRendered: false,
    cargado: false,
  };

  function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function timeToMinutes(hora) {
    if (!hora) return null;
    const str = typeof hora === 'string' ? hora : String(hora);
    const [h, m] = str.substring(0, 5).split(':').map(v => parseInt(v, 10));
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  }

  function parseSlotRangeToMinutes(slot) {
    if (!slot) return { inicio: null, fin: null };
    const parts = slot.split('-');
    if (parts.length !== 2) return { inicio: null, fin: null };
    return {
      inicio: timeToMinutes(parts[0].trim()),
      fin: timeToMinutes(parts[1].trim()),
    };
  }

  function getSlotRange(index) {
    const slot = TIME_SLOTS[index] || '';
    const parts = slot.split('-');
    if (parts.length !== 2) return { start: '', end: '' };
    return {
      start: parts[0].trim(),
      end: parts[1].trim(),
    };
  }

  function getSlotIndexForHoraInicio(horaInicio) {
    const inicioMin = timeToMinutes(horaInicio);
    if (inicioMin == null) return -1;
    for (let i = 0; i < TIME_SLOTS.length; i++) {
      const { inicio, fin } = parseSlotRangeToMinutes(TIME_SLOTS[i]);
      if (inicio == null || fin == null) continue;
      if (inicioMin >= inicio && inicioMin < fin) {
        return i;
      }
    }
    return -1;
  }

  function splitMateria(materia) {
    // El JSON original viene algo así:
    //   "materia": "LABFIS100 GL39"
    // donde la parte de la izquierda es el código de materia y la derecha el grupo/código.
    if (!materia) {
      return { codigo: '', grupoCodigo: '', displayTitulo: 'Materia' };
    }
    const txt = String(materia).trim();
    const parts = txt.split(/\s+/);
    if (parts.length === 1) {
      return {
        codigo: parts[0],
        grupoCodigo: '',
        displayTitulo: parts[0],
      };
    }
    const codigo = parts[0];
    const grupoCodigo = parts.slice(1).join(' ');
    return {
      codigo,
      grupoCodigo,
      // Mostrar la materia como código principal (p.ej. LABFIS100)
      displayTitulo: codigo,
    };
  }

  function updateInsightPanel(horario) {
    if (!horario || !els.insightMateria) return;

    const materiaTxt = horario.materia || '';
    const docente = horario.docente || '';
    const aula = horario.aula || '';
    const { grupoCodigo } = splitMateria(horario.materia);

    const horaInicio = typeof horario.hora_inicio === 'string'
      ? horario.hora_inicio.substring(0, 5)
      : horario.hora_inicio;
    const horaFin = typeof horario.hora_fin === 'string'
      ? horario.hora_fin.substring(0, 5)
      : horario.hora_fin;

    if (els.insightMateria) els.insightMateria.textContent = materiaTxt || 'Bloque sin materia';
    if (els.insightDocente) els.insightDocente.textContent = docente || '—';
    if (els.insightGrupo) els.insightGrupo.textContent = grupoCodigo || '—';
    if (els.insightAula) els.insightAula.textContent = aula || '—';
    if (els.insightHorario) {
      const rango = `${horaInicio || '--:--'} - ${horaFin || '--:--'}`;
      els.insightHorario.textContent = rango;
    }

    if (els.insightDia) {
      const dia = horario.dia_semana || state.diaActual;
      const nombreDia = typeof window.nombreDia === 'function'
        ? window.nombreDia(parseInt(dia, 10) || 1)
        : `Día ${dia}`;
      els.insightDia.textContent = `Día actual: ${nombreDia}`;
    }
  }

  function renderTimes() {
    if (!els.times || state.timesRendered) return;
    els.times.innerHTML = TIME_SLOTS.map(rango => `
      <div class="time-slot">${rango}</div>
    `).join('');
    state.timesRendered = true;
  }

  function renderHorarioCard(horario) {
    const { displayTitulo, grupoCodigo } = splitMateria(horario.materia);
    const docente = horario.docente || 'Docente';
    const horaInicio = typeof horario.hora_inicio === 'string'
      ? horario.hora_inicio.substring(0, 5)
      : horario.hora_inicio;
    const horaFin = typeof horario.hora_fin === 'string'
      ? horario.hora_fin.substring(0, 5)
      : horario.hora_fin;

    const rangoTexto = (horaInicio || '--:--') + ' - ' + (horaFin || '--:--');

    const aula = horario.aula || '';

    return `
      <div class="admin-horario-card" 
           data-horario-id="${horario.id}"
           data-materia="${escapeHtml(horario.materia || '')}"
           data-grupo="${escapeHtml(grupoCodigo || '')}"
           data-docente="${escapeHtml(docente)}"
           data-aula="${escapeHtml(aula)}"
           data-rango="${escapeHtml(rangoTexto)}">
        <div class="admin-horario-title">${escapeHtml(displayTitulo || 'Materia')}</div>
        <div class="admin-horario-row">
          <span class="admin-horario-label">Docente:</span>
          <span class="admin-horario-docente">${escapeHtml(docente)}</span>
        </div>
        <div class="admin-horario-meta">
          <span>
            <span class="admin-horario-label">Grupo</span>
            <span class="admin-horario-sigla">${escapeHtml(grupoCodigo || '-')}</span>
          </span>
        </div>
        <div class="admin-horario-time">${escapeHtml(rangoTexto)}</div>
      </div>
    `;
  }

  function mapHorariosToCells(aulas) {
    const map = new Map();
    if (!Array.isArray(state.horarios)) return map;

    state.horarios.forEach(h => {
      const aula = (h.aula || '').trim();
      if (!aula) return;
      const slotIndex = getSlotIndexForHoraInicio(h.hora_inicio);
      if (slotIndex < 0) return;
      const key = `${aula}__${slotIndex}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(h);
    });

    return map;
  }

  let accionesPopover = null;
  let accionesHorarioActual = null;

  function cerrarAccionesPopover() {
    if (!accionesPopover) return;
    accionesPopover.classList.remove('show');
    accionesPopover.style.display = 'none';
  }

  function crearAccionesPopover() {
    if (accionesPopover) return accionesPopover;
    accionesPopover = document.createElement('div');
    accionesPopover.className = 'admin-horario-actions-popover';
    document.body.appendChild(accionesPopover);

    document.addEventListener('click', (e) => {
      if (!accionesPopover) return;
      if (accionesPopover.contains(e.target)) return;
      if (e.target.closest('.admin-horario-card')) return;
      cerrarAccionesPopover();
    });

    window.addEventListener('scroll', () => {
      cerrarAccionesPopover();
    });

    window.addEventListener('resize', () => {
      cerrarAccionesPopover();
    });

    return accionesPopover;
  }

  function abrirAccionesHorario(horario, cardEl) {
    if (!horario || !cardEl) return;
    const pop = crearAccionesPopover();
    accionesHorarioActual = horario;

    const dia = horario.dia_semana || state.diaActual;
    const nombreDia = typeof window.nombreDia === 'function'
      ? window.nombreDia(parseInt(dia, 10) || 1)
      : `Día ${dia}`;

    const horaInicio = typeof horario.hora_inicio === 'string'
      ? horario.hora_inicio.substring(0, 5)
      : horario.hora_inicio;
    const horaFin = typeof horario.hora_fin === 'string'
      ? horario.hora_fin.substring(0, 5)
      : horario.hora_fin;

    const materiaTxt = horario.materia || '';
    const aula = horario.aula || '';
    const docente = horario.docente || '';
    const { codigo, grupoCodigo } = splitMateria(horario.materia);
    const rangoTexto = `${horaInicio || '--:--'} - ${horaFin || '--:--'}`;

    pop.innerHTML = `
      <div class="admin-horario-actions-header">
        <div class="admin-horario-actions-header-main">
          <div class="admin-horario-actions-title">${escapeHtml(materiaTxt || 'Materia')}</div>
          <div class="admin-horario-actions-subtitle">${escapeHtml(nombreDia)} · ${escapeHtml(rangoTexto)} · ${escapeHtml(aula || '-')}</div>
        </div>
        <button type="button" class="admin-horario-actions-close" aria-label="Cerrar">&times;</button>
      </div>
      <div class="admin-horario-actions-details">
        <div class="admin-horario-actions-detail-row">
          <span class="admin-horario-actions-detail-label">Código</span>
          <span class="admin-horario-actions-detail-value">${escapeHtml(codigo || '—')}</span>
        </div>
        <div class="admin-horario-actions-detail-row">
          <span class="admin-horario-actions-detail-label">Grupo</span>
          <span class="admin-horario-actions-detail-value">${escapeHtml(grupoCodigo || '—')}</span>
        </div>
        <div class="admin-horario-actions-detail-row">
          <span class="admin-horario-actions-detail-label">Docente</span>
          <span class="admin-horario-actions-detail-value">${escapeHtml(docente || '—')}</span>
        </div>
        <div class="admin-horario-actions-detail-row">
          <span class="admin-horario-actions-detail-label">Aula</span>
          <span class="admin-horario-actions-detail-value">${escapeHtml(aula || '—')}</span>
        </div>
        <div class="admin-horario-actions-detail-row">
          <span class="admin-horario-actions-detail-label">Horario</span>
          <span class="admin-horario-actions-detail-value">${escapeHtml(rangoTexto)}</span>
        </div>
      </div>
      <div class="admin-horario-actions-buttons">
        <button type="button" class="btn btn-secondary btn-sm" data-action="nuevo">Nuevo en este bloque</button>
        <button type="button" class="btn btn-primary btn-sm" data-action="editar">Editar horario</button>
        <button type="button" class="btn btn-secondary btn-sm admin-btn-danger" data-action="eliminar">Eliminar</button>
      </div>
    `;

    const rect = cardEl.getBoundingClientRect();
    pop.style.visibility = 'hidden';
    pop.classList.add('show');
    pop.style.display = 'block';

    const popRect = pop.getBoundingClientRect();
    let top = rect.bottom + 8;
    if (top + popRect.height + 8 > window.innerHeight) {
      top = rect.top - popRect.height - 8;
    }
    const baseCenter = rect.left + rect.width / 2;
    const padding = 12;
    const halfWidth = popRect.width / 2;
    const minCenter = padding + halfWidth;
    const maxCenter = window.innerWidth - padding - halfWidth;
    const center = Math.max(minCenter, Math.min(baseCenter, maxCenter));

    pop.style.top = `${Math.max(8, top)}px`;
    pop.style.left = `${center}px`;
    pop.style.visibility = 'visible';

    const closeBtn = pop.querySelector('.admin-horario-actions-close');
    if (closeBtn) {
      closeBtn.onclick = () => {
        cerrarAccionesPopover();
      };
    }

    const btnNuevo = pop.querySelector('[data-action="nuevo"]');
    const btnEditar = pop.querySelector('[data-action="editar"]');
    const btnEliminar = pop.querySelector('[data-action="eliminar"]');

    if (btnNuevo) {
      btnNuevo.onclick = () => {
        const slotIndex = getSlotIndexForHoraInicio(horario.hora_inicio);
        const aulaLocal = horario.aula || '';
        cerrarAccionesPopover();
        abrirModalCrearHorario(aulaLocal, slotIndex >= 0 ? slotIndex : 0);
      };
    }

    if (btnEditar) {
      btnEditar.onclick = () => {
        cerrarAccionesPopover();
        abrirModalEditarHorario(horario);
      };
    }

    if (btnEliminar) {
      btnEliminar.onclick = () => {
        cerrarAccionesPopover();
        abrirModalEditarHorario(horario);
      };
    }
  }

  function attachCellEvents() {
    if (!els.columns) return;
    let lastHoverCard = null;

    els.columns.querySelectorAll('.admin-horarios-cell').forEach(cell => {
      cell.addEventListener('click', (event) => {
        const aula = cell.dataset.aula || '';
        const slotIndex = parseInt(cell.dataset.slotIndex || '0', 10) || 0;
        const cardEl = event.target.closest('.admin-horario-card');
        if (cardEl) {
          const id = parseInt(cardEl.dataset.horarioId || '0', 10);
          const horario = state.horarios.find(h => h.id === id);
          if (horario) {
            event.stopPropagation();
            cerrarAccionesPopover();
            abrirAccionesHorario(horario, cardEl);
          }
          return;
        }
        abrirModalCrearHorario(aula, slotIndex);
      });

      cell.addEventListener('mousemove', (event) => {
        const cardEl = event.target.closest('.admin-horario-card');
        if (!cardEl) return;

        if (lastHoverCard && lastHoverCard !== cardEl) {
          lastHoverCard.classList.remove('is-hover');
        }
        lastHoverCard = cardEl;
        cardEl.classList.add('is-hover');

        const id = parseInt(cardEl.dataset.horarioId || '0', 10);
        const horario = state.horarios.find(h => h.id === id);
        if (horario) updateInsightPanel(horario);
      });

      cell.addEventListener('mouseleave', () => {
        if (lastHoverCard) {
          lastHoverCard.classList.remove('is-hover');
          lastHoverCard = null;
        }
        // Dejamos el último detalle de texto visible en el panel
      });
    });
  }

  function renderGrid() {
    if (!els.columns) return;

    const aulas = state.aulas || [];
    if (!aulas.length) {
      els.columns.innerHTML = `
        <div class="admin-horarios-empty">
          No hay aulas registradas para este día en los horarios cargados.
        </div>
      `;
      return;
    }

    const filas = TIME_SLOTS.length;
    const map = mapHorariosToCells(aulas);

    const colsHtml = aulas.map((row) => {
      const nombreAula = (row.aula || '').trim() || 'Aula';
      let celdas = '';
      for (let i = 0; i < filas; i++) {
        const key = `${nombreAula}__${i}`;
        const items = map.get(key) || [];
        const cardsHtml = items.map(h => renderHorarioCard(h)).join('');
        celdas += `
          <div class="admin-horarios-cell" data-aula="${escapeHtml(nombreAula)}" data-slot-index="${i}">
            ${cardsHtml}
          </div>
        `;
      }
      return `
        <div class="admin-horarios-column">
          <div class="day-header admin-aula-header">${escapeHtml(nombreAula)}</div>
          ${celdas}
        </div>
      `;
    }).join('');

    els.columns.innerHTML = colsHtml;
    attachCellEvents();
  }

  async function fetchAulas(dia) {
    try {
      const res = await fetch(`/api/horarios/aulas?dia=${dia}`, { credentials: 'include' });
      if (!res.ok) {
        console.error('Error al obtener aulas para el día', dia, res.status);
        return [];
      }
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Error de red al obtener aulas por día:', err);
      return [];
    }
  }

  async function fetchHorariosDia(dia) {
    try {
      const res = await fetch(`/api/horarios/dia/${dia}`, { credentials: 'include' });
      if (!res.ok) {
        console.error('Error al obtener horarios para el día', dia, res.status);
        return [];
      }
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Error de red al obtener horarios por día:', err);
      return [];
    }
  }

  async function cargarHorariosAdmin() {
    renderTimes();
    const dia = state.diaActual;
    const [aulas, horarios] = await Promise.all([
      fetchAulas(dia),
      fetchHorariosDia(dia),
    ]);

    state.aulas = aulas;
    state.horarios = horarios;
    state.cargado = true;

    renderGrid();

    // Actualizar etiqueta de día en el panel de detalle
    if (els.insightDia) {
      const nombreDia = typeof window.nombreDia === 'function'
        ? window.nombreDia(state.diaActual)
        : `Día ${state.diaActual}`;
      els.insightDia.textContent = `Día actual: ${nombreDia}`;
    }

    // Pequeño parpadeo cuando se recargan los horarios (cambio de día o CRUD)
    const wrapper = document.querySelector('.admin-horarios-wrapper');
    if (wrapper) {
      wrapper.classList.remove('admin-day-changed');
      void wrapper.offsetWidth; // reflow para reiniciar la animación
      wrapper.classList.add('admin-day-changed');
    }
  }

  function abrirModalCrearHorario(aula, slotIndex) {
    if (!els.modal) return;

    const titleEl = document.getElementById('adminHorarioModalTitle');
    if (titleEl) titleEl.textContent = 'Agregar horario de aula';

    if (els.inputId) els.inputId.value = '';
    if (els.inputDia) els.inputDia.value = String(state.diaActual);
    if (els.inputSlotIndex) els.inputSlotIndex.value = String(slotIndex);
    if (els.inputAula) els.inputAula.value = aula || '';

    const rango = getSlotRange(slotIndex);
    if (els.inputHoraInicio) els.inputHoraInicio.value = rango.start;
    if (els.inputHoraFin) els.inputHoraFin.value = rango.end;

    if (els.inputMateria) els.inputMateria.value = '';
    if (els.inputGrupo) els.inputGrupo.value = '';
    if (els.inputDocente) els.inputDocente.value = '';

    // Resumen y etiqueta de día solo vista
    const nombreDia = typeof window.nombreDia === 'function'
      ? window.nombreDia(state.diaActual)
      : `Día ${state.diaActual}`;
    if (els.resumen) {
      els.resumen.textContent = `${nombreDia} • ${rango.start} - ${rango.end}`;
    }
    if (els.diaLabel) {
      els.diaLabel.value = nombreDia;
    }

    if (els.deleteBtn) els.deleteBtn.style.display = 'none';
    if (typeof ocultarMensaje === 'function' && els.message) ocultarMensaje(els.message);

    if (typeof mostrarModal === 'function') {
      mostrarModal(els.modal);
    } else {
      els.modal.classList.add('show');
      els.modal.setAttribute('aria-hidden', 'false');
    }
  }

  function abrirModalEditarHorario(horario) {
    if (!els.modal) return;

    const titleEl = document.getElementById('adminHorarioModalTitle');
    if (titleEl) titleEl.textContent = 'Editar horario de aula';

    const slotIndex = getSlotIndexForHoraInicio(horario.hora_inicio);

    if (els.inputId) els.inputId.value = String(horario.id);
    const dia = horario.dia_semana || state.diaActual;
    if (els.inputDia) els.inputDia.value = String(dia);
    if (els.inputSlotIndex) els.inputSlotIndex.value = String(slotIndex >= 0 ? slotIndex : 0);
    if (els.inputAula) els.inputAula.value = horario.aula || '';

    // Separar materia en código + grupo/código para editar
    const { codigo, grupoCodigo } = splitMateria(horario.materia);
    if (els.inputMateria) els.inputMateria.value = codigo || horario.materia || '';
    if (els.inputGrupo) els.inputGrupo.value = grupoCodigo || '';
    if (els.inputDocente) els.inputDocente.value = horario.docente || '';

    const horaInicio = typeof horario.hora_inicio === 'string'
      ? horario.hora_inicio.substring(0, 5)
      : horario.hora_inicio;
    const horaFin = typeof horario.hora_fin === 'string'
      ? horario.hora_fin.substring(0, 5)
      : horario.hora_fin;

    if (els.inputHoraInicio) els.inputHoraInicio.value = horaInicio || '';
    if (els.inputHoraFin) els.inputHoraFin.value = horaFin || '';

    const nombreDia = typeof window.nombreDia === 'function'
      ? window.nombreDia(parseInt(dia, 10) || 1)
      : `Día ${dia}`;
    if (els.resumen) {
      els.resumen.textContent = `${nombreDia} • ${horaInicio || '--:--'} - ${horaFin || '--:--'}`;
    }
    if (els.diaLabel) {
      els.diaLabel.value = nombreDia;
    }

    if (els.deleteBtn) els.deleteBtn.style.display = '';
    if (typeof ocultarMensaje === 'function' && els.message) ocultarMensaje(els.message);

    if (typeof mostrarModal === 'function') {
      mostrarModal(els.modal);
    } else {
      els.modal.classList.add('show');
      els.modal.setAttribute('aria-hidden', 'false');
    }
  }

  async function guardarHorarioDesdeModal(event) {
    event.preventDefault();
    if (!els.form) return;

    const id = els.inputId ? parseInt(els.inputId.value || '0', 10) : 0;
    const aula = els.inputAula ? els.inputAula.value.trim() : '';
    const materiaBase = els.inputMateria ? els.inputMateria.value.trim() : '';
    const grupoCodigo = els.inputGrupo ? els.inputGrupo.value.trim() : '';
    const docente = els.inputDocente ? els.inputDocente.value.trim() : '';
    const hora_inicio = els.inputHoraInicio ? els.inputHoraInicio.value : '';
    const hora_fin = els.inputHoraFin ? els.inputHoraFin.value : '';
    const dia_semana = state.diaActual;

    if (!aula || !materiaBase || !docente || !hora_inicio || !hora_fin) {
      if (typeof mostrarMensaje === 'function' && els.message) {
        mostrarMensaje(els.message, 'error', 'Todos los campos son obligatorios');
      }
      return;
    }

    // Mantener el mismo formato que el JSON original: "LABFIS100 GL39"
    const materia = grupoCodigo
      ? `${materiaBase} ${grupoCodigo}`.trim()
      : materiaBase;

    const payload = {
      dia_semana,
      aula,
      materia,
      docente,
      hora_inicio,
      hora_fin,
    };

    const isEdit = !!id;
    const url = isEdit ? `/api/horarios/${id}` : '/api/horarios';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error('Error al guardar horario admin:', res.status, data);
        if (typeof mostrarMensaje === 'function' && els.message) {
          mostrarMensaje(els.message, 'error', data.message || 'Error al guardar horario');
        }
        return;
      }

      if (typeof mostrarMensaje === 'function' && els.message) {
        mostrarMensaje(els.message, 'success', `Horario ${isEdit ? 'actualizado' : 'creado'} correctamente`);
      }

      await cargarHorariosAdmin();

      setTimeout(() => {
        if (typeof cerrarModal === 'function') {
          cerrarModal(els.modal);
        } else if (els.modal) {
          els.modal.classList.remove('show');
          els.modal.setAttribute('aria-hidden', 'true');
        }
        if (typeof ocultarMensaje === 'function' && els.message) ocultarMensaje(els.message);
      }, 700);
    } catch (err) {
      console.error('Error de red al guardar horario admin:', err);
      if (typeof mostrarMensaje === 'function' && els.message) {
        mostrarMensaje(els.message, 'error', 'Error de red al guardar horario');
      }
    }
  }

  async function eliminarHorarioDesdeModal() {
    if (!els.inputId) return;
    const id = parseInt(els.inputId.value || '0', 10);
    if (!id) return;

    try {
      const res = await fetch(`/api/horarios/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error('Error al eliminar horario admin:', res.status, data);
        if (typeof mostrarMensaje === 'function' && els.message) {
          mostrarMensaje(els.message, 'error', data.message || 'Error al eliminar horario');
        }
        return;
      }

      if (typeof mostrarMensaje === 'function' && els.message) {
        mostrarMensaje(els.message, 'success', 'Horario eliminado correctamente');
      }

      await cargarHorariosAdmin();

      setTimeout(() => {
        if (typeof cerrarModal === 'function') {
          cerrarModal(els.modal);
        } else if (els.modal) {
          els.modal.classList.remove('show');
          els.modal.setAttribute('aria-hidden', 'true');
        }
        if (typeof ocultarMensaje === 'function' && els.message) ocultarMensaje(els.message);
      }, 600);
    } catch (err) {
      console.error('Error de red al eliminar horario admin:', err);
      if (typeof mostrarMensaje === 'function' && els.message) {
        mostrarMensaje(els.message, 'error', 'Error de red al eliminar horario');
      }
    }
  }

  function syncVisibilityWithSection() {
    const params = new URLSearchParams(window.location.search);
    const section = params.get('section');
    const show = section === 'horarios';

    if (els.section) els.section.hidden = !show;

    if (show && !state.cargado) {
      cargarHorariosAdmin().catch(err => console.error('Error en admin horarios:', err));
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!els.section) return;

    if (els.diaSelect) {
      els.diaSelect.addEventListener('change', () => {
        const value = parseInt(els.diaSelect.value, 10) || 1;
        state.diaActual = value;
        state.cargado = false; // Forzar recarga al cambiar de día
        cargarHorariosAdmin().catch(err => console.error('Error al recargar horarios admin:', err));
      });
    }

    if (els.form) {
      els.form.addEventListener('submit', guardarHorarioDesdeModal);
    }

    if (els.deleteBtn) {
      els.deleteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        eliminarHorarioDesdeModal().catch(err => console.error('Error al eliminar horario admin:', err));
      });
    }

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
})();
