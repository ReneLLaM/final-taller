# Taller de Especialidad - Sistema de Autenticación

Sistema de gestión con autenticación completa usando Express.js, PostgreSQL, JWT y bcrypt.

## 📋 Características

- ✅ Registro de usuarios con rol "estudiante" por defecto
- ✅ Autenticación segura con JWT (JSON Web Tokens)
- ✅ Hash de contraseñas con bcrypt y salt
- ✅ Sesiones con cookies httpOnly
- ✅ Rutas protegidas con middleware de autenticación
- ✅ Frontend con HTML/CSS moderno y responsive
- ✅ API RESTful completa

## 🏗️ Estructura del Proyecto

```
Taller de especialidad/
│
├── database/
│   └── taller-db.sql          # Esquema de base de datos
│
├── public/                     # Frontend
│   ├── css/
│   │   └── styles.css          # Estilos globales
│   ├── js/
│   │   ├── auth.js             # Lógica de autenticación
│   │   ├── register.js         # Lógica de registro
│   │   └── dashboard.js        # Lógica del dashboard
│   ├── login.html              # Página de login
│   ├── register.html           # Página de registro
│   └── dashboard.html          # Página principal protegida
│
├── src/
│   ├── config.js               # Configuración de variables de entorno
│   ├── db.js                   # Conexión a PostgreSQL
│   ├── index.js                 # Servidor principal
│   │
│   ├── controllers/
│   │   ├── auth.controller.js  # Controladores de autenticación
│   │   └── users.controller.js # Controladores de usuarios
│   │
│   ├── middleware/
│   │   └── auth.middleware.js  # Middleware de autenticación JWT
│   │
│   └── routes/
│       ├── auth.routes.js      # Rutas de autenticación
│       └── users.routes.js    # Rutas de usuarios
│
├── docker-compose.yml          # Configuración de Docker
├── package.json                # Dependencias del proyecto
└── README.md                   # Documentación
```

## 🚀 Instalación y Configuración

### Prerrequisitos

- Docker Desktop instalado y corriendo
- Node.js (v14 o superior)
- npm

### 1. Clonar y Configurar el Proyecto

```bash
# Clonar el repositorio (si aplica)
git clone <url-del-repositorio>

# Navegar al directorio del proyecto
cd "Taller de especialidad"

# Instalar dependencias
npm install
```

### 2. Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
# Base de datos
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_NAME=taller
DB_PORT=5432

# Servidor
PORT=3000

# JWT
JWT_SECRET=tu-secret-key-super-segura-cambiala-en-produccion
JWT_REFRESH_SECRET=tu-refresh-secret-key-cambiala

# Entorno
NODE_ENV=development
```

### 3. Levantar la Base de Datos

```bash
# Iniciar contenedores de Docker
docker compose up -d

# Verificar que los contenedores estén corriendo
docker ps
```

### 4. Inicializar la Base de Datos

Los roles deben estar creados en la base de datos. Ejecuta los siguientes comandos SQL en pgAdmin o en la consola de PostgreSQL:

```sql
-- Insertar roles
INSERT INTO roles (nombre) VALUES 
('estudiante'),
('auxiliar'),
('administrador');
```

### 5. Iniciar el Servidor

```bash
# Modo desarrollo (con hot reload)
npm run dev

# Modo producción
npm start
```

El servidor estará corriendo en: `http://localhost:3000`

## 📚 Documentación de la API

### Endpoints de Autenticación

#### POST `/api/register`

Registra un nuevo usuario con rol "estudiante" por defecto.

**Request Body:**
```json
{
  "nombre_completo": "Juan Pérez García",
  "carrera": "Ingeniería de Sistemas",
  "cu": "35-5051",
  "correo": "juan.perez@universidad.edu",
  "contrasenia": "password123"
}
```

**Response:**
```json
{
  "message": "Usuario registrado exitosamente",
  "user": {
    "id": 1,
    "nombre_completo": "Juan Pérez García",
    "carrera": "Ingeniería de Sistemas",
    "cu": "35-5051",
    "correo": "juan.perez@universidad.edu",
    "rol_id": 1
  }
}
```

#### POST `/api/login`

Inicia sesión con correo y contraseña.

**Request Body:**
```json
{
  "correo": "juan.perez@universidad.edu",
  "contrasenia": "password123"
}
```

**Response:**
```json
{
  "message": "Login exitoso",
  "user": {
    "id": 1,
    "nombre_completo": "Juan Pérez García",
    "carrera": "Ingeniería de Sistemas",
    "cu": "35-5051",
    "correo": "juan.perez@universidad.edu",
    "rol_id": 1
  }
}
```

**Nota:** El token JWT se envía como cookie `httpOnly`.

#### POST `/api/logout`

Cierra la sesión del usuario.

**Response:**
```json
{
  "message": "Logout exitoso"
}
```

#### GET `/api/protected`

Obtiene los datos del usuario autenticado. Requiere token JWT válido.

**Headers:** Cookie con token JWT

**Response:**
```json
{
  "message": "Datos protegidos obtenidos exitosamente",
  "user": {
    "id": 1,
    "nombre_completo": "Juan Pérez García",
    "carrera": "Ingeniería de Sistemas",
    "cu": "35-5051",
    "correo": "juan.perez@universidad.edu",
    "rol_id": 1
  }
}
```

### Endpoints de Usuarios

#### GET `/api/usuarios`

Obtiene todos los usuarios.

#### GET `/api/usuarios/:id`

Obtiene un usuario por ID.

#### POST `/api/usuarios`

Crea un nuevo usuario (para administradores).

#### PUT `/api/usuarios/:id`

Actualiza un usuario por ID.

#### DELETE `/api/usuarios/:id`

Elimina un usuario por ID.

## 🔐 Seguridad

### Hash de Contraseñas

Las contraseñas se hashean usando bcrypt con 10 rondas de salt:
- Contraseñas nunca se almacenan en texto plano
- Cada hash incluye un salt único
- Verificación segura con `bcrypt.compare()`

### JSON Web Tokens (JWT)

- Tokens con expiración de 1 hora
- Firmados con secreto seguro
- Enviados como cookies `httpOnly` para prevenir XSS
- Incluyen: `userId`, `correo`, `rol_id`

### Middleware de Autenticación

El middleware `authMiddleware` verifica:
- Existencia del token en cookies
- Validez y firma del token
- Expiración del token
- Agrega `req.user` con datos del usuario autenticado

### Cookies Seguras

```javascript
{
  httpOnly: true,           // Previene acceso desde JavaScript
  secure: true,             // Solo HTTPS en producción
  sameSite: 'strict',       // Previene CSRF
  maxAge: 3600000           // 1 hora de expiración
}
```

## 🎨 Frontend

### Páginas Disponibles

1. **`/` o `/login.html`** - Página de inicio de sesión
2. **`/register.html`** - Página de registro
3. **`/dashboard.html`** - Página protegida con información del usuario

### Características del Frontend

- Diseño moderno y responsive
- Validación de formularios en tiempo real
- Mensajes de error y éxito
- Navegación fluida entre páginas
- Auto-redirección después de login/registro

## 📝 Flujo de Autenticación

### Registro
1. Usuario completa formulario de registro
2. Frontend valida formato de CU (##-####)
3. Frontend verifica coincidencia de contraseñas
4. Backend verifica unicidad de correo y CU
5. Contraseña se hashea con bcrypt
6. Se crea usuario con rol_id = 1 (estudiante)
7. Se genera token JWT y se envía como cookie
8. Usuario es redirigido a login

### Login
1. Usuario ingresa correo y contraseña
2. Backend busca usuario por correo
3. Se verifica hash de contraseña con bcrypt
4. Se genera token JWT
5. Token se envía como cookie httpOnly
6. Usuario es redirigido a dashboard

### Acceso a Rutas Protegidas
1. Cliente incluye cookie con token
2. Middleware valida token
3. Si es válido, agrega datos del usuario a `req.user`
4. Controlador procesa la petición
5. Retorna datos al cliente

### Logout
1. Cliente solicita logout
2. Backend elimina cookie de token
3. Cliente redirige a login

## 🛠️ Tecnologías Utilizadas

- **Node.js** - Runtime de JavaScript
- **Express.js** - Framework web
- **PostgreSQL** - Base de datos relacional
- **pg** - Cliente de PostgreSQL para Node.js
- **bcrypt** - Hash de contraseñas
- **jsonwebtoken** - Generación y verificación de JWT
- **cookie-parser** - Manejo de cookies
- **dotenv** - Variables de entorno
- **Docker** - Contenedores de base de datos

## 📦 Dependencias

```json
{
  "bcrypt": "^5.1.1",
  "cookie-parser": "^1.4.6",
  "dotenv": "^17.2.3",
  "express": "^5.1.0",
  "jsonwebtoken": "^9.0.2",
  "morgan": "^1.10.1",
  "pg": "^8.16.3"
}
```

## 🚧 Próximas Funcionalidades

- [ ] Refresh Token para renovar sesiones
- [ ] Recuperación de contraseña (forgot password)
- [ ] Integración con Passport.js
- [ ] OAuth 2.0 (Google, GitHub, etc.)
- [ ] Middleware de autorización por roles
- [ ] Rate limiting
- [ ] Logs de auditoría

## 🐛 Solución de Problemas

### Error de conexión a la base de datos
- Verificar que Docker esté corriendo: `docker ps`
- Verificar variables de entorno en `.env`
- Verificar que el contenedor de PostgreSQL esté activo

### Error "Rol estudiante no encontrado"
- Ejecutar los INSERT en la base de datos:
```sql
INSERT INTO roles (nombre) VALUES ('estudiante'), ('auxiliar'), ('administrador');
```

### CORS o problemas de cookies
- Verificar que las peticiones sean al mismo dominio (localhost:3000)
- No usar mode: 'no-cors' en fetch

## 📄 Licencia

ISC

## 👤 Autor

Taller de Especialidad
