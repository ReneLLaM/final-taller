(() => {
  const API = {
    list: '/api/usuarios',
    create: '/api/usuarios',
    update: (id) => `/api/usuarios/${id}`,
    remove: (id) => `/api/usuarios/${id}`,
  };

  const state = {
    users: [],
    filtered: [],
    roleFilter: 'all',
    search: '',
    page: 1,
    pageSize: 10,
    deletingId: null,
    currentUserId: null,
  };

  const els = {
    section: document.getElementById('adminUsersRolesSection'),
    schedule: document.querySelector('.dashboard-container'),
    chips: Array.from(document.querySelectorAll('#adminUsersRolesSection .filter-chip')),
    searchInput: document.getElementById('usersSearchInput'),
    btnNuevo: document.getElementById('btnNuevoUsuario'),
    tbody: document.getElementById('usersTableBody'),
    pagination: document.getElementById('usersPagination'),
    modalForm: document.getElementById('userFormModal'),
    modalDelete: document.getElementById('confirmDeleteUserModal'),
    form: document.getElementById('userForm'),
    userId: document.getElementById('userId'),
    nombre: document.getElementById('nombre'),
    correo: document.getElementById('correo'),
    carrera: document.getElementById('carrera'),
    cu: document.getElementById('cu'),
    rol: document.getElementById('rol'),
    password: document.getElementById('password'),
    btnConfirmDelete: document.getElementById('btnConfirmDeleteUser'),
    userFormTitle: document.getElementById('userFormTitle'),
    userFormMessage: document.getElementById('userFormMessage'),
    confirmDeleteMessage: document.getElementById('confirmDeleteUserMessage'),
    // Carreras (admin)
    btnGestionCarreras: document.getElementById('btnGestionCarreras'),
    carrerasListModal: document.getElementById('carrerasListModal'),
    carreraFormModal: document.getElementById('carreraFormModal'),
    confirmDeleteCarreraModal: document.getElementById('confirmDeleteCarreraModal'),
    carrerasList: document.getElementById('carrerasList'),
    carreraForm: document.getElementById('carreraForm'),
    carreraMessage: document.getElementById('carreraMessage'),
    carreraNombre: document.getElementById('carrera_nombre'),
    carreraId: document.getElementById('carrera_id'),
    btnNuevaCarreraModal: document.getElementById('btnNuevaCarreraModal'),
    btnConfirmDeleteCarrera: document.getElementById('btnConfirmDeleteCarrera'),
    confirmDeleteCarreraText: document.getElementById('confirmDeleteCarreraText'),
    confirmDeleteCarreraMessage: document.getElementById('confirmDeleteCarreraMessage'),
  };

  // Mostrar/ocultar sección según la URL (SPA con dashboard.js)
  function syncVisibilityWithSection() {
    const params = new URLSearchParams(window.location.search);
    const section = params.get('section');
    const show = section === 'usuarios-roles';

    if (els.section) {
      els.section.hidden = !show;
    }
    if (els.schedule) {
      els.schedule.style.display = show ? 'none' : '';
    }
    if (show) {
      // Marcar header como activo
      if (typeof window.markActiveHeaderLink === 'function') {
        window.markActiveHeaderLink();
      }
      // Al entrar, cargar usuarios si aún no se hizo
      if (!state.users || state.users.length === 0) {
        fetchUsers().catch(console.warn);
      } else {
        render();
      }
    }
  }

  // ==========================
  // Carreras (admin)
  // ==========================

  async function fetchCarrerasAdmin() {
    try {
      const res = await fetch('/api/carreras', { credentials: 'include' });
      if (!res.ok) throw new Error('No se pudo obtener carreras');
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      renderCarrerasList(list);
      return list;
    } catch (err) {
      console.error('Error al cargar carreras:', err);
      showMessage(els.carreraMessage, 'error', 'Error al cargar carreras');
      if (els.carrerasList) {
        els.carrerasList.innerHTML = '<div style="padding: 16px; color: var(--muted);">No se pudieron cargar las carreras</div>';
      }
      return [];
    }
  }

  function renderCarrerasList(carreras) {
    if (!els.carrerasList) return;
    if (!Array.isArray(carreras) || carreras.length === 0) {
      els.carrerasList.innerHTML = '<div style="padding: 16px; color: var(--muted);">No hay carreras registradas</div>';
      return;
    }
    els.carrerasList.innerHTML = carreras
      .map(
        (c) => `
        <div class="carrera-item">
          <span class="carrera-nombre">${escapeHtml(c.nombre || '')}</span>
          <div class="actions">
            <button type="button" class="btn btn-primary" data-edit-carrera="${c.id}" data-nombre="${escapeHtml(c.nombre || '')}">Editar</button>
            <button type="button" class="btn btn-delete" data-delete-carrera="${c.id}" data-nombre="${escapeHtml(c.nombre || '')}">Eliminar</button>
          </div>
        </div>
      `
      )
      .join('');
  }

  // Utilidades de modal
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
  wireClose(els.modalForm);
  wireClose(els.modalDelete);
  wireClose(els.carrerasListModal);
  wireClose(els.carreraFormModal);
  wireClose(els.confirmDeleteCarreraModal);

  // Cargar usuarios
  async function fetchUsers() {
    const res = await fetch(API.list, { credentials: 'include' });
    if (!res.ok) throw new Error('No se pudo obtener usuarios');
    const data = await res.json();
    state.users = Array.isArray(data) ? data : (data.users || []);
    applyFilters();
  }

  // Filtros y búsqueda
  function applyFilters() {
    const raw = state.users.map(mapUserFromApi);
    let filtered = raw;
    if (state.roleFilter !== 'all') {
      filtered = filtered.filter(u => u.rol === state.roleFilter);
    }
    if (state.search) {
      const q = state.search.toLowerCase();
      filtered = filtered.filter(
        u => (u.nombre || '').toLowerCase().includes(q)
          || (u.correo || '').toLowerCase().includes(q)
          || (u.carrera || '').toLowerCase().includes(q)
      );
    }
    state.filtered = filtered;
    state.page = 1;
    render();
  }

  function mapUserFromApi(u) {
    const roleMap = { 1: 'student', 2: 'assistant', 3: 'admin' };
    return {
      id: u.id,
      nombre: u.nombre_completo || u.nombre || '',
      correo: u.correo || '',
      carrera: u.carrera || '',
      cu: u.cu || '',
      rol: roleMap[u.rol_id] || u.rol || 'student',
    };
  }

  // Render tabla y paginación
  function render() {
    const start = (state.page - 1) * state.pageSize;
    const end = start + state.pageSize;
    const pageItems = state.filtered.slice(start, end);

    if (pageItems.length === 0) {
      els.tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 40px; color: var(--muted);">
            No se encontraron usuarios
          </td>
        </tr>
      `;
    } else {
      els.tbody.innerHTML = pageItems.map((u, i) => `
        <tr>
          <td>${start + i + 1}</td>
          <td><strong>${escapeHtml(u.nombre || 'Sin nombre')}</strong></td>
          <td>${escapeHtml(u.correo || '—')}</td>
          <td>${escapeHtml(u.carrera || '—')}</td>
          <td><span class="pill-role ${u.rol}">${roleLabel(u.rol)}</span></td>
          <td class="actions">
            <button class="btn btn-primary" data-edit="${u.id}">Editar</button>
            <button class="btn btn-danger" data-delete="${u.id}">Eliminar</button>
          </td>
        </tr>
      `).join('');
    }

    els.pagination.innerHTML = buildPagination(state.filtered.length, state.page, state.pageSize);
  }

  function roleLabel(code) {
    const labels = {
      'admin': 'Administrador',
      'assistant': 'Auxiliar',
      'student': 'Estudiante'
    };
    return labels[code] || 'Estudiante';
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
    
    // Botón anterior
    html += `<button class="page-btn" data-page="${page - 1}" ${page === 1 ? 'disabled' : ''}>‹</button>`;
    
    // Primera página si no está visible
    if (startPage > 1) {
      html += `<button class="page-btn" data-page="1">1</button>`;
      if (startPage > 2) {
        html += `<span style="padding: 8px; color: var(--muted);">...</span>`;
      }
    }
    
    // Páginas visibles
    for (let p = startPage; p <= endPage; p++) {
      html += `<button class="page-btn ${p === page ? 'active' : ''}" data-page="${p}">${p}</button>`;
    }
    
    // Última página si no está visible
    if (endPage < pages) {
      if (endPage < pages - 1) {
        html += `<span style="padding: 8px; color: var(--muted);">...</span>`;
      }
      html += `<button class="page-btn" data-page="${pages}">${pages}</button>`;
    }
    
    // Botón siguiente
    html += `<button class="page-btn" data-page="${page + 1}" ${page === pages ? 'disabled' : ''}>›</button>`;
    
    return html;
  }

  // Handlers
  els.chips.forEach(chip => {
    chip.addEventListener('click', () => {
      els.chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.roleFilter = chip.dataset.role || 'all';
      applyFilters();
    });
  });

  if (els.searchInput) {
    els.searchInput.addEventListener('input', (e) => {
      state.search = e.target.value.trim();
      applyFilters();
    });
  }

  if (els.pagination) {
    els.pagination.addEventListener('click', (e) => {
      const p = e.target.closest('[data-page]');
      if (!p) return;
      state.page = parseInt(p.dataset.page, 10) || 1;
      render();
    });
  }

  if (els.btnNuevo) {
    els.btnNuevo.addEventListener('click', () => {
      els.userId.value = '';
      els.nombre.value = '';
      els.correo.value = '';
      els.carrera.value = '';
      if (els.cu) els.cu.value = '';
      els.rol.value = 'student';
      if (els.password) els.password.value = '';
      els.userFormTitle.textContent = 'Nuevo usuario';
      clearMessage(els.userFormMessage);
      // Enfocar el primer campo
      setTimeout(() => {
        if (els.nombre) els.nombre.focus();
      }, 100);
      openModal(els.modalForm);
    });
  }

  // Abrir gestión de carreras
  if (els.btnGestionCarreras && els.carrerasListModal) {
    els.btnGestionCarreras.addEventListener('click', async () => {
      clearMessage(els.carreraMessage);
      openModal(els.carrerasListModal);
      await fetchCarrerasAdmin();
    });
  }

  // Botón "Nueva carrera" dentro de la lista
  if (els.btnNuevaCarreraModal && els.carreraFormModal) {
    els.btnNuevaCarreraModal.addEventListener('click', () => {
      if (els.carreraId) els.carreraId.value = '';
      if (els.carreraNombre) els.carreraNombre.value = '';
      clearMessage(els.carreraMessage);
      openModal(els.carreraFormModal);
    });
  }

  if (els.tbody) {
    els.tbody.addEventListener('click', (e) => {
      const btnEdit = e.target.closest('[data-edit]');
      const btnDelete = e.target.closest('[data-delete]');
      if (btnEdit) {
        const id = parseInt(btnEdit.dataset.edit, 10);
        // Buscar en todos los usuarios, no solo en los filtrados
        const user = state.users.find(u => u.id === id) || state.filtered.find(u => u.id === id);
        if (!user) {
          console.error('Usuario no encontrado:', id);
          return;
        }
        const mappedUser = mapUserFromApi(user);
        els.userId.value = String(mappedUser.id);
        els.nombre.value = mappedUser.nombre || '';
        els.correo.value = mappedUser.correo || '';
        els.carrera.value = mappedUser.carrera || '';
        if (els.cu) els.cu.value = mappedUser.cu || '';
        els.rol.value = mappedUser.rol || 'student';
        if (els.password) els.password.value = '';
        els.userFormTitle.textContent = 'Editar usuario';
        clearMessage(els.userFormMessage);
        // Enfocar el primer campo
        setTimeout(() => {
          if (els.nombre) els.nombre.focus();
        }, 100);
        openModal(els.modalForm);
      }
      if (btnDelete) {
        state.deletingId = parseInt(btnDelete.dataset.delete, 10);
        clearMessage(els.confirmDeleteMessage);
        openModal(els.modalDelete);
      }
    });
  }

  if (els.form) {
    els.form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearMessage(els.userFormMessage);
      
      // Validaciones
      const nombre = els.nombre.value.trim();
      const correo = els.correo.value.trim();
      const carrera = els.carrera.value.trim() || null;
      const cu = els.cu ? els.cu.value.trim() || null : null;
      const rol = els.rol.value;
      const password = els.password ? els.password.value : '';
      
      if (!nombre) {
        showMessage(els.userFormMessage, 'error', 'El nombre es obligatorio');
        els.nombre.focus();
        return;
      }
      
      if (nombre.length < 3) {
        showMessage(els.userFormMessage, 'error', 'El nombre debe tener al menos 3 caracteres');
        els.nombre.focus();
        return;
      }
      
      if (!correo) {
        showMessage(els.userFormMessage, 'error', 'El correo es obligatorio');
        els.correo.focus();
        return;
      }
      
      // Validar formato de correo básico
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(correo)) {
        showMessage(els.userFormMessage, 'error', 'Ingrese un correo electrónico válido');
        els.correo.focus();
        return;
      }
      
      if (!rol) {
        showMessage(els.userFormMessage, 'error', 'Debe seleccionar un rol');
        els.rol.focus();
        return;
      }
      
      const payload = {
        nombre_completo: nombre,
        correo: correo,
        carrera: carrera,
        cu: cu,
        rol_id: rolIdFromCode(rol),
      };
      
      const idVal = els.userId.value;
      const isEdit = !!idVal;

      // Manejo de contraseña:
      // - Crear: contraseña obligatoria, min 6 caracteres
      // - Editar: si el campo está vacío, no se envía y se mantiene la anterior
      if (!isEdit) {
        if (!password) {
          showMessage(els.userFormMessage, 'error', 'La contraseña es obligatoria para nuevos usuarios');
          if (els.password) els.password.focus();
          return;
        }
        if (password.length < 6) {
          showMessage(els.userFormMessage, 'error', 'La contraseña debe tener al menos 6 caracteres');
          if (els.password) els.password.focus();
          return;
        }
        payload.contrasenia = password;
      } else if (password) {
        if (password.length < 6) {
          showMessage(els.userFormMessage, 'error', 'La nueva contraseña debe tener al menos 6 caracteres');
          if (els.password) els.password.focus();
          return;
        }
        payload.contrasenia = password;
      }
      
      try {
        const res = await fetch(idVal ? API.update(idVal) : API.create, {
          method: idVal ? 'PUT' : 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          showMessage(els.userFormMessage, 'error', data.message || `Error al ${isEdit ? 'actualizar' : 'crear'} usuario`);
          return;
        }
        showMessage(els.userFormMessage, 'success', `Usuario ${isEdit ? 'actualizado' : 'creado'} correctamente`);
        await fetchUsers();
        setTimeout(() => closeModal(els.modalForm), 1000);
      } catch (err) {
        console.error('Error:', err);
        showMessage(els.userFormMessage, 'error', 'Error de conexión. Por favor, intente nuevamente.');
      }
    });
  }

  if (els.btnConfirmDelete) {
    els.btnConfirmDelete.addEventListener('click', async () => {
      clearMessage(els.confirmDeleteMessage);
      if (!state.deletingId) return;
      
      // Deshabilitar botón mientras se procesa
      els.btnConfirmDelete.disabled = true;
      els.btnConfirmDelete.textContent = 'Eliminando...';
      
      try {
        const res = await fetch(API.remove(state.deletingId), {
          method: 'DELETE',
          credentials: 'include',
        });
        if (!res.ok && res.status !== 204) {
          const data = await res.json().catch(() => ({}));
          showMessage(els.confirmDeleteMessage, 'error', data.message || 'No se pudo eliminar el usuario');
          els.btnConfirmDelete.disabled = false;
          els.btnConfirmDelete.textContent = 'Eliminar';
          return;
        }
        showMessage(els.confirmDeleteMessage, 'success', 'Usuario eliminado correctamente');
        await fetchUsers();
        setTimeout(() => {
          closeModal(els.modalDelete);
          els.btnConfirmDelete.disabled = false;
          els.btnConfirmDelete.textContent = 'Eliminar';
          state.deletingId = null;
        }, 800);
      } catch (err) {
        console.error('Error:', err);
        showMessage(els.confirmDeleteMessage, 'error', 'Error de conexión. Por favor, intente nuevamente.');
        els.btnConfirmDelete.disabled = false;
        els.btnConfirmDelete.textContent = 'Eliminar';
      }
    });
  }

  function rolIdFromCode(code) {
    return code === 'admin' ? 3 : code === 'assistant' ? 2 : 1;
  }

  function showMessage(el, type, text) {
    if (!el) return;
    el.textContent = text;
    el.className = `message ${type}`;
    el.style.display = 'block';
  }
  function clearMessage(el) { if (el) el.style.display = 'none'; }

  function escapeHtml(str) {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  // Inicialización
  document.addEventListener('DOMContentLoaded', () => {
    syncVisibilityWithSection();
    // Si la sección está visible, cargar de inmediato
    const params = new URLSearchParams(window.location.search);
    if (params.get('section') === 'usuarios-roles') {
      fetchUsers().catch(() => {
        // fallback visual si la API falla
        state.users = Array.from({ length: 12 }).map((_, i) => ({
          id: i + 1,
          nombre_completo: `Usuario ${i + 1}`,
          correo: `usuario${i + 1}@gmail.com`,
          carrera: 'Ing. de Sistemas',
          rol_id: ((i % 3) + 1),
        }));
        applyFilters();
      });
      // Autocompletado de carrera en modal admin
      if (typeof window.initCarreraAutocomplete === 'function') {
        window.initCarreraAutocomplete('carrera', 'adminCarrerasList');
      }
    }
  });

  // Mantener sincronía al navegar con header (SPA)
  window.addEventListener('popstate', syncVisibilityWithSection);
  
  // Sincronizar cuando cambia la sección desde el dashboard
  const originalNavigate = window.navigateToSection;
  if (originalNavigate) {
    window.navigateToSection = function(section) {
      originalNavigate(section);
      setTimeout(() => {
        syncVisibilityWithSection();
      }, 100);
    };
  }
})();
