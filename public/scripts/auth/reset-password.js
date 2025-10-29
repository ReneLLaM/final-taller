// Obtener token de la URL
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

// Función para mostrar mensajes
function showMessage(message, type) {
    const messageElement = document.getElementById('message');
    messageElement.textContent = message;
    messageElement.className = `message ${type}`;
    messageElement.style.display = 'block';

    setTimeout(() => {
        messageElement.style.display = 'none';
    }, 5000);
}

// Verificar si hay token
if (!token) {
    showMessage('Token no válido o expirado', 'error');
    setTimeout(() => {
        window.location.href = '/pages/auth/forgot-password.html';
    }, 3000);
}

// Función para manejar reset de contraseña
async function handleResetPassword(event) {
    event.preventDefault();

    const contrasenia = document.getElementById('contrasenia').value;
    const contrasenia_confirm = document.getElementById('contrasenia_confirm').value;

    // Validar que las contraseñas coincidan
    if (contrasenia !== contrasenia_confirm) {
        showMessage('Las contraseñas no coinciden', 'error');
        return;
    }

    // Validar longitud mínima
    if (contrasenia.length < 6) {
        showMessage('La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }

    // Deshabilitar botón
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Restableciendo...';

    try {
        const response = await fetch('/api/reset-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token,
                contrasenia
            })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('Contraseña restablecida exitosamente. Redirigiendo...', 'success');
            setTimeout(() => {
                window.location.href = '/pages/auth/login.html';
            }, 2000);
        } else {
            showMessage(data.message || 'Error al restablecer contraseña', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error de conexión. Intenta nuevamente.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

// Función para toggle password
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    const icon = input.nextElementSibling.querySelector('.eye-icon');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.setAttribute('stroke', '#666');
    } else {
        input.type = 'password';
        icon.setAttribute('stroke', '#D9D9D9');
    }
}

// Agregar event listener
const resetPasswordForm = document.getElementById('resetPasswordForm');
if (resetPasswordForm) {
    resetPasswordForm.addEventListener('submit', handleResetPassword);
}

