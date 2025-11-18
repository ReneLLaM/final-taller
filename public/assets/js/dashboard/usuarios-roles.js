(() => {
  const API_BASE = "/api/users";

  const state = {
    users: [],
    filtered: [],
    roleFilter: "all",
    search: "",
    page: 1,
    pageSize: 10,
    deletingId: null,
  };

  const el = {
    chips: Array.from(document.querySelectorAll(".filter-chip")),
    searchInput: document.getElementById("usersSearchInput"),
    btnNuevo: document.getElementById("btnNuevoUsuario"),
    tbody: document.getElementById("usersTableBody"),
    pagination: document.getElementById("usersPagination"),
    modalForm: document.getElementById("userFormModal"),
    modalDelete: document.getElementById("confirmDeleteUserModal"),
    form: document.getElementById("userForm"),
    userId: document.getElementById("userId"),
    nombre: document.getElementById("nombre"),
    correo: document.getElementById("correo"),
    carrera: document.getElementById("carrera"),
    rol: document.getElementById("rol"),
    btnConfirmDelete: document.getElementById("btnConfirmDeleteUser"),
    userFormTitle: document.getElementById("userFormTitle"),
  };

  function showModal(modal) { modal.classList.add("show"); modal.removeAttribute("hidden"); }
  function hideModal(modal) { modal.classList.remove("show"); modal.setAttribute("hidden", ""); }
  function wireClose(modal) {
    modal.querySelectorAll("[data-close]").forEach(btn => btn.addEventListener("click", () => hideModal(modal)));
    modal.addEventListener("click", (e) => { if (e.target === modal) hideModal(modal); });
  }
  wireClose(el.modalForm); wireClose(el.modalDelete);

  async function fetchUsers() {
    const res = await fetch(API_BASE, { credentials: "include" });
    if (!res.ok) throw new Error("No se pudo obtener usuarios");
    const data = await res.json();
    state.users = Array.isArray(data) ? data : (data.users || []);
    applyFilters();
  }

  function normalizeRole(u) {
    // admite distintas formas: string o id numérico
    const r = (u.rol || u.role || u.rol_nombre || "").toString().toLowerCase();
    if (["admin","administrador","3","01"].includes(r)) return "admin";
    if (["assistant","auxiliar","2"].includes(r)) return "assistant";
    return "student";
  }

  function applyFilters() {
    const s = state.search.trim().toLowerCase();
    const rf = state.roleFilter;
    state.filtered = state.users.filter(u => {
      const byRole = rf === "all" ? true : normalizeRole(u) === rf;
      const text = `${u.nombre || u.name || ""} ${u.correo || u.email || ""} ${u.carrera || u.career || ""}`.toLowerCase();
      const bySearch = !s || text.includes(s);
      return byRole && bySearch;
    });
    state.page = 1;
    renderTable();
    renderPagination();
    markActiveChip();
  }

  function markActiveChip() {
    el.chips.forEach(c => c.classList.toggle("active", c.dataset.role === state.roleFilter || (state.roleFilter === "all" && c.dataset.role === "all")));
  }

  function renderTable() {
    const start = (state.page - 1) * state.pageSize;
    const rows = state.filtered.slice(start, start + state.pageSize);
    el.tbody.innerHTML = rows.map((u, idx) => {
      const role = normalizeRole(u);
      const n = start + idx + 1;
      const nombre = u.nombre || u.name || "";
      const correo = u.correo || u.email || "";
      const carrera = u.carrera || u.career || "";
      const id = u.id || u.user_id || u._id || "";
      return `
        <tr data-id="${id}">
          <td>${n}</td>
          <td>${escapeHtml(nombre)}</td>
          <td>${escapeHtml(correo)}</td>
          <td>${escapeHtml(carrera)}</td>
          <td><span class="pill-role">${roleLabel(role)}</span></td>
          <td>
            <div class="actions">
              <button class="btn btn-primary" data-action="edit">Editar</button>
              ${role === 'assistant' ? '<button class="btn" data-action="manage-subjects">Gestionar materias</button>' : ''}
              <button class="btn btn-danger" data-action="delete">Eliminar</button>
            </div>
          </td>
        </tr>`;
    }).join("");

    // wire actions
    el.tbody.querySelectorAll("[data-action='edit']").forEach(btn => btn.addEventListener("click", onEdit));
    el.tbody.querySelectorAll("[data-action='delete']").forEach(btn => btn.addEventListener("click", onDelete));
    el.tbody.querySelectorAll("[data-action='manage-subjects']").forEach(btn => btn.addEventListener("click", () => alert("Gestionar materias: Próximamente")));
  }

  function renderPagination() {
    const total = Math.ceil(state.filtered.length / state.pageSize) || 1;
    const items = [];
    const prevDisabled = state.page <= 1 ? "disabled" : "";
    items.push(`<button class="page-btn" data-page="prev" ${prevDisabled}>◀</button>`);
    for (let i = 1; i <= total; i++) {
      items.push(`<button class="page-btn ${i===state.page? 'active':''}" data-page="${i}">${i}</button>`);
    }
    const nextDisabled = state.page >= total ? "disabled" : "";
    items.push(`<button class="page-btn" data-page="next" ${nextDisabled}>▶</button>`);
    el.pagination.innerHTML = items.join("");
    el.pagination.querySelectorAll(".page-btn").forEach(b => b.addEventListener("click", onPageClick));
  }

  function onPageClick(e) {
    const val = e.currentTarget.dataset.page;
    const total = Math.ceil(state.filtered.length / state.pageSize) || 1;
    if (val === "prev" && state.page > 1) state.page--; else if (val === "next" && state.page < total) state.page++; else if (!isNaN(Number(val))) state.page = Number(val);
    renderTable(); renderPagination();
  }

  function roleLabel(r) { return r === "admin" ? "Administrador" : r === "assistant" ? "Auxiliar" : "Estudiante"; }
  function roleValueToPayload(v) { return v === "admin" ? 3 : v === "assistant" ? 2 : 1; }

  function onEdit(e) {
    const tr = e.currentTarget.closest("tr");
    const id = tr?.dataset.id;
    const u = state.users.find(x => (x.id || x.user_id || x._id || "") == id);
    if (!u) return;
    el.userFormTitle.textContent = "Editar usuario";
    el.userId.value = id;
    el.nombre.value = u.nombre || u.name || "";
    el.correo.value = u.correo || u.email || "";
    el.carrera.value = u.carrera || u.career || "";
    el.rol.value = normalizeRole(u);
    showModal(el.modalForm);
  }

  function onDelete(e) {
    const tr = e.currentTarget.closest("tr");
    const id = tr?.dataset.id;
    state.deletingId = id;
    showModal(el.modalDelete);
  }

  el.btnConfirmDelete.addEventListener("click", async () => {
    if (!state.deletingId) return;
    const res = await fetch(`${API_BASE}/${state.deletingId}`, { method: "DELETE", credentials: "include" });
    if (res.ok) {
      state.users = state.users.filter(u => (u.id || u.user_id || u._id || "") != state.deletingId);
      applyFilters();
      hideModal(el.modalDelete);
    } else {
      alert("No se pudo eliminar");
    }
  });

  el.btnNuevo.addEventListener("click", () => {
    el.userFormTitle.textContent = "Nuevo usuario";
    el.userId.value = "";
    el.nombre.value = "";
    el.correo.value = "";
    el.carrera.value = "";
    el.rol.value = "student";
    showModal(el.modalForm);
  });

  el.form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      nombre: el.nombre.value.trim(),
      correo: el.correo.value.trim(),
      carrera: el.carrera.value.trim(),
      rol_id: roleValueToPayload(el.rol.value),
    };
    const id = el.userId.value;
    const method = id ? "PUT" : "POST";
    const url = id ? `${API_BASE}/${id}` : API_BASE;
    const res = await fetch(url, { method, credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!res.ok) { alert("Error al guardar"); return; }
    const saved = await res.json();
    if (id) {
      const idx = state.users.findIndex(u => (u.id || u.user_id || u._id || "") == id);
      if (idx >= 0) state.users[idx] = { ...state.users[idx], ...saved };
    } else {
      state.users.unshift(saved);
    }
    applyFilters();
    hideModal(el.modalForm);
  });

  el.chips.forEach(c => c.addEventListener("click", () => { state.roleFilter = c.dataset.role; applyFilters(); }));
  el.searchInput.addEventListener("input", (e) => { state.search = e.target.value; applyFilters(); });

  function escapeHtml(str) {
    return String(str).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  // init
  fetchUsers().catch(() => {
    // fallback demo data if API not ready
    state.users = Array.from({ length: 24 }).map((_, i) => ({
      id: i + 1,
      nombre: `Usuario ${i + 1}`,
      correo: `usuario${i + 1}@gmail.com`,
      carrera: "Ing. de Sistemas",
      rol: i % 3 === 0 ? "admin" : i % 3 === 1 ? "assistant" : "student",
    }));
    applyFilters();
  });
})();