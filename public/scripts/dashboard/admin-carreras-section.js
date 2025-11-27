(() => {
  const els = {
    section: document.getElementById('adminCarrerasSection'),
    schedule: document.querySelector('.dashboard-container'),
    searchInput: document.getElementById('carrerasSearchInput'),
    btnNuevaCarrera: document.getElementById('btnNuevaCarreraModal'),
    list: document.getElementById('carrerasList'),
    inlineMessage: document.getElementById('carrerasInlineMessage'),
    pagination: document.getElementById('carrerasPagination'),
    // Modales reutilizados
    carreraFormModal: document.getElementById('carreraFormModal'),
    confirmDeleteCarreraModal: document.getElementById('confirmDeleteCarreraModal'),
    carreraForm: document.getElementById('carreraForm'),
    carreraMessage: document.getElementById('carreraMessage'),
    carreraNombre: document.getElementById('carrera_nombre'),
    carreraId: document.getElementById('carrera_id'),
    btnConfirmDeleteCarrera: document.getElementById('btnConfirmDeleteCarrera'),
    confirmDeleteCarreraText: document.getElementById('confirmDeleteCarreraText'),
    confirmDeleteCarreraMessage: document.getElementById('confirmDeleteCarreraMessage'),
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
    const show = section === 'carreras';

    if (els.section) els.section.hidden = !show;

    if (show) {
      if (typeof window.markActiveHeaderLink === 'function') {
        window.markActiveHeaderLink();
      }
      if (!state.items.length) {
        fetchCarreras().catch(console.warn);
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

  async function fetchCarreras() {
    try {
      clearInlineMessage();
      const res = await fetch('/api/carreras', { credentials: 'include' });
      if (!res.ok) throw new Error('No se pudo obtener carreras');
      const data = await res.json();
      state.items = Array.isArray(data) ? data : [];
      applyFilters();
      return state.items;
    } catch (err) {
      console.error('Error al cargar carreras:', err);
      setInlineMessage('error', 'Error al cargar carreras');
      if (els.list) {
        els.list.innerHTML = `
          <tr>
            <td colspan="3" style="text-align:center; padding: 24px; color: var(--muted);">
              No se pudieron cargar las carreras
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
      filtered = filtered.filter(c => (c.nombre || '').toLowerCase().includes(q));
    }
    state.filtered = filtered;
    state.page = 1;
    render();
  }

  function render() {
    if (!els.list) return;
    const start = (state.page - 1) * state.pageSize;
    const end = start + state.pageSize;
    const pageItems = state.filtered.slice(start, end);

    if (!pageItems.length) {
      els.list.innerHTML = `
        <tr>
          <td colspan="3" style="text-align:center; padding: 24px; color: var(--muted);">
            No hay carreras registradas
          </td>
        </tr>`;
    } else {
      els.list.innerHTML = pageItems
        .map((c, i) => `
          <tr>
            <td>${start + i + 1}</td>
            <td>${escapeHtml(c.nombre || '')}</td>
            <td class="actions">
              <button type="button" class="btn btn-primary" data-edit-carrera="${c.id}" data-nombre="${escapeHtml(c.nombre || '')}">Editar</button>
              <button type="button" class="btn btn-danger" data-delete-carrera="${c.id}" data-nombre="${escapeHtml(c.nombre || '')}">Eliminar</button>
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

  wireClose(els.carreraFormModal);
  wireClose(els.confirmDeleteCarreraModal);

  // Handlers básicos
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

  if (els.btnNuevaCarrera && els.carreraFormModal) {
    els.btnNuevaCarrera.addEventListener('click', () => {
      if (els.carreraId) els.carreraId.value = '';
      if (els.carreraNombre) els.carreraNombre.value = '';
      if (els.carreraMessage) {
        els.carreraMessage.style.display = 'none';
      }
      openModal(els.carreraFormModal);
      if (els.carreraNombre) {
        setTimeout(() => els.carreraNombre.focus(), 100);
      }
    });
  }

  if (els.list) {
    els.list.addEventListener('click', (e) => {
      const btnEdit = e.target.closest('[data-edit-carrera]');
      const btnDelete = e.target.closest('[data-delete-carrera]');
      if (btnEdit) {
        const id = parseInt(btnEdit.dataset.editCarrera || btnEdit.getAttribute('data-edit-carrera'), 10);
        const nombre = btnEdit.dataset.nombre || '';
        if (els.carreraId) els.carreraId.value = String(id);
        if (els.carreraNombre) els.carreraNombre.value = nombre;
        if (els.carreraMessage) els.carreraMessage.style.display = 'none';
        openModal(els.carreraFormModal);
        if (els.carreraNombre) {
          setTimeout(() => els.carreraNombre.focus(), 100);
        }
      }
      if (btnDelete) {
        const id = parseInt(btnDelete.dataset.deleteCarrera || btnDelete.getAttribute('data-delete-carrera'), 10);
        const nombre = btnDelete.dataset.nombre || '';
        state.deletingId = id;
        if (els.confirmDeleteCarreraText) {
          els.confirmDeleteCarreraText.textContent = `¿Deseas eliminar la carrera "${nombre}"?`;
        }
        if (els.confirmDeleteCarreraMessage) {
          els.confirmDeleteCarreraMessage.style.display = 'none';
        }
        openModal(els.confirmDeleteCarreraModal);
      }
    });
  }

  if (els.carreraForm) {
    els.carreraForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (els.carreraMessage) {
        els.carreraMessage.style.display = 'none';
      }
      const nombre = (els.carreraNombre?.value || '').trim();
      if (!nombre) {
        if (els.carreraMessage) {
          els.carreraMessage.textContent = 'El nombre de la carrera es obligatorio';
          els.carreraMessage.className = 'message error';
          els.carreraMessage.style.display = 'block';
        }
        if (els.carreraNombre) els.carreraNombre.focus();
        return;
      }
      const idVal = els.carreraId?.value;
      const isEdit = !!idVal;
      try {
        const res = await fetch(isEdit ? `/api/carreras/${idVal}` : '/api/carreras', {
          method: isEdit ? 'PUT' : 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (els.carreraMessage) {
            els.carreraMessage.textContent = data.message || `Error al ${isEdit ? 'actualizar' : 'crear'} carrera`;
            els.carreraMessage.className = 'message error';
            els.carreraMessage.style.display = 'block';
          }
          return;
        }
        if (els.carreraMessage) {
          els.carreraMessage.textContent = `Carrera ${isEdit ? 'actualizada' : 'creada'} correctamente`;
          els.carreraMessage.className = 'message success';
          els.carreraMessage.style.display = 'block';
        }
        await fetchCarreras();
        setTimeout(() => closeModal(els.carreraFormModal), 800);
      } catch (err) {
        console.error('Error al guardar carrera:', err);
        if (els.carreraMessage) {
          els.carreraMessage.textContent = 'Error de conexión. Por favor, intente nuevamente.';
          els.carreraMessage.className = 'message error';
          els.carreraMessage.style.display = 'block';
        }
      }
    });
  }

  if (els.btnConfirmDeleteCarrera) {
    els.btnConfirmDeleteCarrera.addEventListener('click', async () => {
      if (!state.deletingId) return;
      if (els.confirmDeleteCarreraMessage) {
        els.confirmDeleteCarreraMessage.style.display = 'none';
      }
      els.btnConfirmDeleteCarrera.disabled = true;
      els.btnConfirmDeleteCarrera.textContent = 'Eliminando...';
      try {
        const res = await fetch(`/api/carreras/${state.deletingId}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok && res.status !== 204) {
          if (els.confirmDeleteCarreraMessage) {
            els.confirmDeleteCarreraMessage.textContent = data.message || 'No se pudo eliminar la carrera';
            els.confirmDeleteCarreraMessage.className = 'message error';
            els.confirmDeleteCarreraMessage.style.display = 'block';
          }
          els.btnConfirmDeleteCarrera.disabled = false;
          els.btnConfirmDeleteCarrera.textContent = 'Eliminar';
          return;
        }
        if (els.confirmDeleteCarreraMessage) {
          els.confirmDeleteCarreraMessage.textContent = 'Carrera eliminada correctamente';
          els.confirmDeleteCarreraMessage.className = 'message success';
          els.confirmDeleteCarreraMessage.style.display = 'block';
        }
        await fetchCarreras();
        setTimeout(() => {
          closeModal(els.confirmDeleteCarreraModal);
          els.btnConfirmDeleteCarrera.disabled = false;
          els.btnConfirmDeleteCarrera.textContent = 'Eliminar';
          state.deletingId = null;
        }, 800);
      } catch (err) {
        console.error('Error al eliminar carrera:', err);
        if (els.confirmDeleteCarreraMessage) {
          els.confirmDeleteCarreraMessage.textContent = 'Error de conexión. Por favor, intente nuevamente.';
          els.confirmDeleteCarreraMessage.className = 'message error';
          els.confirmDeleteCarreraMessage.style.display = 'block';
        }
        els.btnConfirmDeleteCarrera.disabled = false;
        els.btnConfirmDeleteCarrera.textContent = 'Eliminar';
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    syncVisibilityWithSection();
    const params = new URLSearchParams(window.location.search);
    if (params.get('section') === 'carreras') {
      fetchCarreras().catch(console.warn);
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
