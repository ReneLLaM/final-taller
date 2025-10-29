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
            const userInfo = document.getElementById('userInfo');
            userInfo.innerHTML = `
                <div class="user-info-item">
                    <div class="user-info-label">Nombre Completo</div>
                    <div class="user-info-value">${data.user.nombre_completo}</div>
                </div>
                <div class="user-info-item">
                    <div class="user-info-label">Carrera</div>
                    <div class="user-info-value">${data.user.carrera}</div>
                </div>
                <div class="user-info-item">
                    <div class="user-info-label">Código Universitario</div>
                    <div class="user-info-value">${data.user.cu}</div>
                </div>
                <div class="user-info-item">
                    <div class="user-info-label">Correo Electrónico</div>
                    <div class="user-info-value">${data.user.correo}</div>
                </div>
                <div class="user-info-item">
                    <div class="user-info-label">Rol ID</div>
                    <div class="user-info-value">${data.user.rol_id}</div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error al cargar información:', error);
        window.location.href = '/login.html';
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
            window.location.href = '/login.html';
        }
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        // Redirigir de todas formas
        window.location.href = '/login.html';
    }
}

// Cargar información al cargar la página
loadUserInfo();

