// Función para manejar el registro
async function handleRegister(event) {
    event.preventDefault();

    const nombre_completo = document.getElementById('nombre_completo').value;
    const carrera = document.getElementById('carrera').value;
    const cu = document.getElementById('cu').value;
    const correo = document.getElementById('correo').value;
    const contrasenia = document.getElementById('contrasenia').value;
    const contrasenia_confirm = document.getElementById('contrasenia_confirm').value;

    // Validar que las contraseñas coincidan
    if (contrasenia !== contrasenia_confirm) {
        showMessage('Las contraseñas no coinciden', 'error');
        return;
    }

    // Validar longitud mínima de contraseña
    if (contrasenia.length < 6) {
        showMessage('La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }

    // El CU y carrera son opcionales, no se valida el formato

    // Deshabilitar botón
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Registrando...';

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nombre_completo,
                carrera,
                cu,
                correo,
                contrasenia
            })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('Registro exitoso. Redirigiendo...', 'success');
            // Redirigir a login después de 2 segundos
            setTimeout(() => {
                window.location.href = '/pages/auth/login.html';
            }, 2000);
        } else {
            showMessage(data.message || 'Error al registrar usuario', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error de conexión. Intenta nuevamente.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    // Autocompletado de carrera (lista oficial)
    if (typeof window.initCarreraAutocomplete === 'function') {
        window.initCarreraAutocomplete('carrera', 'carrerasList');
    }

    // Agregar event listener al formulario de registro
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
});

// CU y carrera son opcionales, sin validación automática de formato

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

