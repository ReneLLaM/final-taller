# ✅ Pruebas de Funcionamiento

## 🚀 Servidor
- **Estado**: ✅ Corriendo en `http://localhost:3000`
- **Comando**: `npm run dev`

## 📋 URLs para Probar

### Autenticación:
1. **Login**: `http://localhost:3000/pages/auth/login.html`
2. **Registro**: `http://localhost:3000/pages/auth/register.html`
3. **Recuperar contraseña**: `http://localhost:3000/pages/auth/forgot-password.html`
4. **Reset contraseña**: `http://localhost:3000/pages/auth/reset-password.html`

### Dashboard:
5. **Principal**: `http://localhost:3000/pages/dashboard/principal.html`

### Ruta Raíz:
6. **/** → Redirige a `/pages/auth/login.html`

## 🔍 Verificaciones Necesarias

### 1. Login (http://localhost:3000/pages/auth/login.html)
- ✅ Página debe cargar
- ✅ CSS debe aplicarse correctamente
- ✅ Logo USFX debe aparecer
- ✅ Formulario debe funcionar
- ✅ Redirección a `/pages/dashboard/principal.html` después de login exitoso

### 2. Registro (http://localhost:3000/pages/auth/register.html)
- ✅ Página debe cargar
- ✅ CSS debe aplicarse correctamente
- ✅ Formulario debe funcionar
- ✅ Redirección a `/pages/auth/login.html` después de registro exitoso

### 3. Dashboard (http://localhost:3000/pages/dashboard/principal.html)
- ✅ Debe requerir autenticación
- ✅ Header debe cargarse según el rol
- ✅ Breadcrumb debe aparecer
- ✅ Modal de perfil debe funcionar
- ✅ Menú de usuario debe aparecer al hacer clic

## 🎨 Verificaciones de Diseño

### Responsividad:
- ✅ Desktop (1024px+)
- ✅ Tablet (768px - 1024px)
- ✅ Móvil (600px - 768px)
- ✅ Móvil pequeño (375px - 600px)

### Elementos:
- ✅ Headers responsivos
- ✅ Modal de perfil con estilo de registro
- ✅ Botones con colores correctos (Cancelar: blanco, Guardar: negro)
- ✅ Inputs con fondo gris (#f8f8f8)

## 🐛 Posibles Problemas y Soluciones

### Problema 1: "Cannot GET /pages/auth/login.html"
**Causa**: Archivos no están en la ubicación correcta
**Solución**: Verificar que los archivos estén en `public/pages/auth/`

### Problema 2: CSS no se carga
**Causa**: Rutas relativas incorrectas
**Solución**: Verificar que las rutas en HTML sean `../../assets/css/...`

### Problema 3: JavaScript no funciona
**Causa**: Rutas de scripts incorrectas
**Solución**: Verificar que las rutas sean `../../scripts/...`

### Problema 4: Headers no se cargan
**Causa**: `load-header.js` no encuentra los archivos
**Solución**: Verificar rutas en `load-header.js` (`../../components/headers/...`)

### Problema 5: Imágenes no aparecen
**Causa**: Ruta del logo incorrecta
**Solución**: Verificar que sea `../../assets/images/EMBLEMA-USFX-logo.png`

## 📝 Checklist de Funcionalidad

### Autenticación:
- [ ] Login funciona
- [ ] Registro funciona
- [ ] Recuperar contraseña funciona
- [ ] Reset contraseña funciona
- [ ] Logout funciona

### Dashboard:
- [ ] Carga correctamente después de login
- [ ] Header se carga según rol (estudiante/auxiliar/admin)
- [ ] Breadcrumb muestra información correcta
- [ ] Modal de perfil se abre
- [ ] Modal de perfil guarda cambios
- [ ] Modal se cierra automáticamente después de guardar
- [ ] Nombre se actualiza en breadcrumb

### Navegación:
- [ ] Links en headers funcionan
- [ ] Redirecciones funcionan correctamente
- [ ] Protección de rutas funciona (requiere login)

## ✅ Estado Actual

**Estructura**: ✅ Reorganizada correctamente
**Servidor**: ✅ Corriendo en puerto 3000
**Rutas Backend**: ✅ Actualizadas
**Rutas Frontend**: ✅ Actualizadas

**Listo para probar en navegador**: ✅ SÍ

---

**Nota**: Abre el navegador y ve a `http://localhost:3000` para comenzar las pruebas.
