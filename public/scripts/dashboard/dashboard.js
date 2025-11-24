const SECTION_LABELS = {
    'horario': '/Mi disponibilidad',
    'auxiliaturas': '/Mis auxiliaturas',
    'votacion': '/Votación/Inscripción',
    'votacion-panel': '/Votación/Panel',
    'panel-auxiliar': '/Panel auxiliar',
    'aulas': '/Aulas',
    'carreras': '/Carreras',
    'materias-globales': '/Materias',
    'usuarios-roles': '/Usuarios y Roles',
    'horarios': '/Horarios',
    'subir-horario': '/Subir horario'
};

function updateBreadcrumbPath(section) {
    const pathEl = document.getElementById('breadcrumb-path');
    if (!pathEl) return;

    // Caso especial: panel de votación con breadcrumb navegable
    if (section === 'votacion-panel') {
        pathEl.innerHTML = '<a href="principal.html?section=votacion" class="breadcrumb-link" data-section="votacion">Votación</a> / Panel';

        const link = pathEl.querySelector('[data-section="votacion"]');
        if (link) {
            link.addEventListener('click', (ev) => {
                ev.preventDefault();
                if (typeof window.navigateToSection === 'function') {
                    window.navigateToSection('votacion');
                } else {
                    window.location.href = 'principal.html?section=votacion';
                }
            });
        }
        return;
    }

    pathEl.textContent = SECTION_LABELS[section] || '/Inicio';
}

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
            rolUsuarioActual = data.user.rol_id;
            // Marcar el body según el rol
            if (typeof document !== 'undefined' && document.body) {
                document.body.classList.remove('rol-estudiante', 'rol-auxiliar', 'rol-admin');
                if (data.user.rol_id === 1) document.body.classList.add('rol-estudiante');
                if (data.user.rol_id === 2) document.body.classList.add('rol-auxiliar');
                if (data.user.rol_id === 3) document.body.classList.add('rol-admin');
            }
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
            seccionActual = section;
            const allowedByRole = {
                1: ['horario','auxiliaturas','votacion','votacion-panel', null],
                2: ['panel-auxiliar','horario','auxiliaturas','votacion','votacion-panel', null],
                3: ['aulas','usuarios-roles','carreras','materias-globales','horarios','subir-horario', null]
            };
            const allowed = allowedByRole[data.user.rol_id] || [null];
            if (!allowed.includes(section)) {
                // Redirigir a principal sin sección si intenta acceder a otra área
                window.history.replaceState({}, '', 'principal.html');
                seccionActual = null;
            }

            // Si es administrador, preparar su dashboard de inicio (sin forzar doble carga)
            if (data.user.rol_id !== 3) {
                const adminSummaryEl = document.getElementById('adminDashboardSummary');
                if (adminSummaryEl) adminSummaryEl.style.display = 'none';
            }
            
            // Aquí se puede cargar contenido específico según el rol si es necesario
            // const dashboardContainer = document.querySelector('.dashboard-container');
            // if (dashboardContainer) { ... }

            // Breadcrumb izquierdo: sección
            updateBreadcrumbPath(section);

            // Breadcrumb derecho: Rol: Nombre
            const roleEl = document.getElementById('breadcrumb-role');
            if (roleEl) {
                roleEl.innerHTML = `<span class="role-text">${rolNombre}:</span> <span class="name-text">${data.user.nombre_completo}</span>`;
            }

            const toolbar = document.querySelector('.horario-toolbar');
            if (toolbar) {
                toolbar.classList.toggle('active', puedeGestionarHorario(section));
            }

            // Inicializar botón de toggle de edición del horario (solo si no es admin)
            if (rolUsuarioActual !== 3) {
                inicializarToggleEdicionHorario();
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

// Cargar información y horario cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
    inicializarCeldasHorario();
    await loadUserInfo();
    await cargarMiHorario();
    // Autocompletado de carrera en perfil
    if (typeof window.initCarreraAutocomplete === 'function') {
        window.initCarreraAutocomplete('p_carrera', 'profileCarrerasList');
    }
});

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

// ============================================
// FUNCIONES PARA EL HORARIO
// ============================================

// Variable global para altura de cada bloque horario (responsiva)
function getSlotHeight() {
    try {
        const raw = getComputedStyle(document.documentElement).getPropertyValue('--slot-height');
        const parsed = parseInt(raw, 10);
        return Number.isNaN(parsed) ? 56 : parsed;
    } catch {
        return 56;
    }
}
let SLOT_HEIGHT = getSlotHeight();
const DEFAULT_DURATION_HOURS = 2;
let filtroTipoClase = null; // null = todas, 1 = normales, 2 = auxiliaturas
let diaSeleccionado = null;
let horaSeleccionada = null;
let claseSeleccionada = null;
let materiasCache = [];
let materiaEditando = null;
let clasesRenderizadas = [];
let rolUsuarioActual = null;
let seccionActual = new URLSearchParams(window.location.search).get('section');
let scheduleCellsInitialized = false;
let modoEdicionHorario = false;

function syncDashboardLayoutWithSection(sectionParam) {
    const container = document.querySelector('.dashboard-container');
    if (!container) return;
    const section = sectionParam ?? seccionActual ?? new URLSearchParams(window.location.search).get('section');
    // En el panel de auxiliar queremos menos espacio arriba del horario
    if (section === 'panel-auxiliar') {
        container.style.paddingTop = '40px';
    } else {
        container.style.paddingTop = '';
    }
}

function puedeGestionarHorario(sectionParam) {
    const section = sectionParam ?? seccionActual;
    if (!rolUsuarioActual) return false;
    // Solo estudiantes y auxiliares pueden gestionar
    if (rolUsuarioActual !== 1 && rolUsuarioActual !== 2) return false;
    // Solo en la sección 'horario' y cuando el toggle de edición está activo
    return section === 'horario' && !!modoEdicionHorario;
}

function puedeVerDisponibilidad(sectionParam) {
    const section = sectionParam ?? seccionActual;
    if (!rolUsuarioActual) return false;
    if (rolUsuarioActual !== 1 && rolUsuarioActual !== 2) return false;
    // La vista de disponibilidad se muestra en la sección 'horario'
    return section === 'horario';
}

function inicializarCeldasHorario() {
    if (scheduleCellsInitialized) return;
    document.querySelectorAll('.schedule-cell').forEach(cell => {
        cell.addEventListener('click', (event) => {
            if (!puedeGestionarHorario()) return;
            if (event.target.closest('.clase-card')) return;
            const dia = cell.getAttribute('data-dia');
            const hora = cell.getAttribute('data-hora');
            abrirModalAgregarClase(dia, hora);
        });
    });
    scheduleCellsInitialized = true;
}

function actualizarCeldasEditables(activo) {
    document.querySelectorAll('.schedule-cell').forEach(cell => {
        cell.classList.toggle('editable', !!activo);
    });
}

// Función para cargar el horario del usuario autenticado
async function cargarMiHorario() {
    console.log('=== INICIANDO CARGA DE HORARIO ===');
    
    try {
        // Detectar la sección actual
        const params = new URLSearchParams(window.location.search);
        const section = params.get('section');
        seccionActual = section;
        
        console.log('Sección actual:', section || 'inicio (sin parámetro)');

        // Ajustar layout del contenedor del horario según la sección
        syncDashboardLayoutWithSection(section);
        
        // Para administradores no se renderiza el horario personal; se muestra dashboard propio
        if (rolUsuarioActual === 3) {
            console.log('Rol admin: omitiendo carga de horario personal, mostrando dashboard admin');
            await cargarAdminDashboard();
            return;
        }

        // Establecer el filtro según la sección
        if (section === 'horario') {
            // Vista "Mi disponibilidad": solo clases normales
            filtroTipoClase = 1;
            console.log('Filtro activado: SOLO CLASES NORMALES (tipo_clase = 1)');
        } else if (section === 'auxiliaturas') {
            // Vista "Mis auxiliaturas" (como estudiante): solo tipo 2
            filtroTipoClase = 2;
            console.log('Filtro activado: SOLO AUXILIATURAS (tipo_clase = 2)');
        } else if (section === 'panel-auxiliar') {
            // Panel de auxiliar: solo las auxiliaturas que dicta (tipo 3)
            filtroTipoClase = 3;
            console.log('Filtro activado: SOLO AUXILIATURAS DICTADAS (tipo_clase = 3)');
        } else if (section === 'votacion-panel') {
            // Panel de votación: mostrar todas las clases (1,2,3) como referencia visual
            filtroTipoClase = null;
            console.log('Filtro activado: TODAS LAS CLASES (panel de votación)');
        } else {
            filtroTipoClase = null; // Todas las clases
            console.log('Filtro: TODAS LAS CLASES');
        }
        
        console.log('Llamando a /api/mis-clases...');
        const response = await fetch('/api/mis-clases', {
            method: 'GET',
            credentials: 'include'
        });
        
        console.log('Respuesta recibida:', response.status, response.statusText);
        
        if (!response.ok) {
            console.error('Error al cargar el horario:', response.status);
            const errorText = await response.text();
            console.error('Detalle del error:', errorText);
            return;
        }
        
        const clases = await response.json();
        console.log('Clases obtenidas de la API:', clases.length);
        console.log('Primera clase:', clases[0]);
        
        // Filtrar clases según el tipo
        let clasesFiltradas = clases;
        if (filtroTipoClase !== null) {
            clasesFiltradas = clases.filter(c => c.tipo_clase === filtroTipoClase);
            console.log(`Después de filtrar (tipo=${filtroTipoClase}):`, clasesFiltradas.length, 'clases');
        }
        
        // Renderizar las clases en el horario
        console.log('Llamando a renderizarClases con', clasesFiltradas.length, 'clases');
        renderizarClases(clasesFiltradas);

        // Si estamos en el panel de votación, cargar disponibilidad de slots
        if (section === 'votacion-panel') {
            const auxMateriaIdRaw = params.get('auxMateriaId');
            const auxMateriaId = auxMateriaIdRaw ? parseInt(auxMateriaIdRaw, 10) : NaN;
            if (auxMateriaId && !Number.isNaN(auxMateriaId)) {
                console.log('Cargando disponibilidad de votación para auxiliar_materia_id =', auxMateriaId);
                await cargarDisponibilidadVotacion(auxMateriaId);
            } else {
                console.warn('auxMateriaId no válido en la URL para votacion-panel');
            }
        }

        console.log('=== CARGA DE HORARIO COMPLETADA ===');
    } catch (error) {
        console.error('=== ERROR EN CARGA DE HORARIO ===');
        console.error('Error:', error);
        console.error('Stack:', error.stack);
    }
}

// Exponer para sincronización desde el header y navegación SPA
window.cargarMiHorario = cargarMiHorario;

function navigateToSection(section) {
    try {
        const url = new URL(window.location.href);
        if (section) {
            url.searchParams.set('section', section);
        } else {
            url.searchParams.delete('section');
        }
        window.history.pushState({}, '', url);
        seccionActual = section;
        updateBreadcrumbPath(section);
        // Asegurar desactivación de edición al cambiar de sección
        desactivarEdicionHorario();
        inicializarToggleEdicionHorario();
        cargarMiHorario();
        if (typeof window.markActiveHeaderLink === 'function') {
            window.markActiveHeaderLink();
        }
    } catch (e) {
        console.warn('No se pudo navegar a la sección sin recargar:', e);
        // Fallback
        const href = section ? `principal.html?section=${section}` : 'principal.html';
        window.location.href = href;
    }
}

// Exponer la navegación SPA para el header
window.navigateToSection = navigateToSection;

// Mantener breadcrumb sincronizado con atrás/adelante
window.addEventListener('popstate', () => {
    const params = new URLSearchParams(window.location.search);
    const section = params.get('section');
    seccionActual = section;
    updateBreadcrumbPath(section);
});

// Función para renderizar las clases en el grid
function renderizarClases(clases) {
    console.log('Renderizando clases:', clases.length);
    // Mantener referencia para re-render en cambios de viewport
    clasesRenderizadas = Array.isArray(clases) ? clases : [];
    
    // Limpiar todas las celdas primero
    document.querySelectorAll('.schedule-cell').forEach(cell => {
        cell.innerHTML = '';
    });
    
    if (!clases || clases.length === 0) {
        console.log('No hay clases para renderizar');
        // Actualizar resumen superior con ceros cuando no hay clases
        actualizarDashboardSummary([], []);
        renderConflictos([]);
        aplicarLayoutConflictos();
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const section = params.get('section');
    const puedeEditar = puedeGestionarHorario(section);
    const conflictos = detectarConflictos(clases);
    actualizarCeldasEditables(puedeEditar);
    
    // Renderizar cada clase
    clases.forEach((clase, index) => {
        console.log(`Clase ${index + 1}:`, clase);
        
        // Extraer hora_inicio y hora_fin (puede venir como "HH:MM:SS" o objeto)
        let horaInicio = typeof clase.hora_inicio === 'string' 
            ? clase.hora_inicio.substring(0, 5) 
            : clase.hora_inicio;
        let horaFin = typeof clase.hora_fin === 'string' 
            ? clase.hora_fin.substring(0, 5) 
            : clase.hora_fin;
            
        const dia = parseInt(clase.dia_semana);
        
        console.log(`Procesando: ${clase.materia_nombre} - Día ${dia}, ${horaInicio} - ${horaFin}`);
        
        // Extraer la hora de inicio (sin minutos para buscar la celda)
        const [horaInicioHH, horaInicioMM] = horaInicio.split(':').map(Number);
        const [horaFinHH, horaFinMM] = horaFin.split(':').map(Number);
        
        // Calcular duración en minutos
        const minutosInicio = horaInicioHH * 60 + horaInicioMM;
        const minutosFin = horaFinHH * 60 + horaFinMM;
        const duracionMinutos = minutosFin - minutosInicio;
        
        // Buscar la celda correspondiente (basada en la hora de inicio)
        const horaFormateada = `${String(horaInicioHH).padStart(2, '0')}:00`;
        const cell = document.querySelector(`.schedule-cell[data-dia="${dia}"][data-hora="${horaFormateada}"]`);
        
        console.log(`Buscando celda: dia=${dia}, hora=${horaFormateada}`, cell ? 'ENCONTRADA' : 'NO ENCONTRADA');
        
        if (cell) {
            // Calcular el offset dentro de la celda si no empieza en punto
            const offsetMinutos = horaInicioMM;
            const offsetPixels = (offsetMinutos / 60) * SLOT_HEIGHT;
            
            // Calcular altura en píxeles (proporcional a la duración)
            const alturaPixels = (duracionMinutos / 60) * SLOT_HEIGHT;
            
            console.log(`Creando tarjeta: altura=${alturaPixels}px, offset=${offsetPixels}px`);
            
            const claseCard = crearClaseCard(clase, alturaPixels, offsetPixels, conflictos.ids);
            cell.appendChild(claseCard);
        }
    });
    
    console.log('Renderizado completo');
    // Actualizar tarjetas resumen (solo en vista de inicio)
    actualizarDashboardSummary(clases, conflictos.lista);
    aplicarLayoutConflictos();
}

// ================================
// VOTACIÓN - CARDS DE DISPONIBILIDAD
// ================================

let votacionPanelMaxVotos = 0;
let votacionPanelVotosUsados = 0;
let votacionPanelMisVotosSet = new Set();
let votacionPanelSlotSeleccionado = null;

const votacionSlotModal = document.getElementById('votacionSlotModal');
const votacionSlotModalTitle = document.getElementById('votacionSlotModalTitle');
const votacionSlotModalDescription = document.getElementById('votacionSlotModalDescription');
const votacionSlotModalInfo = document.getElementById('votacionSlotModalInfo');
const votacionSlotModalMessage = document.getElementById('votacionSlotModalMessage');
const btnVotacionSlotConfirm = document.getElementById('btnVotacionSlotConfirm');
const btnVotacionSlotDelete = document.getElementById('btnVotacionSlotDelete');

async function cargarDisponibilidadVotacion(auxMateriaId) {
    try {
        const res = await fetch(`/api/auxiliar-materias/${auxMateriaId}/votacion/disponibilidad`, {
            method: 'GET',
            credentials: 'include'
        });

        if (!res.ok) {
            console.warn('No se pudo cargar disponibilidad de votación:', res.status);
            return;
        }

        const data = await res.json().catch(() => null);
        if (!data || !Array.isArray(data.disponibilidad)) {
            console.warn('Respuesta de disponibilidad inesperada:', data);
            return;
        }
        const maxVotos = typeof data.max_votos === 'number' ? data.max_votos : (data.veces_por_semana || 0);
        const usados = typeof data.votos_usados === 'number' ? data.votos_usados : 0;
        const misVotos = Array.isArray(data.mis_votos) ? data.mis_votos : [];

        votacionPanelMaxVotos = maxVotos;
        votacionPanelVotosUsados = usados;
        votacionPanelMisVotosSet = new Set(
            misVotos.map((v) => `${v.dia_semana}|${typeof v.hora_inicio === 'string' ? v.hora_inicio.substring(0, 5) : v.hora_inicio}`),
        );

        renderizarVotacionDisponibilidad(data);
    } catch (error) {
        console.error('Error al cargar disponibilidad de votación:', error);
    }
}

function renderizarVotacionDisponibilidad(payload) {
    const params = new URLSearchParams(window.location.search);
    const section = params.get('section');
    if (section !== 'votacion-panel') {
        return;
    }

    // Limpiar cards anteriores
    document.querySelectorAll('.votacion-slot-card').forEach(card => card.remove());

    const disponibilidad = Array.isArray(payload?.disponibilidad) ? payload.disponibilidad : [];

    if (!disponibilidad.length) {
        console.log('No hay disponibilidad de votación para renderizar');
        return;
    }

    disponibilidad.forEach(item => {
        const dia = parseInt(item.dia_semana, 10);
        const horaInicio = typeof item.hora_inicio === 'string'
            ? item.hora_inicio.substring(0, 5)
            : item.hora_inicio;

        if (!dia || !horaInicio) return;

        const cell = document.querySelector(`.schedule-cell[data-dia="${dia}"][data-hora="${horaInicio}"]`);
        if (!cell) return;

        const estado = item.estado || 'neutral';
        const totalEst = item.total_estudiantes ?? null;
        const dispEst = item.estudiantes_disponibles ?? null;
        const porc = item.porcentaje_disponibles;
        const aulasCantidad = item.aulas_disponibles ?? 0;

        const card = document.createElement('div');
        card.className = 'votacion-slot-card';
        if (estado === 'recomendada') {
            card.classList.add('votacion-estado-recomendada');
        } else if (estado === 'no_disponible') {
            card.classList.add('votacion-estado-no-disponible');
        } else {
            card.classList.add('votacion-estado-neutral');
        }

        const key = `${dia}|${horaInicio}`;
        const yaVotado = votacionPanelMisVotosSet && votacionPanelMisVotosSet.has(key);
        const votarLabel = yaVotado ? 'Voto emitido' : 'Votar';

        let fraccionTexto = '-';
        if (dispEst != null && totalEst != null) {
            fraccionTexto = `${dispEst}/${totalEst}`;
        }

        let porcentajeTexto = '-';
        if (porc != null) {
            porcentajeTexto = `${porc}%`;
        }

        card.innerHTML = `
            <div class="votacion-slot-main">
                <span class="votacion-slot-votar">${votarLabel}</span>
            </div>
            <div class="votacion-slot-row">
                <span class="votacion-slot-label">Cantidad de aulas</span>
                <span class="votacion-slot-value">${aulasCantidad}</span>
            </div>
            <div class="votacion-slot-disponibilidad">
                <div class="votacion-slot-disponibilidad-label">Disponibilidad de estudiantes</div>
                <div class="votacion-slot-disponibilidad-data">
                    <span class="votacion-slot-fraccion">${fraccionTexto}</span>
                    <span class="votacion-slot-porcentaje">${porcentajeTexto}</span>
                </div>
            </div>
        `;

        card.dataset.dia = String(dia);
        card.dataset.horaInicio = horaInicio;
        card.dataset.horaFin = typeof item.hora_fin === 'string' ? item.hora_fin.substring(0, 5) : item.hora_fin;
        card.dataset.estado = estado;
        card.dataset.totalEstudiantes = totalEst;
        card.dataset.estudiantesDisponibles = dispEst;
        card.dataset.porcentajeDisponibles = porc;
        card.dataset.aulasDisponibles = aulasCantidad;

        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
            const slotInfo = {
                dia_semana: dia,
                hora_inicio: horaInicio,
                hora_fin: card.dataset.horaFin,
                estado,
                total_estudiantes: totalEst,
                estudiantes_disponibles: dispEst,
                porcentaje_disponibles: porc,
                aulas_disponibles: aulasCantidad,
            };
            abrirModalVotacionSlot(slotInfo);
        });

        cell.appendChild(card);
    });
}

function abrirModalVotacionSlot(slot) {
    if (!votacionSlotModal || !slot) return;

    votacionPanelSlotSeleccionado = slot;

    const diaNum = parseInt(slot.dia_semana, 10) || 1;
    const diaNombre = typeof window.nombreDia === 'function'
        ? window.nombreDia(diaNum)
        : `Día ${diaNum}`;
    const rango = `${slot.hora_inicio || '--:--'} - ${slot.hora_fin || '--:--'}`;
    const estadoTexto = slot.estado === 'recomendada'
        ? 'Recomendado'
        : slot.estado === 'no_disponible'
            ? 'No disponible'
            : 'Neutral';
    const fraccion = slot.estudiantes_disponibles != null && slot.total_estudiantes != null
        ? `${slot.estudiantes_disponibles}/${slot.total_estudiantes}`
        : '-';
    const porcentaje = slot.porcentaje_disponibles != null ? `${slot.porcentaje_disponibles}%` : '-';
    const aulas = slot.aulas_disponibles != null ? slot.aulas_disponibles : 0;

    const key = `${diaNum}|${slot.hora_inicio}`;
    const yaVotado = votacionPanelMisVotosSet && votacionPanelMisVotosSet.has(key);

    if (votacionSlotModalTitle) {
        votacionSlotModalTitle.textContent = yaVotado ? 'Eliminar voto' : 'Votar en este horario';
    }

    if (votacionSlotModalDescription) {
        if (yaVotado) {
            votacionSlotModalDescription.textContent = `Ya emitiste un voto en este bloque (${diaNombre}, ${rango}). Puedes eliminarlo si deseas mover tu voto a otro horario mientras la votación siga activa.`;
        } else {
            const totalVotos = votacionPanelMaxVotos || 0;
            votacionSlotModalDescription.textContent = totalVotos
                ? `Para esta auxiliatura debes emitir ${totalVotos} voto(s). Elige cuidadosamente los bloques donde podrías asistir con mayor comodidad. Podrás cambiar tus votos mientras la votación esté activa eliminando uno y volviendo a votar en otro horario.`
                : 'Elige este bloque si es un horario en el que podrías asistir a la auxiliatura. Podrás cambiar tu voto mientras la votación esté activa.';
        }
    }

    if (votacionSlotModalInfo) {
        votacionSlotModalInfo.innerHTML = `
            <div><strong>${diaNombre}</strong> · ${rango}</div>
            <div>Aulas disponibles: <strong>${aulas}</strong></div>
            <div>Disponibilidad de estudiantes: <strong>${fraccion} (${porcentaje})</strong></div>
            <div>Estado del bloque: <strong>${estadoTexto}</strong></div>
            <div>Votos usados: <strong>${votacionPanelVotosUsados}</strong> de <strong>${votacionPanelMaxVotos}</strong></div>
        `;
    }

    if (votacionSlotModalMessage) {
        votacionSlotModalMessage.style.display = 'none';
        votacionSlotModalMessage.textContent = '';
    }

    if (btnVotacionSlotDelete) {
        btnVotacionSlotDelete.style.display = yaVotado ? 'inline-flex' : 'none';
    }

    if (btnVotacionSlotConfirm) {
        btnVotacionSlotConfirm.style.display = yaVotado ? 'none' : 'inline-flex';
        btnVotacionSlotConfirm.disabled = false;
        if (!yaVotado && votacionPanelMaxVotos && votacionPanelVotosUsados >= votacionPanelMaxVotos) {
            btnVotacionSlotConfirm.disabled = true;
            if (votacionSlotModalMessage) {
                votacionSlotModalMessage.className = 'message info';
                votacionSlotModalMessage.textContent = 'Ya utilizaste todos tus votos. Elimina uno antes de volver a votar.';
                votacionSlotModalMessage.style.display = 'block';
            }
        }
    }

    if (typeof mostrarModal === 'function') {
        mostrarModal(votacionSlotModal);
    } else {
        votacionSlotModal.classList.add('show');
        votacionSlotModal.setAttribute('aria-hidden', 'false');
    }
}

async function enviarVotoActual(accion) {
    if (!votacionPanelSlotSeleccionado) return;

    const params = new URLSearchParams(window.location.search);
    const auxMateriaIdRaw = params.get('auxMateriaId');
    const auxMateriaId = auxMateriaIdRaw ? parseInt(auxMateriaIdRaw, 10) : NaN;
    if (!auxMateriaId || Number.isNaN(auxMateriaId)) return;

    if (votacionSlotModalMessage) {
        votacionSlotModalMessage.className = 'message info';
        votacionSlotModalMessage.textContent = accion === 'crear' ? 'Registrando voto...' : 'Eliminando voto...';
        votacionSlotModalMessage.style.display = 'block';
    }

    const payload = {
        dia_semana: votacionPanelSlotSeleccionado.dia_semana,
        hora_inicio: votacionPanelSlotSeleccionado.hora_inicio,
        hora_fin: votacionPanelSlotSeleccionado.hora_fin,
    };

    const method = accion === 'crear' ? 'POST' : 'DELETE';

    try {
        const res = await fetch(`/api/auxiliar-materias/${auxMateriaId}/votacion/votos`, {
            method,
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            if (votacionSlotModalMessage) {
                votacionSlotModalMessage.className = 'message error';
                votacionSlotModalMessage.textContent = data.message || 'No se pudo procesar el voto';
                votacionSlotModalMessage.style.display = 'block';
            }
            return;
        }

        if (typeof data.max_votos === 'number') {
            votacionPanelMaxVotos = data.max_votos;
        }
        if (typeof data.votos_usados === 'number') {
            votacionPanelVotosUsados = data.votos_usados;
        }

        const key = `${votacionPanelSlotSeleccionado.dia_semana}|${votacionPanelSlotSeleccionado.hora_inicio}`;
        if (accion === 'crear') {
            votacionPanelMisVotosSet.add(key);
        } else {
            votacionPanelMisVotosSet.delete(key);
        }

        if (typeof cerrarModal === 'function') {
            cerrarModal(votacionSlotModal);
        } else if (votacionSlotModal) {
            votacionSlotModal.classList.remove('show');
            votacionSlotModal.setAttribute('aria-hidden', 'true');
        }

        await cargarDisponibilidadVotacion(auxMateriaId);
    } catch (error) {
        console.error('Error al enviar voto:', error);
        if (votacionSlotModalMessage) {
            votacionSlotModalMessage.className = 'message error';
            votacionSlotModalMessage.textContent = 'Error de conexión. Intenta nuevamente.';
            votacionSlotModalMessage.style.display = 'block';
        }
    }
}

if (btnVotacionSlotConfirm) {
    btnVotacionSlotConfirm.addEventListener('click', () => {
        enviarVotoActual('crear');
    });
}

if (btnVotacionSlotDelete) {
    btnVotacionSlotDelete.addEventListener('click', () => {
        enviarVotoActual('eliminar');
    });
}

// Recalcular SLOT_HEIGHT al cambiar el viewport y re-renderizar
window.addEventListener('resize', () => {
    const nuevaAltura = getSlotHeight();
    if (nuevaAltura !== SLOT_HEIGHT) {
        SLOT_HEIGHT = nuevaAltura;
        console.log('[RESPONSIVE] SLOT_HEIGHT actualizado:', SLOT_HEIGHT);
        renderizarClases(clasesRenderizadas);

        // Si estamos en el panel de votación, volver a dibujar las cards
        try {
            const params = new URLSearchParams(window.location.search);
            const sectionActual = params.get('section');
            if (sectionActual === 'votacion-panel') {
                const auxMateriaIdRaw = params.get('auxMateriaId');
                const auxMateriaId = auxMateriaIdRaw ? parseInt(auxMateriaIdRaw, 10) : NaN;
                if (auxMateriaId && !Number.isNaN(auxMateriaId)) {
                    cargarDisponibilidadVotacion(auxMateriaId);
                }
            }
        } catch (e) {
            console.warn('No se pudo recargar disponibilidad de votación tras el resize:', e);
        }
    }
});

// Inicializa el botón que activa/desactiva el modo edición del horario
function desactivarEdicionHorario() {
    modoEdicionHorario = false;
    actualizarCeldasEditables(false);
    const toolbar = document.querySelector('.horario-toolbar');
    if (toolbar) toolbar.classList.toggle('active', false);
    const btnToggle = document.getElementById('btnToggleEdicionHorario');
    if (btnToggle) {
        btnToggle.classList.remove('active');
        btnToggle.textContent = 'Editar';
    }
}

// Inicializa el botón que activa/desactiva el modo edición del horario
function inicializarToggleEdicionHorario() {
    let btnToggle = document.getElementById('btnToggleEdicionHorario');
    if (!btnToggle) return;

    // Siempre desactivar edición al (re)inicializar
    desactivarEdicionHorario();

    // Limpiar posibles listeners anteriores para evitar duplicados
    const btnClean = btnToggle.cloneNode(true);
    btnToggle.parentNode.replaceChild(btnClean, btnToggle);
    btnToggle = btnClean;

    // Mostrar/ocultar el botón según la sección actual
    if (!puedeVerDisponibilidad()) {
        btnToggle.style.display = 'none';
        btnToggle.classList.remove('active');
        btnToggle.textContent = 'Editar';
        return;
    }

    btnToggle.style.display = 'inline-flex';
    btnToggle.textContent = 'Editar';
    btnToggle.classList.remove('active');

    btnToggle.addEventListener('click', () => {
        modoEdicionHorario = !modoEdicionHorario;
        btnToggle.classList.toggle('active', modoEdicionHorario);
        btnToggle.textContent = modoEdicionHorario ? 'Dejar de editar' : 'Editar';
        actualizarCeldasEditables(modoEdicionHorario);
        const toolbarInner = document.querySelector('.horario-toolbar');
        if (toolbarInner) toolbarInner.classList.toggle('active', modoEdicionHorario);
    });
}

// Función para crear la tarjeta de clase
function crearClaseCard(clase, altura, offset, conflictosIds) {
    const card = document.createElement('div');
    let tipoClaseClass = 'normal';
    if (clase.tipo_clase === 2) tipoClaseClass = 'auxiliatura';
    if (clase.tipo_clase === 3) tipoClaseClass = 'auxiliatura-dictada';

    card.className = `clase-card ${tipoClaseClass}`;

    // Establecer el color del borde y propagarlo a la tarjeta
    const colorMateria = clase.color || '#2196F3';
    card.style.borderColor = colorMateria;
    card.style.setProperty('--clase-color', colorMateria);
    
    // Establecer altura y posición (una altura por bloque horario)
    const alturaFinal = Math.max(altura, SLOT_HEIGHT);
    card.style.height = `${alturaFinal}px`;
    card.style.top = `${offset}px`;
    // Modo compacto/tall según altura
    if (alturaFinal <= SLOT_HEIGHT * 1.5) {
        // Tarjetas muy bajas: mostrar solo el título de la materia
        card.classList.add('compact');
    } else if (alturaFinal >= SLOT_HEIGHT * 2) {
        // Tarjetas que ocupan claramente más de una grilla: distribuir contenido
        card.classList.add('tall');
    }
    
    // Formatear el horario
    let horaInicio = typeof clase.hora_inicio === 'string' 
        ? clase.hora_inicio.substring(0, 5) 
        : clase.hora_inicio;
    let horaFin = typeof clase.hora_fin === 'string' 
        ? clase.hora_fin.substring(0, 5) 
        : clase.hora_fin;
    
    card.innerHTML = `
        <div class="clase-nombre">${clase.materia_nombre}</div>
        <div>                               
        <div class="clase-info">
            <span class="clase-docente">${clase.docente}</span>
            <span>
                <span class="clase-codigo">${clase.sigla}</span>
                <span class="clase-grupo">${clase.grupo}</span>
            </span>
        </div>
        <div class="clase-badges">
            <span class="badge">${clase.aula}</span>
            <span class="badge-hora">${horaInicio} - ${horaFin}</span>
        </div>
        </div>
    `;

    if (conflictosIds && conflictosIds.has(clase.id)) {
        card.classList.add('conflict');
        card.dataset.conflict = 'true';
    }
    
    // Comportamiento dinámico según modo de edición:
    // - Modo visualización: abre detalle de clase
    // - Modo edición: abre acciones de clase (editar/eliminar)
    card.addEventListener('click', (event) => {
        if (puedeGestionarHorario()) {
            event.stopPropagation();
            abrirAccionesClase(clase);
        } else {
            abrirDetalleClase(clase);
        }
    });
    
    return card;
}

// ============================================
// FUNCIONES PARA EL HORARIO Y LAS CLASES
// ============================================

const addClassModal = document.getElementById('addClassModal');
const addClassTitle = document.getElementById('addClassTitle');
const addClassMessage = document.getElementById('addClassMessage');
const slotResumen = document.getElementById('slotResumen');
const diaHidden = document.getElementById('dia_semana');
const horaHidden = document.getElementById('hora_slot');
const deleteClassBtn = document.getElementById('deleteClassBtn');
const btnNuevaClase = document.getElementById('btnNuevaClase');
const btnGestionMaterias = document.getElementById('btnGestionMaterias');
const btnNuevaMateria = document.getElementById('btnNuevaMateria');
const materiaSelect = document.getElementById('materia');
const diaSelect = document.getElementById('dia_select');
const confirmDeleteClassModal = document.getElementById('confirmDeleteClassModal');
const confirmDeleteClassText = document.getElementById('confirmDeleteClassText');
const confirmDeleteClassMessage = document.getElementById('confirmDeleteClassMessage');
const btnConfirmDeleteClass = document.getElementById('btnConfirmDeleteClass');
const confirmDeleteMateriaModal = document.getElementById('confirmDeleteMateriaModal');
const confirmDeleteMateriaText = document.getElementById('confirmDeleteMateriaText');
const confirmDeleteMateriaMessage = document.getElementById('confirmDeleteMateriaMessage');
const btnConfirmDeleteMateria = document.getElementById('btnConfirmDeleteMateria');

const materiasListModal = document.getElementById('materiasListModal');
const materiaFormModal = document.getElementById('materiaFormModal');
const btnNuevaMateriaModal = document.getElementById('btnNuevaMateriaModal');
const materiaForm = document.getElementById('materiaForm');
const materiaMessage = document.getElementById('materiaMessage');
const materiasListEl = document.getElementById('materiasList');
const materiaNombreInput = document.getElementById('materia_nombre');
const materiaSiglaInput = document.getElementById('materia_sigla');
const materiaIdInput = document.getElementById('materia_id');
const materiaSaveBtn = document.getElementById('materiaSaveBtn');
const materiaColorSelector = document.getElementById('materiaColorSelector');
const materiaColorInput = document.getElementById('materia_color');
const DEFAULT_MATERIA_COLOR = '#2196F3';
const claseSiglaInput = document.getElementById('sigla');
const claseDocenteInput = document.getElementById('docente');
const claseGrupoInput = document.getElementById('grupo');
const materiaDocenteInput = document.getElementById('materia_docente');
const materiaGrupoInput = document.getElementById('materia_grupo');
const classDetailModal = document.getElementById('classDetailModal');
const detailColorBar = document.getElementById('detailColorBar');
const detailMateria = document.getElementById('detailMateria');
const detailSigla = document.getElementById('detailSigla');
const detailDocente = document.getElementById('detailDocente');
const detailGrupo = document.getElementById('detailGrupo');
const detailAula = document.getElementById('detailAula');
const detailHorario = document.getElementById('detailHorario');
const classActionsModal = document.getElementById('classActionsModal');
const classActionsColor = document.getElementById('classActionsColor');
const classActionsMateria = document.getElementById('classActionsMateria');
const classActionsDocente = document.getElementById('classActionsDocente');
const classActionsGrupo = document.getElementById('classActionsGrupo');
const classActionsHorario = document.getElementById('classActionsHorario');
const classActionAddBtn = document.getElementById('classActionAdd');
const classActionEditBtn = document.getElementById('classActionEdit');
const classActionDeleteBtn = document.getElementById('classActionDelete');
let materiaPendienteEliminarId = null;

function nombreDia(dia) {
    const nombres = [null, 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return nombres[dia] || 'Día';
}

function sincronizarSelectorColor(selector, color) {
    if (!selector) return;
    selector.querySelectorAll('.color-option').forEach(opt => {
        opt.classList.toggle('selected', opt.getAttribute('data-color') === color);
    });
}

function setMateriaColor(color = DEFAULT_MATERIA_COLOR) {
    if (materiaColorInput) materiaColorInput.value = color;
    sincronizarSelectorColor(materiaColorSelector, color);
}

function sumarHoras(hora = '07:00', horas = DEFAULT_DURATION_HOURS) {
    const [h, m] = hora.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m);
    date.setMinutes(date.getMinutes() + (horas * 60));
    return date.toTimeString().substring(0, 5);
}

function actualizarDuracionLabel(inicio, fin) {
    const durationEl = document.getElementById('duration');
    if (!durationEl || !inicio || !fin) return;
    const [hI, mI] = inicio.split(':').map(Number);
    const [hF, mF] = fin.split(':').map(Number);
    const minutosInicio = hI * 60 + (mI || 0);
    const minutosFin = hF * 60 + (mF || 0);
    const diferencia = minutosFin - minutosInicio;
    if (diferencia <= 0) return;
    const horas = Math.floor(diferencia / 60);
    const minutos = diferencia % 60;
    const partes = [];
    if (horas > 0) partes.push(`${horas}h`);
    if (minutos > 0) partes.push(`${minutos}min`);
    durationEl.textContent = partes.join(' ') || '—';
}

function establecerSlot(dia, hora) {
    diaSeleccionado = dia ? parseInt(dia) : null;
    horaSeleccionada = hora || null;

    if (diaHidden) diaHidden.value = diaSeleccionado ?? '';
    if (horaHidden) horaHidden.value = horaSeleccionada ?? '';
    if (diaSelect && diaSeleccionado) diaSelect.value = String(diaSeleccionado);

    if (slotResumen) {
        if (diaSeleccionado && horaSeleccionada) {
            slotResumen.textContent = `${nombreDia(diaSeleccionado)} • ${horaSeleccionada}`;
        } else {
            slotResumen.textContent = 'Selecciona un bloque en el horario';
        }
    }
}

function mostrarModal(modalEl) {
    if (!modalEl) return;
    modalEl.classList.add('show');
    modalEl.setAttribute('aria-hidden', 'false');
}

function cerrarModal(modalEl) {
    if (!modalEl) return;
    modalEl.classList.remove('show');
    modalEl.setAttribute('aria-hidden', 'true');
}

function mostrarMensaje(element, type, text) {
    if (!element) return;
    element.className = `message ${type}`;
    element.textContent = text;
    element.style.display = 'block';
}

function ocultarMensaje(element) {
    if (!element) return;
    element.style.display = 'none';
}

function abrirDetalleClase(clase) {
    if (!classDetailModal) return;
    if (detailColorBar) detailColorBar.style.background = clase.color || '#2563EB';
    if (detailMateria) detailMateria.textContent = clase.materia_nombre || 'Materia';
    if (detailSigla) detailSigla.textContent = clase.sigla || '—';
    if (detailDocente) detailDocente.textContent = clase.docente || '—';
    if (detailGrupo) detailGrupo.textContent = clase.grupo || '—';
    if (detailAula) detailAula.textContent = clase.aula || '—';
    const horaInicio = typeof clase.hora_inicio === 'string' ? clase.hora_inicio.substring(0,5) : clase.hora_inicio;
    const horaFin = typeof clase.hora_fin === 'string' ? clase.hora_fin.substring(0,5) : clase.hora_fin;
    if (detailHorario) detailHorario.textContent = `${horaInicio || '--:--'} - ${horaFin || '--:--'}`;
    mostrarModal(classDetailModal);
}

function abrirAccionesClase(clase) {
    claseSeleccionada = clase;
    if (!classActionsModal) {
        abrirModalEditarClase(clase);
        return;
    }
    if (classActionsColor) classActionsColor.style.background = clase.color || '#2563EB';
    if (classActionsMateria) classActionsMateria.textContent = clase.materia_nombre || 'Materia';
    if (classActionsDocente) classActionsDocente.textContent = clase.docente || 'Docente';
    if (classActionsGrupo) classActionsGrupo.textContent = clase.grupo ? `Grupo ${clase.grupo}` : '';
    const horaInicio = typeof clase.hora_inicio === 'string' ? clase.hora_inicio.substring(0,5) : clase.hora_inicio;
    const horaFin = typeof clase.hora_fin === 'string' ? clase.hora_fin.substring(0,5) : clase.hora_fin;
    if (classActionsHorario) classActionsHorario.textContent = `${nombreDia(parseInt(clase.dia_semana))} · ${horaInicio} - ${horaFin}`;
    mostrarModal(classActionsModal);
}

async function cargarMaterias(force = false) {
    if (!force && materiasCache.length) {
        poblarSelectMaterias(materiasCache);
        return materiasCache;
    }

    try {
        const response = await fetch('/api/materias', { credentials: 'include' });
        if (!response.ok) throw new Error('No se pudo cargar materias');
        const materias = await response.json();
        materiasCache = materias;
        poblarSelectMaterias(materias);
        return materias;
    } catch (error) {
        console.error('Error al cargar materias:', error);
        mostrarMensaje(materiaMessage, 'error', 'Error al cargar materias');
        return [];
    }
}

function poblarSelectMaterias(materias) {
    if (!materiaSelect) return;
    materiaSelect.innerHTML = '<option value="">Seleccionar materia</option>';
    materias.forEach(materia => {
        const option = document.createElement('option');
        option.value = materia.id;
        option.textContent = materia.sigla 
            ? `${materia.sigla} · ${materia.nombre}` 
            : materia.nombre;
        materiaSelect.appendChild(option);
    });

    sincronizarSiglaConMateria();
}

async function abrirModalAgregarClase(dia = null, hora = null) {
    if (!puedeGestionarHorario()) return;
    claseSeleccionada = null;
    if (classActionsModal) cerrarModal(classActionsModal);
    if (addClassTitle) addClassTitle.textContent = 'Agregar clase';
    if (deleteClassBtn) deleteClassBtn.style.display = 'none';

    await cargarMaterias();

    if (addClassForm) addClassForm.reset();
    if (claseSiglaInput) {
        claseSiglaInput.dataset.autofill = '0';
    }

    const horaBase = hora || '07:00';
    establecerSlot(dia || 1, horaBase);

    const horaInicioInput = document.getElementById('hora_inicio');
    const horaFinInput = document.getElementById('hora_fin');
    if (horaInicioInput) horaInicioInput.value = horaBase;
    if (horaFinInput) horaFinInput.value = sumarHoras(horaBase, DEFAULT_DURATION_HOURS);
    actualizarDuracionLabel(
        horaInicioInput ? horaInicioInput.value : horaBase,
        horaFinInput ? horaFinInput.value : sumarHoras(horaBase, DEFAULT_DURATION_HOURS)
    );

    ocultarMensaje(addClassMessage);
    mostrarModal(addClassModal);
}

async function abrirModalEditarClase(clase) {
    if (!puedeGestionarHorario()) return;
    claseSeleccionada = clase;
    if (classActionsModal) cerrarModal(classActionsModal);
    if (addClassTitle) addClassTitle.textContent = 'Editar clase';
    if (deleteClassBtn) deleteClassBtn.style.display = 'inline-flex';

    await cargarMaterias();

    if (materiaSelect && clase.id_materia) materiaSelect.value = String(clase.id_materia);
    if (claseSiglaInput) {
        claseSiglaInput.value = clase.sigla || '';
        claseSiglaInput.dataset.autofill = '0';
    }
    if (document.getElementById('docente')) document.getElementById('docente').value = clase.docente || '';
    if (document.getElementById('grupo')) document.getElementById('grupo').value = clase.grupo || '';
    if (document.getElementById('aula')) document.getElementById('aula').value = clase.aula || '';

    const horaInicio = typeof clase.hora_inicio === 'string' ? clase.hora_inicio.substring(0, 5) : clase.hora_inicio;
    const horaFin = typeof clase.hora_fin === 'string' ? clase.hora_fin.substring(0, 5) : clase.hora_fin;

    if (document.getElementById('hora_inicio')) document.getElementById('hora_inicio').value = horaInicio || '';
    if (document.getElementById('hora_fin')) document.getElementById('hora_fin').value = horaFin || '';
    actualizarDuracionLabel(horaInicio, horaFin);

    establecerSlot(clase.dia_semana, horaInicio);
    ocultarMensaje(addClassMessage);
    mostrarModal(addClassModal);
}

function cerrarTodosLosModales() {
    document.querySelectorAll('.modal').forEach(modal => cerrarModal(modal));
}

function enMinutos(hora) {
    if (typeof hora !== 'string') return 0;
    const [h, m] = hora.split(':').map(Number);
    return h * 60 + (m || 0);
}

function minutosAHora(min) {
    const horas = Math.floor(min / 60);
    const minutos = min % 60;
    return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
}

function detectarConflictos(clases) {
    const conflictosMapa = new Map();
    const idsConflicto = new Set();
    const porDia = {};

    clases.forEach(clase => {
        const dia = parseInt(clase.dia_semana);
        if (!porDia[dia]) porDia[dia] = [];
        const horaInicio = typeof clase.hora_inicio === 'string' ? clase.hora_inicio.substring(0,5) : clase.hora_inicio;
        const horaFin = typeof clase.hora_fin === 'string' ? clase.hora_fin.substring(0,5) : clase.hora_fin;
        porDia[dia].push({
            ...clase,
            _inicioMin: enMinutos(horaInicio),
            _finMin: enMinutos(horaFin),
            _horaInicio: horaInicio,
            _horaFin: horaFin
        });
    });

    Object.entries(porDia).forEach(([dia, lista]) => {
        lista.sort((a, b) => a._inicioMin - b._inicioMin);
        const activos = [];

        lista.forEach(clase => {
            // quitar los que ya terminaron
            for (let i = activos.length - 1; i >= 0; i--) {
                if (activos[i]._finMin <= clase._inicioMin) {
                    activos.splice(i, 1);
                }
            }

            activos.forEach(activo => {
                const overlapInicio = Math.max(activo._inicioMin, clase._inicioMin);
                const overlapFin = Math.min(activo._finMin, clase._finMin);
                if (overlapInicio < overlapFin) {
                    const key = `${dia}-${overlapInicio}-${overlapFin}`;
                    let conflicto = conflictosMapa.get(key);
                    if (!conflicto) {
                        conflicto = {
                            dia: parseInt(dia),
                            horaInicio: minutosAHora(overlapInicio),
                            horaFin: minutosAHora(overlapFin),
                            clases: []
                        };
                        conflictosMapa.set(key, conflicto);
                    }

                    const agregarClase = (c) => {
                        if (!conflicto.clases.some(item => item.id === c.id)) {
                            conflicto.clases.push({
                                id: c.id,
                                materia: c.materia_nombre,
                                sigla: c.sigla,
                                grupo: c.grupo
                            });
                        }
                        idsConflicto.add(c.id);
                    };

                    agregarClase(activo);
                    agregarClase(clase);
                }
            });

            activos.push(clase);
        });
    });

    const lista = Array.from(conflictosMapa.values()).map(item => ({
        dia: item.dia,
        diaNombre: nombreDia(item.dia),
        horaInicio: item.horaInicio,
        horaFin: item.horaFin,
        clases: item.clases
    }));

    return { ids: idsConflicto, lista };
}

// Actualiza las tarjetas resumen de la parte superior del dashboard
function actualizarDashboardSummary(clases, conflictosLista) {
    const summaryContainer = document.getElementById('dashboardSummary');
    if (!summaryContainer) return;

    // Para administradores no se muestra el resumen de estudiante
    if (rolUsuarioActual === 3) {
        summaryContainer.style.display = 'none';
        return;
    }

    // Mostrar solo en la vista principal (sin parámetro section)
    const esInicio = !seccionActual;
    summaryContainer.style.display = esInicio ? 'block' : 'none';
    if (!esInicio) return;

    const listaClases = Array.isArray(clases) ? clases : [];
    const listaConflictos = Array.isArray(conflictosLista) ? conflictosLista : [];

    // Materias inscritas: contar materias distintas
    const materiasSet = new Set();
    listaClases.forEach(c => {
        if (c.id_materia != null) {
            materiasSet.add(c.id_materia);
        } else if (c.materia_nombre) {
            materiasSet.add(c.materia_nombre);
        }
    });
    const totalMaterias = materiasSet.size;

    // Auxiliaturas inscritas: clases tipo 2
    const totalAuxiliaturas = listaClases.filter(c => c.tipo_clase === 2).length;

    // Choques de horario: cantidad de bloques en conflicto detectados
    const totalChoques = listaConflictos.length;

    // Notificaciones/alertas: por ahora 0 hasta tener endpoint dedicado
    const totalNotificaciones = 0;

    const elMaterias = document.getElementById('summaryMaterias');
    const elAux = document.getElementById('summaryAuxiliaturas');
    const elNotif = document.getElementById('summaryNotificaciones');
    const elChoques = document.getElementById('summaryChoques');

    if (elMaterias) elMaterias.textContent = String(totalMaterias);
    if (elAux) elAux.textContent = String(totalAuxiliaturas);
    if (elNotif) elNotif.textContent = String(totalNotificaciones);
    if (elChoques) elChoques.textContent = String(totalChoques);
}

// Cargar y mostrar el dashboard específico del administrador
async function cargarAdminDashboard() {
    const adminSummary = document.getElementById('adminDashboardSummary');
    if (!adminSummary) return;

    // Solo aplica para rol admin
    if (rolUsuarioActual !== 3) {
        adminSummary.style.display = 'none';
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const section = params.get('section');
    const esInicio = !section;

    const studentSummary = document.getElementById('dashboardSummary');
    const horarioSectionEl = document.querySelector('.horario-section');

    if (!esInicio) {
        adminSummary.style.display = 'none';
        if (studentSummary) studentSummary.style.display = 'none';
        if (horarioSectionEl) horarioSectionEl.style.display = 'none';
        return;
    }

    // Vista de inicio para admin: mostrar tarjetas admin y ocultar horario/resumen de estudiante
    adminSummary.style.display = 'block';
    if (studentSummary) studentSummary.style.display = 'none';
    if (horarioSectionEl) horarioSectionEl.style.display = 'none';

    try {
        const res = await fetch('/api/admin/dashboard-stats', {
            method: 'GET',
            credentials: 'include',
        });
        if (!res.ok) {
            console.error('Error al obtener estadísticas del dashboard admin:', res.status);
            return;
        }
        const data = await res.json();

        const usuarios = data.usuarios || {};
        const setText = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = String(value ?? 0);
        };

        const totalUsuarios = usuarios.total || 0;
        const totalEst = usuarios.estudiantes || 0;
        const totalAux = usuarios.auxiliares || 0;
        const totalAdm = usuarios.administradores || 0;

        // Tarjetas de resumen
        setText('adminSummaryUsuariosTotal', totalUsuarios);
        setText('adminSummaryEstudiantes', totalEst);
        setText('adminSummaryAuxiliares', totalAux);
        setText('adminSummaryAdmins', totalAdm);
        setText('adminSummaryAulas', data.aulas || 0);
        setText('adminSummaryCarreras', data.carreras || 0);
        setText('adminSummaryMateriasGlobales', data.materias_globales || 0);
        setText('adminSummaryHorarios', data.horarios_importados || 0);

        // Gráficas simples de barras
        const totalRoles = Math.max(totalEst + totalAux + totalAdm, 1);
        const setBar = (barId, value, total) => {
            const bar = document.getElementById(barId);
            if (!bar) return;
            const pct = Math.max(4, Math.min(100, Math.round((value / total) * 100)));
            bar.style.width = `${pct}%`;
        };

        setBar('adminChartEstudiantesBar', totalEst, totalRoles);
        setBar('adminChartAuxiliaresBar', totalAux, totalRoles);
        setBar('adminChartAdminsBar', totalAdm, totalRoles);

        setText('adminChartEstudiantesValue', totalEst);
        setText('adminChartAuxiliaresValue', totalAux);
        setText('adminChartAdminsValue', totalAdm);

        const aulas = data.aulas || 0;
        const horarios = data.horarios_importados || 0;
        const maxAH = Math.max(aulas, horarios, 1);

        setBar('adminChartAulasBar', aulas, maxAH);
        setBar('adminChartHorariosBar', horarios, maxAH);

        setText('adminChartAulasValue', aulas);
        setText('adminChartHorariosValue', horarios);
    } catch (error) {
        console.error('Error de red al cargar estadísticas admin:', error);
    }
}

function renderConflictos(conflictos) {
    const container = document.getElementById('horarioConflicts');
    if (!container) return;

    if (!conflictos || conflictos.length === 0) {
        container.style.display = 'none';
        container.classList.remove('show');
        container.innerHTML = '';
        return;
    }

    container.innerHTML = `
        <h3>Conflictos detectados</h3>
        <p>Revisa las clases que se superponen en el mismo horario:</p>
    `;

    conflictos.forEach(conflicto => {
        const item = document.createElement('div');
        item.className = 'conflict-item';
        item.innerHTML = `
            <span class="conflict-time">${conflicto.diaNombre} · ${conflicto.horaInicio} - ${conflicto.horaFin}</span>
            <div class="conflict-classes">
                ${conflicto.clases.map(cls => `
                    <span class="conflict-chip">${cls.sigla || ''} ${cls.grupo ? `(${cls.grupo})` : ''} · ${cls.materia}</span>
                `).join('')}
            </div>
        `;
        container.appendChild(item);
    });

    const modal = document.getElementById('conflictsModal');
    if (modal) {
        container.dataset.hasContent = '1';
        modal.classList.add('show');
        modal.setAttribute('aria-hidden', 'false');
    }
}

function aplicarLayoutConflictos() {
    const cells = document.querySelectorAll('.schedule-cell');
    cells.forEach(cell => {
        const conflictCards = Array.from(cell.querySelectorAll('.clase-card.conflict'));
        const total = conflictCards.length;

        conflictCards.forEach(card => {
            card.style.width = '';
            card.style.left = '';
            card.style.right = '';
        });

        if (total > 1) {
            const widthPercent = 100 / total;
            conflictCards.forEach((card, index) => {
                card.style.width = `calc(${widthPercent}% - 6px)`;
                card.style.left = `calc(${widthPercent * index}% + 2px)`;
                card.style.right = 'auto';
            });
        }
    });
}

if (deleteClassBtn) {
    deleteClassBtn.addEventListener('click', () => {
        if (!claseSeleccionada) return;
        abrirConfirmacionEliminarClase();
    });
}

if (btnNuevaClase) {
    btnNuevaClase.addEventListener('click', () => {
        if (!puedeGestionarHorario()) return;
        abrirModalAgregarClase();
    });
}

if (btnGestionMaterias) {
    btnGestionMaterias.addEventListener('click', () => {
        if (!puedeGestionarHorario()) return;
        abrirMateriaModal();
    });
}

if (btnNuevaMateria) {
    btnNuevaMateria.addEventListener('click', () => {
        if (!puedeGestionarHorario()) return;
        abrirMateriaFormModal();
    });
}

if (btnNuevaMateriaModal) {
    btnNuevaMateriaModal.addEventListener('click', () => {
        abrirMateriaFormModal();
    });
}

if (classActionAddBtn) {
    classActionAddBtn.addEventListener('click', () => {
        if (!claseSeleccionada) return;
        const horaBase = typeof claseSeleccionada.hora_inicio === 'string'
            ? claseSeleccionada.hora_inicio.substring(0,5)
            : claseSeleccionada.hora_inicio;
        cerrarModal(classActionsModal);
        abrirModalAgregarClase(claseSeleccionada.dia_semana, horaBase);
    });
}

if (classActionEditBtn) {
    classActionEditBtn.addEventListener('click', () => {
        if (!claseSeleccionada) return;
        cerrarModal(classActionsModal);
        abrirModalEditarClase(claseSeleccionada);
    });
}

if (classActionDeleteBtn) {
    classActionDeleteBtn.addEventListener('click', () => {
        if (!claseSeleccionada) return;
        cerrarModal(classActionsModal);
        abrirConfirmacionEliminarClase();
    });
}

if (btnConfirmDeleteClass) {
    btnConfirmDeleteClass.addEventListener('click', eliminarClaseActual);
}

if (diaSelect) {
    diaSelect.addEventListener('change', (event) => {
        const nuevoDia = parseInt(event.target.value);
        const horaInicioActual = document.getElementById('hora_inicio')?.value || horaSeleccionada;
        establecerSlot(nuevoDia, horaInicioActual);
    });
}

function sincronizarSiglaConMateria() {
    if (!materiaSelect) return;
    const materiaId = parseInt(materiaSelect.value);
    if (!materiaId) return;
    const materia = materiasCache.find(item => item.id === materiaId);
    if (!materia) return;
    // Sigla
    if (claseSiglaInput && materia.sigla) {
        const fillSigla = !claseSiglaInput.value || claseSiglaInput.dataset.autofill === '1';
        if (fillSigla) {
            claseSiglaInput.value = materia.sigla;
            claseSiglaInput.dataset.autofill = '1';
        }
    }
    // Docente
    if (claseDocenteInput && materia.docente) {
        const fillDoc = !claseDocenteInput.value || claseDocenteInput.dataset.autofill === '1';
        if (fillDoc) {
            claseDocenteInput.value = materia.docente;
            claseDocenteInput.dataset.autofill = '1';
        }
    }
    // Grupo
    if (claseGrupoInput && materia.grupo) {
        const fillGrupo = !claseGrupoInput.value || claseGrupoInput.dataset.autofill === '1';
        if (fillGrupo) {
            claseGrupoInput.value = materia.grupo;
            claseGrupoInput.dataset.autofill = '1';
        }
    }
}

if (claseSiglaInput) {
    claseSiglaInput.addEventListener('input', () => {
        claseSiglaInput.dataset.autofill = '0';
    });
}

if (claseDocenteInput) {
    claseDocenteInput.addEventListener('input', () => {
        claseDocenteInput.dataset.autofill = '0';
    });
}

if (claseGrupoInput) {
    claseGrupoInput.addEventListener('input', () => {
        claseGrupoInput.dataset.autofill = '0';
    });
}

if (materiaSelect) {
    materiaSelect.addEventListener('change', () => {
        sincronizarSiglaConMateria();
    });
}

// Selector de color
document.addEventListener('click', (e) => {
    const option = e.target.closest('.color-option');
    if (!option) return;
    const selector = option.closest('.color-selector');
    if (!selector) return;

    selector.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
    option.classList.add('selected');

    const inputId = selector.getAttribute('data-input-target');
    if (inputId) {
        const targetInput = document.getElementById(inputId);
        if (targetInput) {
            targetInput.value = option.getAttribute('data-color');
        }
    }
});

if (materiaColorInput) {
    materiaColorInput.addEventListener('input', (event) => {
        sincronizarSelectorColor(materiaColorSelector, event.target.value);
    });
}

// Calcular duración
document.addEventListener('change', (e) => {
    if (e.target.id === 'hora_inicio' || e.target.id === 'hora_fin') {
        const inicio = document.getElementById('hora_inicio').value;
        const fin = document.getElementById('hora_fin').value;

        if (e.target.id === 'hora_inicio') {
            const diaActual = diaSelect ? parseInt(diaSelect.value) : diaSeleccionado;
            establecerSlot(diaActual, inicio);
        }
        
        if (inicio && fin) {
            actualizarDuracionLabel(inicio, fin);
        }
    }
});

document.addEventListener('click', (e) => {
    if (e.target.matches('[data-close-modal]')) {
        const modal = e.target.closest('.modal');
        if (modal) cerrarModal(modal);
        ocultarMensaje(addClassMessage);
        ocultarMensaje(materiaMessage);
    }
});

const addClassForm = document.getElementById('addClassForm');
if (addClassForm) {
    addClassForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        ocultarMensaje(addClassMessage);

        if (!diaSeleccionado || !horaSeleccionada) {
            mostrarMensaje(addClassMessage, 'error', 'Selecciona un bloque del horario.');
            return;
        }

        const diaSeleccionadoFormulario = diaSelect ? parseInt(diaSelect.value) : diaSeleccionado;
        const tipoClase = claseSeleccionada?.tipo_clase ?? 1;
        const formData = {
            id_materia: parseInt(document.getElementById('materia').value),
            sigla: document.getElementById('sigla').value.trim(),
            docente: document.getElementById('docente').value.trim(),
            grupo: document.getElementById('grupo').value.trim(),
            dia_semana: diaSeleccionadoFormulario,
            hora_inicio: document.getElementById('hora_inicio').value,
            hora_fin: document.getElementById('hora_fin').value,
            tipo_clase: tipoClase,
            aula: document.getElementById('aula').value.trim()
        };

        if (!formData.id_materia) {
            mostrarMensaje(addClassMessage, 'error', 'Selecciona una materia.');
            return;
        }
        if (!formData.hora_inicio || !formData.hora_fin) {
            mostrarMensaje(addClassMessage, 'error', 'Selecciona las horas de inicio y fin.');
            return;
        }
        if (!diaSeleccionadoFormulario) {
            mostrarMensaje(addClassMessage, 'error', 'Selecciona el día.');
            return;
        }
        if (formData.hora_fin <= formData.hora_inicio) {
            mostrarMensaje(addClassMessage, 'error', 'La hora de fin debe ser mayor que la de inicio.');
            return;
        }
        diaSeleccionado = diaSeleccionadoFormulario;

        try {
            if (!claseSeleccionada) {
                // Crear nueva clase
                const response = await fetch('/api/clases', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                const data = await response.json();

                if (!response.ok) {
                    mostrarMensaje(addClassMessage, 'error', data.message || 'Error al crear la clase');
                    return;
                }

                // Inscribir al usuario en la clase recién creada
                await fetch('/api/inscripciones', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id_clase: data.clase.id })
                });

                mostrarMensaje(addClassMessage, 'success', 'Clase agregada correctamente');
            } else {
                // Editar clase existente
                const response = await fetch(`/api/clases/${claseSeleccionada.id}`, {
                    method: 'PUT',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                const data = await response.json();

                if (!response.ok) {
                    mostrarMensaje(addClassMessage, 'error', data.message || 'Error al actualizar la clase');
                    return;
                }

                mostrarMensaje(addClassMessage, 'success', 'Clase actualizada correctamente');
            }

            setTimeout(() => {
                cerrarModal(addClassModal);
                ocultarMensaje(addClassMessage);
                cargarMiHorario();
            }, 900);
        } catch (err) {
            console.error(err);
            mostrarMensaje(addClassMessage, 'error', 'Error de conexión');
        }
    });
}

async function eliminarClaseActual() {
    if (!claseSeleccionada) return;

    try {
        const response = await fetch(`/api/clases/${claseSeleccionada.id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        const data = await response.json();
        if (!response.ok) {
            mostrarMensaje(confirmDeleteClassMessage || addClassMessage, 'error', data.message || 'No se pudo eliminar la clase');
            return;
        }
        mostrarMensaje(confirmDeleteClassMessage, 'success', 'Clase eliminada');
        await cargarMiHorario();
        setTimeout(() => {
            cerrarModal(confirmDeleteClassModal);
            cerrarModal(addClassModal);
            ocultarMensaje(confirmDeleteClassMessage);
        }, 600);
    } catch (error) {
        console.error(error);
        mostrarMensaje(confirmDeleteClassMessage || addClassMessage, 'error', 'Error de conexión');
    }
}

function abrirConfirmacionEliminarClase() {
    if (!claseSeleccionada || !confirmDeleteClassModal) return;
    if (confirmDeleteClassText) {
        const horaInicio = typeof claseSeleccionada.hora_inicio === 'string'
            ? claseSeleccionada.hora_inicio.substring(0,5)
            : claseSeleccionada.hora_inicio;
        const horaFin = typeof claseSeleccionada.hora_fin === 'string'
            ? claseSeleccionada.hora_fin.substring(0,5)
            : claseSeleccionada.hora_fin;
        confirmDeleteClassText.textContent = `¿Eliminar ${claseSeleccionada.materia_nombre || 'la clase'} (${claseSeleccionada.sigla || ''}) el ${nombreDia(claseSeleccionada.dia_semana)} · ${horaInicio} - ${horaFin}?`;
    }
    ocultarMensaje(confirmDeleteClassMessage);
    mostrarModal(confirmDeleteClassModal);
}

function abrirMateriaModal() {
    cargarMaterias(true).then(renderMateriasList);
    if (materiasListModal) mostrarModal(materiasListModal);
}

function abrirMateriaFormModal() {
    materiaEditando = null;
    if (materiaForm) materiaForm.reset();
    setMateriaColor(DEFAULT_MATERIA_COLOR);
    if (materiaMessage) ocultarMensaje(materiaMessage);
    if (materiaSaveBtn) materiaSaveBtn.textContent = 'Guardar';
    if (materiaFormModal) mostrarModal(materiaFormModal);
}

function renderMateriasList(materias = materiasCache) {
    if (!materiasListEl) return;
    materiasListEl.innerHTML = '';
    if (!materias || materias.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'materia-item';
        empty.innerHTML = '<span>No hay materias registradas.</span>';
        materiasListEl.appendChild(empty);
        return;
    }

    materias.forEach(materia => {
        const item = document.createElement('div');
        item.className = 'materia-item';
        item.innerHTML = `
            <div class="materia-info">
                <span class="materia-color-dot" style="background:${materia.color || DEFAULT_MATERIA_COLOR};"></span>
                <div>
                    <span class="materia-nombre">${materia.nombre}</span>
                    <span class="materia-meta">${materia.color || DEFAULT_MATERIA_COLOR}</span>
                </div>
            </div>
            <div class="materia-sigla">
                <span class="sigla-pill">${materia.sigla || '—'}</span>
            </div>
            <div class="materia-actions">
                <button type="button" class="materia-edit" data-id="${materia.id}">Editar</button>
                <button type="button" class="materia-delete delete" data-id="${materia.id}">Eliminar</button>
            </div>
        `;
        materiasListEl.appendChild(item);
    });
}

if (materiaForm) {
    materiaForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombre = materiaNombreInput.value.trim();
        const sigla = materiaSiglaInput.value.trim().toUpperCase();
        const docente = materiaDocenteInput?.value.trim();
        const grupo = materiaGrupoInput?.value.trim();
        const color = materiaColorInput?.value || DEFAULT_MATERIA_COLOR;
        if (!nombre) {
            mostrarMensaje(materiaMessage, 'error', 'Ingresa el nombre de la materia.');
            return;
        }
        if (!sigla) {
            mostrarMensaje(materiaMessage, 'error', 'Ingresa la sigla de la materia.');
            return;
        }

        const id = materiaIdInput.value;
        const method = id ? 'PUT' : 'POST';
        const url = id ? `/api/materias/${id}` : '/api/materias';

        try {
            const response = await fetch(url, {
                method,
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre, sigla, docente, grupo, color })
            });
            const data = await response.json();
            if (!response.ok) {
                mostrarMensaje(materiaMessage, 'error', data.message || 'Error al guardar materia');
                return;
            }

            mostrarMensaje(materiaMessage, 'success', 'Materia guardada');
            const materias = await cargarMaterias(true);
            renderMateriasList(materias);
            await cargarMiHorario();

            // Resetear estado del formulario y cerrar modal para ver el cambio en el horario
            materiaForm.reset();
            setMateriaColor(DEFAULT_MATERIA_COLOR);
            materiaIdInput.value = '';
            if (materiaSiglaInput) materiaSiglaInput.value = '';
            if (materiaDocenteInput) materiaDocenteInput.value = '';
            if (materiaGrupoInput) materiaGrupoInput.value = '';
            materiaEditando = null;
            if (materiaSaveBtn) materiaSaveBtn.textContent = 'Guardar';

            setTimeout(() => {
                cerrarModal(materiaFormModal);
                ocultarMensaje(materiaMessage);
            }, 600);
        } catch (error) {
            console.error(error);
            mostrarMensaje(materiaMessage, 'error', 'Error de conexión');
        }
    });
}

document.addEventListener('click', (e) => {
    if (e.target.matches('.materia-edit')) {
        const id = parseInt(e.target.getAttribute('data-id'));
        const materia = materiasCache.find(m => m.id === id);
        if (!materia) return;
        materiaEditando = materia;
        materiaIdInput.value = materia.id;
        materiaNombreInput.value = materia.nombre;
        if (materiaSiglaInput) materiaSiglaInput.value = materia.sigla || '';
        if (materiaDocenteInput) materiaDocenteInput.value = materia.docente || '';
        if (materiaGrupoInput) materiaGrupoInput.value = materia.grupo || '';
        setMateriaColor(materia.color || DEFAULT_MATERIA_COLOR);
        if (materiaSaveBtn) materiaSaveBtn.textContent = 'Actualizar';
        mostrarMensaje(materiaMessage, 'info', 'Editando materia');
        if (materiaFormModal) mostrarModal(materiaFormModal);
    }

    if (e.target.matches('.materia-delete')) {
        const id = parseInt(e.target.getAttribute('data-id'));
        abrirConfirmacionEliminarMateria(id);
    }
});

async function eliminarMateria(id) {
    try {
        const response = await fetch(`/api/materias/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        const data = await response.json();
        if (!response.ok) {
            mostrarMensaje(materiaMessage, 'error', data.message || 'No se pudo eliminar la materia');
            return;
        }
        mostrarMensaje(materiaMessage, 'success', 'Materia eliminada');
        const materias = await cargarMaterias(true);
        renderMateriasList(materias);
        await cargarMiHorario();
        setTimeout(() => {
            cerrarModal(confirmDeleteMateriaModal);
            ocultarMensaje(materiaMessage);
        }, 600);
    } catch (error) {
        console.error(error);
        mostrarMensaje(materiaMessage, 'error', 'Error de conexión');
    }
}

function abrirConfirmacionEliminarMateria(id) {
    if (!confirmDeleteMateriaModal) return;
    if (confirmDeleteMateriaText) {
        const materia = materiasCache.find(m => m.id === id);
        confirmDeleteMateriaText.textContent = `¿Eliminar ${materia.nombre || 'la materia'} (${materia.sigla || ''})?`;
    }
    ocultarMensaje(confirmDeleteMateriaMessage);
    mostrarModal(confirmDeleteMateriaModal);
}
