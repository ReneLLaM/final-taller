# 🔐 Sistema de Recuperación de Contraseña

## ✅ Implementación Completada

### 1. **Página de Recuperación**
- ✅ `public/forgot-password.html` - Formulario para solicitar recuperación
- ✅ `public/js/forgot-password.js` - JavaScript para manejar el formulario
- ✅ Vista con header de USFX igual al login/registro

### 2. **Toggle Mostrar/Ocultar Contraseña**
- ✅ Botón de ojo en todos los campos de contraseña
- ✅ Funciona en login, registro y forgot-password
- ✅ Icono cambia: 👁️ (ver) / 🙈 (ocultar)
- ✅ Estilos CSS agregados

### 3. **Backend - Envío de Correos**
- ✅ Endpoint: `POST /api/forgot-password`
- ✅ Integración con nodemailer
- ✅ Genera token JWT válido por 1 hora
- ✅ Envía correo con enlace de recuperación

### 4. **Seguridad**
- ✅ No revela si el correo existe o no
- ✅ Token expira en 1 hora
- ✅ Mensaje genérico siempre devuelto

## 📧 Configuración de Correos

### Variables de Entorno Necesarias

Agrega al archivo `.env`:

```env
# Configuración de correo electrónico
EMAIL_USER=tu-email@gmail.com
EMAIL_PASS=tu-app-password-de-gmail
FRONTEND_URL=http://localhost:3000
```

### Para Gmail:

1. **Activar verificación en 2 pasos** en tu cuenta Gmail
2. **Generar contraseña de aplicación**:
   - Ve a: https://myaccount.google.com/apppasswords
   - Selecciona "Correo" y "Otro (nombre personalizado)"
   - Ingresa "Asignación de Aulas"
   - Copia la contraseña de 16 caracteres
3. **Usa esa contraseña en EMAIL_PASS**

## 🔗 Flujo de Recuperación

### 1. Usuario solicita recuperación
```
POST /api/forgot-password
Body: { "correo": "usuario@example.com" }
```

### 2. Backend procesa
- Busca usuario por correo
- Genera token JWT con expiración de 1 hora
- Crea URL: `${FRONTEND_URL}/reset-password.html?token=${resetToken}`
- Envía correo con enlace

### 3. Usuario recibe correo
- HTML con botón "Restablecer Contraseña"
- Link con token incluido
- Expira en 1 hora

### 4. Usuario hace clic
- Abre `reset-password.html`
- Token se valida
- Permite crear nueva contraseña

## 📝 Archivos Modificados/Creados

### Frontend:
- ✅ `public/forgot-password.html` - Página de solicitud
- ✅ `public/login.html` - Agregado link "¿Olvidaste tu contraseña?"
- ✅ `public/register.html` - Toggle de contraseña
- ✅ `public/js/forgot-password.js` - JavaScript
- ✅ `public/js/auth.js` - Función `togglePassword()`
- ✅ `public/js/register.js` - Función `togglePassword()`
- ✅ `public/css/login.css` - Estilos de toggle
- ✅ `public/css/register.css` - Estilos de toggle

### Backend:
- ✅ `src/controllers/auth.controller.js` - Función `forgotPassword()`
- ✅ `src/routes/auth.routes.js` - Ruta `/forgot-password`
- ✅ `package.json` - Dependencia nodemailer

## 🎯 Próximo Paso (Opcional)

Para completar el flujo, puedes crear:
- `reset-password.html` - Página para crear nueva contraseña
- Función para resetear contraseña en backend
- Validar token del enlace

¿Quieres que implemente la página de reset de contraseña?

## 🚀 Cómo Usar

1. Configura las variables de entorno en `.env`
2. Inicia el servidor: `npm run dev`
3. Ve a: http://localhost:3000/forgot-password.html
4. Ingresa tu correo registrado
5. Revisa tu bandeja de entrada
6. Haz clic en el enlace recibido

## ⚙️ Configuración Actual

- **SMTP:** Gmail (smtp.gmail.com:587)
- **Expiración token:** 1 hora
- **Seguridad:** No revela existencia de correo
- **HTML:** Email con estilo y enlace funcional

