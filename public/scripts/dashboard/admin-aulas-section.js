(() => {
  const els = {
    section: document.getElementById('adminAulasSection'),
    schedule: document.querySelector('.dashboard-container'),
    searchInput: document.getElementById('aulasSearchInput'),
    btnNueva: document.getElementById('btnNuevaAula'),
    tbody: document.getElementById('aulasTableBody'),
    inlineMessage: document.getElementById('aulasInlineMessage'),
    pagination: document.getElementById('aulasPagination'),
    // Modales
    formModal: document.getElementById('aulaFormModal'),
    form: document.getElementById('aulaForm'),
    formMessage: document.getElementById('aulaMessage'),
    aulaId: document.getElementById('aula_id'),
    aulaSigla: document.getElementById('aula_sigla'),
    aulaCapacidad: document.getElementById('aula_capacidad'),
    confirmModal: document.getElementById('confirmDeleteAulaModal'),
    confirmText: document.getElementById('confirmDeleteAulaText'),
    confirmMessage: document.getElementById('confirmDeleteAulaMessage'),
    btnConfirmDelete: document.getElementById('btnConfirmDeleteAula'),
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
    const show = section === 'aulas';

    if (els.section) els.section.hidden = !show;
    if (els.schedule) els.schedule.style.display = show ? 'none' : '';

    if (show) {
      if (typeof window.markActiveHeaderLink === 'function') {
        window.markActiveHeaderLink();
      }
      if (!state.items.length) {
        fetchAulas().catch(console.warn);
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

  async function fetchAulas() {
    try {
      clearInlineMessage();
      const res = await fetch('/api/aulas');
      if (!res.ok) throw new Error('No se pudieron obtener aulas');
      const data = await res.json();
      state.items = Array.isArray(data) ? data : [];
      applyFilters();
      return state.items;
    } catch (err) {
      console.error('Error al cargar aulas:', err);
      setInlineMessage('error', 'Error al cargar aulas');
      if (els.tbody) {
        els.tbody.innerHTML = `
          <tr>
            <td colspan="4" style="text-align:center; padding: 24px; color: var(--muted);">
              No se pudieron cargar las aulas
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
      filtered = filtered.filter(a =>
        (a.sigla || '').toLowerCase().includes(q) ||
        String(a.capacidad || '').includes(q)
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
          <td colspan="4" style="text-align:center; padding: 24px; color: var(--muted);">
            No hay aulas registradas
          </td>
        </tr>`;
    } else {
      els.tbody.innerHTML = pageItems
        .map((a, i) => `
          <tr>
            <td>${start + i + 1}</td>
            <td>${escapeHtml(a.sigla || '')}</td>
            <td>${Number(a.capacidad) || ''}</td>
            <td class="actions">
              <button type="button" class="btn btn-primary" data-edit-aula="${a.id}">Editar</button>
              <button type="button" class="btn btn-danger" data-delete-aula="${a.id}">Eliminar</button>
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
      if (els.aulaId) els.aulaId.value = '';
      if (els.aulaSigla) els.aulaSigla.value = '';
      if (els.aulaCapacidad) els.aulaCapacidad.value = '';
      if (els.formMessage) els.formMessage.style.display = 'none';
      openModal(els.formModal);
      if (els.aulaSigla) {
        setTimeout(() => els.aulaSigla.focus(), 100);
      }
    });
  }

  if (els.tbody) {
    els.tbody.addEventListener('click', (e) => {
      const btnEdit = e.target.closest('[data-edit-aula]');
      const btnDelete = e.target.closest('[data-delete-aula]');
      if (btnEdit) {
        const id = parseInt(btnEdit.dataset.editAula || btnEdit.getAttribute('data-edit-aula'), 10);
        const aula = state.items.find(a => a.id === id);
        if (!aula) return;
        if (els.aulaId) els.aulaId.value = String(aula.id);
        if (els.aulaSigla) els.aulaSigla.value = aula.sigla || '';
        if (els.aulaCapacidad) els.aulaCapacidad.value = aula.capacidad != null ? String(aula.capacidad) : '';
        if (els.formMessage) els.formMessage.style.display = 'none';
        openModal(els.formModal);
        if (els.aulaSigla) {
          setTimeout(() => els.aulaSigla.focus(), 100);
        }
      }
      if (btnDelete) {
        const id = parseInt(btnDelete.dataset.deleteAula || btnDelete.getAttribute('data-delete-aula'), 10);
        const aula = state.items.find(a => a.id === id);
        state.deletingId = id;
        if (els.confirmText) {
          els.confirmText.textContent = aula
            ? `¿Deseas eliminar el aula "${aula.sigla}"?`
            : '¿Deseas eliminar esta aula?';
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
      const sigla = (els.aulaSigla?.value || '').trim();
      const capacidadStr = (els.aulaCapacidad?.value || '').trim();
      const capacidadNum = Number(capacidadStr);
      if (!sigla) {
        showFormError('La sigla es obligatoria');
        if (els.aulaSigla) els.aulaSigla.focus();
        return;
      }
      if (!Number.isInteger(capacidadNum) || capacidadNum <= 0) {
        showFormError('La capacidad debe ser un número entero positivo');
        if (els.aulaCapacidad) els.aulaCapacidad.focus();
        return;
      }
      const idVal = els.aulaId?.value;
      const isEdit = !!idVal;
      try {
        const res = await fetch(isEdit ? `/api/aulas/${idVal}` : '/api/aulas', {
          method: isEdit ? 'PUT' : 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sigla, capacidad: capacidadNum }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          showFormError(data.message || `Error al ${isEdit ? 'actualizar' : 'crear'} aula`);
          return;
        }
        showFormSuccess(`Aula ${isEdit ? 'actualizada' : 'creada'} correctamente`);
        await fetchAulas();
        setTimeout(() => closeModal(els.formModal), 800);
      } catch (err) {
        console.error('Error al guardar aula:', err);
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
        const res = await fetch(`/api/aulas/${state.deletingId}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok && res.status !== 204) {
          if (els.confirmMessage) {
            els.confirmMessage.textContent = data.message || 'No se pudo eliminar el aula';
            els.confirmMessage.className = 'message error';
            els.confirmMessage.style.display = 'block';
          }
          els.btnConfirmDelete.disabled = false;
          els.btnConfirmDelete.textContent = 'Eliminar';
          return;
        }
        if (els.confirmMessage) {
          els.confirmMessage.textContent = 'Aula eliminada correctamente';
          els.confirmMessage.className = 'message success';
          els.confirmMessage.style.display = 'block';
        }
        await fetchAulas();
        setTimeout(() => {
          closeModal(els.confirmModal);
          els.btnConfirmDelete.disabled = false;
          els.btnConfirmDelete.textContent = 'Eliminar';
          state.deletingId = null;
        }, 800);
      } catch (err) {
        console.error('Error al eliminar aula:', err);
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
    if (params.get('section') === 'aulas') {
      fetchAulas().catch(console.warn);
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
