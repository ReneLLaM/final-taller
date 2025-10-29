# 📁 Estructura del Proyecto - Asignación de Aulas

## 🏗️ Arquitectura Organizada

```
public/
├── auth/                          # Páginas de autenticación
│   ├── css/
│   │   ├── login.css             # Estilos de login
│   │   └── register.css          # Estilos de registro
│   ├── js/
│   │   ├── auth.js               # JavaScript de login
│   │   ├── register.js           # JavaScript de registro
│   │   ├── forgot-password.js    # JavaScript de recuperación
│   │   └── reset-password.js      # JavaScript de reset
│   ├── images/
│   ├── login.html                 # Página de login
│   ├── register.html              # Página de registro
│   ├── forgot-password.html       # Página de recuperación
│   └── reset-password.html        # Página de reset
│
├── header/                        # Headers reutilizables
│   ├── css/
│   │   ├── header.css             # Estilos de header
│   │   ├── auth-header.css        # Header post-autenticación
│   │   ├── student-header.css     # Header de estudiante
│   │   ├── aux-header.css         # Header de auxiliar
│   │   └── admin-header.css       # Header de administrador
│   ├── pre-auth-header.html       # Header antes de autenticación
│   ├── auth-header.html           # Header post-autenticación
│   ├── student-header.html        # Header de estudiante
│   ├── aux-header.html            # Header de auxiliar
│   └── admin-header.html          # Header de administrador
│
├── components/                    # Componentes reutilizables
│   ├── auth/
│   │   └── password-field.html    # Campo contraseña con toggle
│   └── ...
│
├── layouts/                       # Layouts completos
│   ├── auth-layout.html          # Layout de autenticación
│   └── ...
│
├── dashboard/                     # Páginas del dashboard
│   ├── css/
│   │   └── dashboard.css
│   ├── js/
│   │   └── dashboard.js
│   └── dashboard.html
│
├── css/                          # CSS común
│   ├── images/
│   │   └── EMBLEMA-USFX-logo.png
│   └── styles.css                # Estilos globales
│
└── js/                           # JavaScript común
    └── common.js
```

## 🎯 Organización por Rol

### Headers según Rol:
1. **Pre-autenticación** (`pre-auth-header.html`)
   - Login
   - Registro
   - Recuperar contraseña
   - Reset password

2. **Estudiante** (`student-header.html`)
   - Dashboard del estudiante
   - Ver horarios
   - Solicitar aulas

3. **Auxiliar** (`aux-header.html`)
   - Dashboard del auxiliar
   - Gestionar solicitudes
   - Vista de aulas

4. **Administrador** (`admin-header.html`)
   - Dashboard del administrador
   - Gestionar usuarios
   - Gestionar aulas
   - Configuración

## 📝 Ventajas de esta Estructura:

✅ **Separación por funcionalidad** - Cada tipo de archivo tiene su carpeta
✅ **Reutilización** - Headers y componentes compartidos
✅ **Escalabilidad** - Fácil agregar nuevos roles/páginas
✅ **Mantenibilidad** - Fácil de navegar y entender
✅ **Organización** - Código limpio y profesional

## 🚀 Próximos Pasos:

1. Mover todos los archivos a sus carpetas correspondientes
2. Actualizar todas las referencias (src, href, import)
3. Crear headers específicos por rol
4. Implementar dashboards según rol
5. Agregar componentes reutilizables

