(() => {
  const els = {
    section: document.getElementById('adminMateriasGlobalesSection'),
    schedule: document.querySelector('.dashboard-container'),
    searchInput: document.getElementById('materiasGlobalesSearchInput'),
    btnNueva: document.getElementById('btnNuevaMateriaGlobal'),
    tbody: document.getElementById('materiasGlobalesTableBody'),
    inlineMessage: document.getElementById('materiasGlobalesInlineMessage'),
    pagination: document.getElementById('materiasGlobalesPagination'),
    // Modales
    formModal: document.getElementById('materiaGlobalFormModal'),
    form: document.getElementById('materiaGlobalForm'),
    formMessage: document.getElementById('materiaGlobalMessage'),
    materiaId: document.getElementById('materia_global_id'),
    materiaNombre: document.getElementById('materia_global_nombre'),
    materiaSigla: document.getElementById('materia_global_sigla'),
    materiaColor: document.getElementById('materia_global_color'),
    confirmModal: document.getElementById('confirmDeleteMateriaGlobalModal'),
    confirmText: document.getElementById('confirmDeleteMateriaGlobalText'),
    confirmMessage: document.getElementById('confirmDeleteMateriaGlobalMessage'),
    btnConfirmDelete: document.getElementById('btnConfirmDeleteMateriaGlobal'),
  };

  const state = {
    items: [],
    filtered: [],
    search: '',
    page: 1,
    pageSize: 10,
    deletingId: null,
  };

  function syncVisibilityWithSection() {
    const params = new URLSearchParams(window.location.search);
    const section = params.get('section');
    const show = section === 'materias-globales';

    if (els.section) els.section.hidden = !show;
    if (els.schedule) els.schedule.style.display = show ? 'none' : '';

    if (show) {
      if (typeof window.markActiveHeaderLink === 'function') {
        window.markActiveHeaderLink();
      }
      if (!state.items.length) {
        fetchMaterias().catch(console.warn);
      } else {
        render();
      }
    }
  }

  function setInlineMessage(type, text) {
    if (!els.inlineMessage) return;
    if (!text) {
      els.inlineMessage.style.display = 'none';
      return;
    }
    els.inlineMessage.textContent = text;
    els.inlineMessage.className = `message ${type}`;
    els.inlineMessage.style.display = 'block';
  }

  function clearInlineMessage() {
    if (els.inlineMessage) els.inlineMessage.style.display = 'none';
  }

  async function fetchMaterias() {
    try {
      clearInlineMessage();
      const res = await fetch('/api/materias-globales', { credentials: 'include' });
      if (!res.ok) throw new Error('No se pudieron obtener materias globales');
      const data = await res.json();
      state.items = Array.isArray(data) ? data : [];
      applyFilters();
      return state.items;
    } catch (err) {
      console.error('Error al cargar materias globales:', err);
      setInlineMessage('error', 'Error al cargar materias');
      if (els.tbody) {
        els.tbody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align:center; padding: 24px; color: var(--muted);">
              No se pudieron cargar las materias
            </td>
          </tr>`;
      }
      return [];
    }
  }

  function applyFilters() {
    let filtered = state.items;
    if (state.search) {
      const q = state.search.toLowerCase();
      filtered = filtered.filter(m =>
        (m.nombre || '').toLowerCase().includes(q) ||
        (m.sigla || '').toLowerCase().includes(q)
      );
    }
    state.filtered = filtered;
    state.page = 1;
    render();
  }

  function render() {
    if (!els.tbody) return;
    const start = (state.page - 1) * state.pageSize;
    const end = start + state.pageSize;
    const pageItems = state.filtered.slice(start, end);

    if (!pageItems.length) {
      els.tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center; padding: 24px; color: var(--muted);">
            No hay materias registradas
          </td>
        </tr>`;
    } else {
      els.tbody.innerHTML = pageItems
        .map((m, i) => `
          <tr>
            <td>${start + i + 1}</td>
            <td><strong>${escapeHtml(m.nombre || '')}</strong></td>
            <td>${escapeHtml(m.sigla || '')}</td>
            <td>
              <div style="display:inline-flex; align-items:center; gap:8px;">
                <span style="display:inline-block; width:16px; height:16px; border-radius:999px; border:1px solid #E5E7EB; background:${escapeHtml(m.color || '#2196F3')};"></span>
                <span style="font-size:11px; color:#6B7280;">${escapeHtml(m.color || '')}</span>
              </div>
            </td>
            <td class="actions">
              <button type="button" class="btn btn-primary" data-edit-materia-global="${m.id}">Editar</button>
              <button type="button" class="btn btn-danger" data-delete-materia-global="${m.id}">Eliminar</button>
            </td>
          </tr>
        `)
        .join('');
    }

    if (els.pagination) {
      els.pagination.innerHTML = buildPagination(state.filtered.length, state.page, state.pageSize);
    }
  }

  function buildPagination(total, page, pageSize) {
    const pages = Math.max(1, Math.ceil(total / pageSize));
    if (pages <= 1) return '';
    let html = '';
    const maxButtons = 7;
    let startPage = Math.max(1, page - Math.floor(maxButtons / 2));
    let endPage = Math.min(pages, startPage + maxButtons - 1);
    if (endPage - startPage < maxButtons - 1) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }
    html += `<button class="page-btn" data-page="${page - 1}" ${page === 1 ? 'disabled' : ''}>‹</button>`;
    if (startPage > 1) {
      html += `<button class="page-btn" data-page="1">1</button>`;
      if (startPage > 2) {
        html += `<span style="padding: 8px; color: var(--muted);">...</span>`;
      }
    }
    for (let p = startPage; p <= endPage; p++) {
      html += `<button class="page-btn ${p === page ? 'active' : ''}" data-page="${p}">${p}</button>`;
    }
    if (endPage < pages) {
      if (endPage < pages - 1) {
        html += `<span style="padding: 8px; color: var(--muted);">...</span>`;
      }
      html += `<button class="page-btn" data-page="${pages}">${pages}</button>`;
    }
    html += `<button class="page-btn" data-page="${page + 1}" ${page === pages ? 'disabled' : ''}>›</button>`;
    return html;
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function openModal(modal) {
    if (!modal) return;
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
  }

  function wireClose(modal) {
    if (!modal) return;
    modal.addEventListener('click', (e) => {
      if (e.target.matches('[data-close-modal], .modal-close')) closeModal(modal);
    });
  }

  wireClose(els.formModal);
  wireClose(els.confirmModal);

  // Handlers
  if (els.searchInput) {
    els.searchInput.addEventListener('input', (e) => {
      state.search = e.target.value.trim();
      applyFilters();
    });
  }

  if (els.pagination) {
    els.pagination.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-page]');
      if (!btn) return;
      const p = parseInt(btn.dataset.page, 10) || 1;
      state.page = p;
      render();
    });
  }

  if (els.btnNueva && els.formModal) {
    els.btnNueva.addEventListener('click', () => {
      if (els.materiaId) els.materiaId.value = '';
      if (els.materiaNombre) els.materiaNombre.value = '';
      if (els.materiaSigla) els.materiaSigla.value = '';
      if (els.materiaColor) els.materiaColor.value = '#2196F3';
      if (els.formMessage) els.formMessage.style.display = 'none';
      openModal(els.formModal);
      if (els.materiaNombre) {
        setTimeout(() => els.materiaNombre.focus(), 100);
      }
    });
  }

  if (els.tbody) {
    els.tbody.addEventListener('click', (e) => {
      const btnEdit = e.target.closest('[data-edit-materia-global]');
      const btnDelete = e.target.closest('[data-delete-materia-global]');
      if (btnEdit) {
        const id = parseInt(btnEdit.dataset.editMateriaGlobal || btnEdit.getAttribute('data-edit-materia-global'), 10);
        const materia = state.items.find(m => m.id === id);
        if (!materia) return;
        if (els.materiaId) els.materiaId.value = String(materia.id);
        if (els.materiaNombre) els.materiaNombre.value = materia.nombre || '';
        if (els.materiaSigla) els.materiaSigla.value = materia.sigla || '';
        if (els.materiaColor) els.materiaColor.value = materia.color || '#2196F3';
        if (els.formMessage) els.formMessage.style.display = 'none';
        openModal(els.formModal);
        if (els.materiaNombre) {
          setTimeout(() => els.materiaNombre.focus(), 100);
        }
      }
      if (btnDelete) {
        const id = parseInt(btnDelete.dataset.deleteMateriaGlobal || btnDelete.getAttribute('data-delete-materia-global'), 10);
        const materia = state.items.find(m => m.id === id);
        state.deletingId = id;
        if (els.confirmText) {
          els.confirmText.textContent = materia
            ? `¿Deseas eliminar la materia "${materia.nombre}" (${materia.sigla})?`
            : '¿Deseas eliminar esta materia?';
        }
        if (els.confirmMessage) els.confirmMessage.style.display = 'none';
        openModal(els.confirmModal);
      }
    });
  }

  if (els.form) {
    els.form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (els.formMessage) els.formMessage.style.display = 'none';
      const nombre = (els.materiaNombre?.value || '').trim();
      const sigla = (els.materiaSigla?.value || '').trim();
      const color = (els.materiaColor?.value || '').trim();
      if (!nombre) {
        showFormError('El nombre es obligatorio');
        if (els.materiaNombre) els.materiaNombre.focus();
        return;
      }
      if (!sigla) {
        showFormError('La sigla es obligatoria');
        if (els.materiaSigla) els.materiaSigla.focus();
        return;
      }
      if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
        showFormError('El color debe ser un código HEX válido');
        if (els.materiaColor) els.materiaColor.focus();
        return;
      }
      const idVal = els.materiaId?.value;
      const isEdit = !!idVal;
      try {
        const res = await fetch(isEdit ? `/api/materias-globales/${idVal}` : '/api/materias-globales', {
          method: isEdit ? 'PUT' : 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre, sigla, color }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          showFormError(data.message || `Error al ${isEdit ? 'actualizar' : 'crear'} materia`);
          return;
        }
        showFormSuccess(`Materia ${isEdit ? 'actualizada' : 'creada'} correctamente`);
        await fetchMaterias();
        setTimeout(() => closeModal(els.formModal), 800);
      } catch (err) {
        console.error('Error al guardar materia global:', err);
        showFormError('Error de conexión. Por favor, intente nuevamente.');
      }
    });
  }

  function showFormError(msg) {
    if (!els.formMessage) return;
    els.formMessage.textContent = msg;
    els.formMessage.className = 'message error';
    els.formMessage.style.display = 'block';
  }

  function showFormSuccess(msg) {
    if (!els.formMessage) return;
    els.formMessage.textContent = msg;
    els.formMessage.className = 'message success';
    els.formMessage.style.display = 'block';
  }

  if (els.btnConfirmDelete) {
    els.btnConfirmDelete.addEventListener('click', async () => {
      if (!state.deletingId) return;
      if (els.confirmMessage) els.confirmMessage.style.display = 'none';
      els.btnConfirmDelete.disabled = true;
      els.btnConfirmDelete.textContent = 'Eliminando...';
      try {
        const res = await fetch(`/api/materias-globales/${state.deletingId}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok && res.status !== 204) {
          if (els.confirmMessage) {
            els.confirmMessage.textContent = data.message || 'No se pudo eliminar la materia';
            els.confirmMessage.className = 'message error';
            els.confirmMessage.style.display = 'block';
          }
          els.btnConfirmDelete.disabled = false;
          els.btnConfirmDelete.textContent = 'Eliminar';
          return;
        }
        if (els.confirmMessage) {
          els.confirmMessage.textContent = 'Materia eliminada correctamente';
          els.confirmMessage.className = 'message success';
          els.confirmMessage.style.display = 'block';
        }
        await fetchMaterias();
        setTimeout(() => {
          closeModal(els.confirmModal);
          els.btnConfirmDelete.disabled = false;
          els.btnConfirmDelete.textContent = 'Eliminar';
          state.deletingId = null;
        }, 800);
      } catch (err) {
        console.error('Error al eliminar materia global:', err);
        if (els.confirmMessage) {
          els.confirmMessage.textContent = 'Error de conexión. Por favor, intente nuevamente.';
          els.confirmMessage.className = 'message error';
          els.confirmMessage.style.display = 'block';
        }
        els.btnConfirmDelete.disabled = false;
        els.btnConfirmDelete.textContent = 'Eliminar';
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    syncVisibilityWithSection();
    const params = new URLSearchParams(window.location.search);
    if (params.get('section') === 'materias-globales') {
      fetchMaterias().catch(console.warn);
    }
  });

  window.addEventListener('popstate', syncVisibilityWithSection);

  const originalNavigate = window.navigateToSection;
  if (typeof originalNavigate === 'function') {
    window.navigateToSection = function (section) {
      originalNavigate(section);
      setTimeout(syncVisibilityWithSection, 100);
    };
  }
})();
