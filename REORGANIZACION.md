# Plan de Reorganización del Proyecto

## Estructura Actual vs Propuesta

### 📁 Estructura Actual (Desorganizada)
```
public/
├── auth/                    # Carpeta duplicada con archivos antiguos
│   ├── css/
│   │   ├── login.css       # DUPLICADO (4808 bytes - versión antigua)
│   │   └── register.css    # DUPLICADO (4530 bytes - versión antigua)
│   ├── js/
│   │   ├── auth.js         # DUPLICADO
│   │   ├── forgot-password.js  # DUPLICADO
│   │   ├── register.js     # DUPLICADO
│   │   └── reset-password.js   # DUPLICADO
│   ├── forgot-password.html
│   ├── login.html
│   ├── register.html
│   └── reset-password.html
├── css/                     # CSS actualizados y responsivos
│   ├── login.css           # ✅ USAR ESTE (7399 bytes - responsivo)
│   ├── register.css        # ✅ USAR ESTE (7105 bytes - responsivo)
│   ├── principal.css       # ✅ Dashboard
│   └── styles.css          # ✅ Recuperar/Modificar contraseña
├── js/                      # JS actualizados
│   ├── auth.js             # ✅ USAR ESTE
│   ├── dashboard.js        # ✅ Dashboard
│   ├── forgot-password.js  # ✅ USAR ESTE
│   ├── load-header.js      # ✅ Carga headers dinámicos
│   ├── register.js         # ✅ USAR ESTE
│   └── reset-password.js   # ✅ USAR ESTE
├── header/                  # Headers por rol
│   ├── css/
│   │   ├── admin-header.css    # ✅ Responsivo
│   │   ├── aux-header.css      # ✅ Responsivo
│   │   ├── student-header.css  # ✅ Responsivo
│   │   ├── auth-header.css
│   │   └── pre-auth-header.css
│   ├── admin-header.html
│   ├── aux-header.html
│   ├── student-header.html
│   ├── auth-header.html
│   └── pre-auth-header.html
├── components/              # VACÍA - ELIMINAR
├── layouts/                 # VACÍA - ELIMINAR
├── forgot-password.html     # DUPLICADO - usar auth/
├── login.html               # DUPLICADO - usar auth/
├── register.html            # DUPLICADO - usar auth/
├── reset-password.html      # DUPLICADO - usar auth/
└── principal.html           # ✅ Dashboard principal
```

### 📁 Estructura Propuesta (Organizada)

```
public/
├── pages/                   # 📄 Todas las páginas HTML
│   ├── auth/               # Páginas de autenticación
│   │   ├── login.html
│   │   ├── register.html
│   │   ├── forgot-password.html
│   │   └── reset-password.html
│   └── dashboard/          # Páginas del dashboard
│       └── principal.html
│
├── assets/                  # 🎨 Recursos estáticos
│   ├── css/
│   │   ├── auth/          # Estilos de autenticación
│   │   │   ├── login.css
│   │   │   ├── register.css
│   │   │   └── styles.css  (forgot/reset password)
│   │   ├── dashboard/     # Estilos del dashboard
│   │   │   └── principal.css
│   │   └── components/    # Estilos de componentes
│   │       ├── headers/
│   │       │   ├── admin-header.css
│   │       │   ├── aux-header.css
│   │       │   ├── student-header.css
│   │       │   ├── auth-header.css
│   │       │   └── pre-auth-header.css
│   │       └── modals/
│   │           └── profile-modal.css (si se separa)
│   │
│   └── images/            # Imágenes (logo, etc.)
│       └── logo-usfx.png
│
├── components/             # 🧩 Componentes HTML reutilizables
│   └── headers/
│       ├── admin-header.html
│       ├── aux-header.html
│       ├── student-header.html
│       ├── auth-header.html
│       └── pre-auth-header.html
│
└── scripts/                # 📜 JavaScript
    ├── auth/              # Scripts de autenticación
    │   ├── auth.js        (login)
    │   ├── register.js
    │   ├── forgot-password.js
    │   └── reset-password.js
    ├── dashboard/         # Scripts del dashboard
    │   └── dashboard.js
    └── shared/            # Scripts compartidos
        └── load-header.js
```

## 🗑️ Archivos a Eliminar

### Carpetas vacías:
- ❌ `public/components/` (vacía)
- ❌ `public/layouts/` (vacía)
- ❌ `public/auth/images/` (vacía)
- ❌ `public/css/images/` (solo tiene logo, mover a assets/images/)

### Archivos duplicados (eliminar versiones antiguas):
- ❌ `public/auth/css/login.css` (4808 bytes - antigua)
- ❌ `public/auth/css/register.css` (4530 bytes - antigua)
- ❌ `public/auth/js/auth.js` (duplicado)
- ❌ `public/auth/js/forgot-password.js` (duplicado)
- ❌ `public/auth/js/register.js` (duplicado)
- ❌ `public/auth/js/reset-password.js` (duplicado)

### HTMLs duplicados en raíz (mover a pages/auth/):
- ❌ `public/forgot-password.html` (mover)
- ❌ `public/login.html` (mover)
- ❌ `public/register.html` (mover)
- ❌ `public/reset-password.html` (mover)

### Toda la carpeta auth antigua:
- ❌ `public/auth/` (eliminar completamente después de mover HTMLs)

## ✅ Archivos a Mantener y Usar

### CSS (versiones responsivas actualizadas):
- ✅ `public/css/login.css` (7399 bytes)
- ✅ `public/css/register.css` (7105 bytes)
- ✅ `public/css/principal.css` (actualizado)
- ✅ `public/css/styles.css` (8966 bytes)

### JavaScript:
- ✅ `public/js/auth.js`
- ✅ `public/js/dashboard.js`
- ✅ `public/js/forgot-password.js`
- ✅ `public/js/load-header.js`
- ✅ `public/js/register.js`
- ✅ `public/js/reset-password.js`

### Headers:
- ✅ Todos los archivos en `public/header/`

## 📋 Pasos de Reorganización

### Paso 1: Crear nueva estructura
```bash
mkdir -p public/pages/auth
mkdir -p public/pages/dashboard
mkdir -p public/assets/css/auth
mkdir -p public/assets/css/dashboard
mkdir -p public/assets/css/components/headers
mkdir -p public/assets/images
mkdir -p public/components/headers
mkdir -p public/scripts/auth
mkdir -p public/scripts/dashboard
mkdir -p public/scripts/shared
```

### Paso 2: Mover archivos HTML
```bash
# Mover páginas de auth
mv public/login.html public/pages/auth/
mv public/register.html public/pages/auth/
mv public/forgot-password.html public/pages/auth/
mv public/reset-password.html public/pages/auth/
mv public/auth/login.html public/pages/auth/ (si existe)
mv public/auth/register.html public/pages/auth/ (si existe)

# Mover dashboard
mv public/principal.html public/pages/dashboard/
```

### Paso 3: Mover CSS
```bash
# CSS de autenticación
mv public/css/login.css public/assets/css/auth/
mv public/css/register.css public/assets/css/auth/
mv public/css/styles.css public/assets/css/auth/

# CSS de dashboard
mv public/css/principal.css public/assets/css/dashboard/

# CSS de headers
mv public/header/css/* public/assets/css/components/headers/
```

### Paso 4: Mover JavaScript
```bash
# Scripts de auth
mv public/js/auth.js public/scripts/auth/
mv public/js/register.js public/scripts/auth/
mv public/js/forgot-password.js public/scripts/auth/
mv public/js/reset-password.js public/scripts/auth/

# Scripts de dashboard
mv public/js/dashboard.js public/scripts/dashboard/

# Scripts compartidos
mv public/js/load-header.js public/scripts/shared/
```

### Paso 5: Mover componentes
```bash
# Headers
mv public/header/*.html public/components/headers/
```

### Paso 6: Mover imágenes
```bash
mv public/css/images/logo-usfx.png public/assets/images/
```

### Paso 7: Eliminar carpetas vacías y duplicados
```bash
rm -rf public/auth/
rm -rf public/components/ (la vieja vacía)
rm -rf public/layouts/
rm -rf public/css/
rm -rf public/js/
rm -rf public/header/
```

### Paso 8: Actualizar rutas en archivos HTML
Actualizar todas las referencias de:
- `css/` → `../assets/css/auth/` o `../assets/css/dashboard/`
- `js/` → `../scripts/auth/` o `../scripts/dashboard/`
- `header/` → `../components/headers/`

## 🎯 Beneficios de la Nueva Estructura

1. **Organización clara**: Separación por tipo de recurso
2. **Sin duplicados**: Una sola versión de cada archivo
3. **Escalable**: Fácil agregar nuevas páginas/componentes
4. **Mantenible**: Estructura estándar de proyecto web
5. **Profesional**: Siguiendo mejores prácticas

## ⚠️ Importante

Antes de eliminar cualquier archivo:
1. ✅ Verificar que no esté siendo usado
2. ✅ Hacer backup o commit en git
3. ✅ Actualizar todas las rutas en los archivos
4. ✅ Probar que todo funcione correctamente
