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

// Función para manejar recuperación de contraseña
async function handleForgotPassword(event) {
    event.preventDefault();

    const correo = document.getElementById('correo').value;

    // Deshabilitar botón
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';

    try {
        const response = await fetch('/api/forgot-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ correo })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('Se ha enviado un correo con instrucciones. Revisa tu bandeja de entrada.', 'success');
        } else {
            showMessage(data.message || 'Error al procesar solicitud', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error de conexión. Intenta nuevamente.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

// Agregar event listener
const forgotPasswordForm = document.getElementById('forgotPasswordForm');
if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener('submit', handleForgotPassword);
}

