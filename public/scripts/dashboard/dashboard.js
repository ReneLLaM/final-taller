// Cargar información del usuario
async function loadUserInfo() {
    try {
        const response = await fetch('/api/protected', {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('No autorizado');
        }

        const data = await response.json();

        if (data.user) {
            // Obtener nombre del rol
            let rolNombre = 'Usuario';
            switch(data.user.rol_id) {
                case 1: rolNombre = 'Estudiante'; break;
                case 2: rolNombre = 'Auxiliar'; break;
                case 3: rolNombre = 'Administrador'; break;
            }

            // Guard de secciones por rol
            const params = new URLSearchParams(window.location.search);
            const section = params.get('section');
            const allowedByRole = {
                1: ['horario','auxiliaturas','votacion', null],
                2: ['panel-auxiliar','horario','auxiliaturas','votacion', null],
                3: ['aulas','usuarios-roles','horarios','subir-horario', null]
            };
            const allowed = allowedByRole[data.user.rol_id] || [null];
            if (!allowed.includes(section)) {
                // Redirigir a principal sin sección si intenta acceder a otra área
                window.history.replaceState({}, '', 'principal.html');
            }
            
            // Aquí se puede cargar contenido específico según el rol si es necesario
            // const dashboardContainer = document.querySelector('.dashboard-container');
            // if (dashboardContainer) { ... }

            // Breadcrumb izquierdo: sección
            const sectionLabels = {
                'horario': '/Editar horario',
                'auxiliaturas': '/Mis auxiliaturas',
                'votacion': '/Votación/Inscripción',
                'panel-auxiliar': '/Panel auxiliar',
                'aulas': '/Aulas',
                'usuarios-roles': '/Usuarios y Roles',
                'horarios': '/Horarios',
                'subir-horario': '/Subir horario'
            };
            const pathEl = document.getElementById('breadcrumb-path');
            if (pathEl) {
                pathEl.textContent = sectionLabels[section] || '/Inicio';
            }

            // Breadcrumb derecho: Rol: Nombre
            const roleEl = document.getElementById('breadcrumb-role');
            if (roleEl) {
                roleEl.innerHTML = `<span class="role-text">${rolNombre}:</span> <span class="name-text">${data.user.nombre_completo}</span>`;
            }
        }
    } catch (error) {
        console.error('Error al cargar información:', error);
        window.location.href = '/pages/auth/login.html';
    }
}

// Manejar logout
async function handleLogout() {
    try {
        const response = await fetch('/api/logout', {
            method: 'POST',
            credentials: 'include'
        });

        if (response.ok) {
            window.location.href = '/pages/auth/login.html';
        }
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        // Redirigir de todas formas
        window.location.href = '/pages/auth/login.html';
    }
}

// Cargar información al cargar la página
loadUserInfo();

// No llamar loadHeaderByRole() aquí porque load-header.js ya lo hace automáticamente

// Modal helpers
function openProfileModal() {
    const modal = document.getElementById('profileModal');
    if (!modal) return;
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
    // Cargar datos del usuario actual en el formulario
    fetch('/api/protected', { credentials: 'include' })
        .then(r => r.json())
        .then(d => {
            if (!d.user) return;
            document.getElementById('p_nombre').value = d.user.nombre_completo || '';
            document.getElementById('p_carrera').value = d.user.carrera || '';
            document.getElementById('p_cu').value = d.user.cu || '';
            document.getElementById('p_correo').value = d.user.correo || '';
            const rolMap = {1:'Estudiante',2:'Auxiliar',3:'Administrador'};
            document.getElementById('p_rol').value = rolMap[d.user.rol_id] || 'Usuario';
        });
}

// Exponer funciones a window para uso desde otros scripts (menú)
window.openProfileModal = openProfileModal;
window.handleLogout = handleLogout;

// Cerrar modal
document.addEventListener('click', (e) => {
    if (e.target.matches('[data-close-modal]')) {
        const modal = document.getElementById('profileModal');
        if (modal) {
            modal.classList.remove('show');
            modal.setAttribute('aria-hidden', 'true');
        }
    }
});

// Enviar formulario de perfil
const profileForm = document.getElementById('profileForm');
if (profileForm) {
    profileForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const payload = {
            nombre_completo: document.getElementById('p_nombre').value,
            carrera: document.getElementById('p_carrera').value || null,
            cu: document.getElementById('p_cu').value || null,
            correo: document.getElementById('p_correo').value
        };
        const pass = document.getElementById('p_pass').value;
        if (pass && pass.length >= 6) payload.contrasenia = pass;

        const msg = document.getElementById('profileMessage');
        msg.style.display = 'none';

        try {
            const res = await fetch('/api/me', {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (res.ok) {
                msg.className = 'message success';
                msg.textContent = 'Perfil actualizado correctamente';
                msg.style.display = 'block';
                
                // Esperar 1 segundo para que el usuario vea el mensaje
                setTimeout(() => {
                    // Cerrar el modal
                    const modal = document.getElementById('profileModal');
                    if (modal) {
                        modal.classList.remove('show');
                        modal.setAttribute('aria-hidden', 'true');
                    }
                    
                    // Refrescar información del usuario (breadcrumb y dashboard)
                    loadUserInfo();
                    
                    // Limpiar el mensaje
                    msg.style.display = 'none';
                }, 1000);
            } else {
                msg.className = 'message error';
                msg.textContent = data.message || 'Error al actualizar';
                msg.style.display = 'block';
            }
        } catch (err) {
            msg.className = 'message error';
            msg.textContent = 'Error de conexión';
            msg.style.display = 'block';
        }
    });
}

