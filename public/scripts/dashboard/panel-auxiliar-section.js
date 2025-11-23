(() => {
  const els = {
    section: document.getElementById('panelAuxiliarSection'),
    materiasGrid: document.getElementById('auxMateriasGrid'),
  };

  const state = {
    materiasAsignadas: [],
    cargado: false,
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
        <div class="aux-materia-card">
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
          <button type="button" class="btn aux-materia-btn" data-ir-auxiliaturas="1">
            Administrar
          </button>
        </div>
      `;
    }).join('');

    els.materiasGrid.innerHTML = cardsHtml;

    // Botones "Administrar" navegan a Mis Auxiliaturas
    els.materiasGrid.querySelectorAll('[data-ir-auxiliaturas="1"]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (typeof window.navigateToSection === 'function') {
          window.navigateToSection('auxiliaturas');
        } else {
          window.location.href = 'principal.html?section=auxiliaturas';
        }
      });
    });
  }

  async function cargarPanelAuxiliar() {
    const materias = await fetchMateriasAsignadas();
    state.materiasAsignadas = materias;
    state.cargado = true;

    renderMateriasGrid(materias);
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
})();
