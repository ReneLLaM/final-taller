// Función para cargar header según el rol del usuario

async function loadHeaderByRole() {
    try {
        // Obtener información del usuario autenticado (enviando cookies)
        const response = await fetch('/api/protected', { credentials: 'include' });
        
        if (!response.ok) {
            // Si no está autenticado, cargar header pre-autenticación
            loadPreAuthHeader();
            return;
        }
        
        const data = await response.json();
        const rol_id = data.user.rol_id;
        
        // Cargar header según rol
        switch(rol_id) {
            case 1: // Estudiante
                loadStudentHeader();
                break;
            case 2: // Auxiliar
                loadAuxHeader();
                break;
            case 3: // Administrador
                loadAdminHeader();
                break;
            default:
                loadPreAuthHeader();
        }
    } catch (error) {
        console.error('Error al cargar header:', error);
        loadPreAuthHeader();
    }
}

// Cargar header pre-autenticación
function loadPreAuthHeader() {
    const container = document.getElementById('header-container');
    if (container) {
        fetch('../../components/headers/pre-auth-header.html')
            .then(response => response.text())
            .then(data => {
                container.innerHTML = data;
                attachHeaderHandlers();
            });
    }
}

// Cargar header de estudiante
function loadStudentHeader() {
    const container = document.getElementById('header-container');
    if (container) {
        fetch('../../components/headers/student-header.html')
            .then(response => response.text())
            .then(data => {
                container.innerHTML = data;
                attachHeaderHandlers();
            });
        
        // Cargar CSS del header de estudiante si no existe
        if (!document.querySelector('link[href*="student-header.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = '../../assets/css/components/headers/student-header.css';
            document.head.appendChild(link);
        }
    }
}

// Cargar header de auxiliar
function loadAuxHeader() {
    const container = document.getElementById('header-container');
    if (container) {
        fetch('../../components/headers/aux-header.html')
            .then(response => response.text())
            .then(data => {
                container.innerHTML = data;
                attachHeaderHandlers();
            });
        if (!document.querySelector('link[href*="aux-header.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = '../../assets/css/components/headers/aux-header.css';
            document.head.appendChild(link);
        }
    }
}

// Adjunta manejadores al ícono de usuario y opciones del menú
function attachHeaderHandlers() {
    // Eliminar menú anterior si existe
    const oldMenu = document.querySelector('.user-menu');
    if (oldMenu) {
        oldMenu.remove();
    }
    
    // Crear menú
    const btn = document.querySelector('.user-icon-btn');
    if (!btn) {
        console.warn('No se encontró el botón .user-icon-btn');
        return;
    }
    
    const menu = document.createElement('div');
    menu.className = 'user-menu';
    menu.style.position = 'fixed';
    menu.style.zIndex = '2000';
    menu.style.display = 'none';
    menu.innerHTML = `
        <div class=\"menu-card\"> 
            <button id=\"menu-logout\" class=\"menu-btn\">Cerrar Sesión</button>
            <button id=\"menu-edit-profile\" class=\"menu-btn\">Perfil</button>
        </div>
    `;
    document.body.appendChild(menu);

    const positionMenu = () => {
        const rect = btn.getBoundingClientRect();
        // Para fixed no sumamos scrollY/scrollX
        menu.style.top = `${rect.bottom + 10}px`;
        const menuWidth = 280;
        menu.style.left = `${rect.right - menuWidth}px`;
    };

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        positionMenu();
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    });

    menu.addEventListener('click', (e) => e.stopPropagation());

    document.getElementById('menu-edit-profile').addEventListener('click', (e) => {
        e.stopPropagation();
        menu.style.display = 'none';
        // Esperar un poco si la función no está lista
        const tryOpenModal = () => {
            if (typeof window.openProfileModal === 'function') {
                window.openProfileModal();
            } else {
                console.warn('openProfileModal no está definido, reintentando...');
                setTimeout(tryOpenModal, 100);
            }
        };
        tryOpenModal();
    });
    
    document.getElementById('menu-logout').addEventListener('click', (e) => {
        e.stopPropagation();
        menu.style.display = 'none';
        if (typeof handleLogout === 'function') handleLogout();
    });

    document.addEventListener('click', (e) => {
        if (!btn.contains(e.target) && !menu.contains(e.target)) {
            menu.style.display = 'none';
        }
    });

    // Navegación sin recarga para secciones del dashboard
    const headerLinks = document.querySelectorAll('.header-right .header-link');
    headerLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            try {
                const url = new URL(link.href, window.location.origin);
                const targetSection = url.searchParams.get('section');
                const isPrincipalTarget = url.pathname.includes('/pages/dashboard/principal.html') || url.pathname.endsWith('principal.html');
                const isOnPrincipal = window.location.pathname.includes('/pages/dashboard/principal.html') || window.location.pathname.endsWith('principal.html');
                // Si estamos en principal y el destino es principal, navegar sin recargar
                if (isOnPrincipal && isPrincipalTarget) {
                    e.preventDefault();
                    if (typeof window.navigateToSection === 'function') {
                        window.navigateToSection(targetSection);
                    } else {
                        // Fallback: actualizar URL y marcar activo
                        window.history.pushState({}, '', url);
                        markActiveHeaderLink();
                    }
                }
            } catch (err) {
                // Si algo falla, dejar que el navegador navegue normalmente
            }
        });
    });

    // Interceptar clic en "Inicio" (logo/título) para evitar recarga si ya estamos en principal
    const headerLeftLink = document.querySelector('.header-left');
    if (headerLeftLink && headerLeftLink.tagName === 'A') {
        headerLeftLink.addEventListener('click', (e) => {
            try {
                const url = new URL(headerLeftLink.href, window.location.origin);
                const isPrincipalTarget = url.pathname.includes('/pages/dashboard/principal.html') || url.pathname.endsWith('principal.html');
                const isOnPrincipal = window.location.pathname.includes('/pages/dashboard/principal.html') || window.location.pathname.endsWith('principal.html');
                if (isOnPrincipal && isPrincipalTarget) {
                    e.preventDefault();
                    if (typeof window.navigateToSection === 'function') {
                        window.navigateToSection(null);
                    } else {
                        window.history.pushState({}, '', url.pathname); // limpiar sección
                        markActiveHeaderLink();
                        if (typeof window.cargarMiHorario === 'function') window.cargarMiHorario();
                    }
                }
            } catch (err) {
                // Fallback: permitir navegación normal
            }
        });
    }

    // Marcar enlace activo según la sección actual
    markActiveHeaderLink();
}

function markActiveHeaderLink() {
    try {
        const currentSection = new URLSearchParams(window.location.search).get('section');
        const links = document.querySelectorAll('.header-right .header-link');
        links.forEach(link => {
            link.classList.remove('active');
            const hrefSection = new URL(link.href, window.location.origin).searchParams.get('section');
            if (currentSection && hrefSection === currentSection) {
                link.classList.add('active');
            }
        });
    } catch (e) {
        console.warn('No se pudo marcar enlace activo:', e);
    }
}

// Exponer para uso desde otras partes del dashboard
window.markActiveHeaderLink = markActiveHeaderLink;

// Mantener header sincronizado al usar atrás/adelante del navegador
window.addEventListener('popstate', () => {
    try {
        if (typeof window.cargarMiHorario === 'function') {
            window.cargarMiHorario();
        }
        markActiveHeaderLink();
    } catch (e) {
        // Ignorar errores
    }
});

// Cargar header de administrador
function loadAdminHeader() {
    const container = document.getElementById('header-container');
    if (container) {
        fetch('../../components/headers/admin-header.html')
            .then(response => response.text())
            .then(data => {
                container.innerHTML = data;
                attachHeaderHandlers();
            });
        if (!document.querySelector('link[href*="admin-header.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = '../../assets/css/components/headers/admin-header.css';
            document.head.appendChild(link);
        }
    }
}

// Auto-cargar header al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('header-container');
    if (container) {
        loadHeaderByRole();
    }
});

