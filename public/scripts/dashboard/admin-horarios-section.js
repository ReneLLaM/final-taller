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
  };

  const state = {
    aulas: [],
    diaActual: 1,
    timesRendered: false,
    cargado: false,
  };

  function renderTimes() {
    if (!els.times || state.timesRendered) return;
    els.times.innerHTML = TIME_SLOTS.map(rango => `
      <div class="time-slot">${rango}</div>
    `).join('');
    state.timesRendered = true;
  }

  function renderAulas(aulas) {
    if (!els.columns) return;

    if (!aulas || aulas.length === 0) {
      els.columns.innerHTML = `
        <div class="admin-horarios-empty">
          No hay aulas registradas para este día en los horarios cargados.
        </div>
      `;
      return;
    }

    const filas = TIME_SLOTS.length;

    const colsHtml = aulas.map((row) => {
      const nombreAula = row.aula || 'Aula';
      const celdas = Array.from({ length: filas }).map(() => '<div class="admin-horarios-cell"></div>').join('');
      return `
        <div class="admin-horarios-column">
          <div class="day-header admin-aula-header">${nombreAula}</div>
          ${celdas}
        </div>
      `;
    }).join('');

    els.columns.innerHTML = colsHtml;
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

  async function cargarEncabezadosHorarios() {
    renderTimes();
    const dia = state.diaActual;
    const aulas = await fetchAulas(dia);
    state.aulas = aulas;
    state.cargado = true;
    renderAulas(aulas);
  }

  function syncVisibilityWithSection() {
    const params = new URLSearchParams(window.location.search);
    const section = params.get('section');
    const show = section === 'horarios';

    if (els.section) els.section.hidden = !show;
    if (els.schedule) els.schedule.style.display = show ? 'none' : '';

    if (show && !state.cargado) {
      cargarEncabezadosHorarios().catch(err => console.error('Error en admin horarios:', err));
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!els.section) return;

    if (els.diaSelect) {
      els.diaSelect.addEventListener('change', () => {
        const value = parseInt(els.diaSelect.value, 10) || 1;
        state.diaActual = value;
        state.cargado = false; // Forzar recarga al cambiar de día
        cargarEncabezadosHorarios().catch(err => console.error('Error al recargar aulas:', err));
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
