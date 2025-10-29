# 📚 Endpoints API - Taller de Especialidad

## 🔐 Endpoints de Autenticación

### POST /api/register
Registra un nuevo usuario con rol "estudiante" por defecto.

**Request:**
```json
{
  "nombre_completo": "Juan Pérez",
  "carrera": "Ingeniería de Sistemas",
  "cu": "35-5051",
  "correo": "juan@example.com",
  "contrasenia": "password123"
}
```

**Response (201):**
```json
{
  "message": "Usuario registrado exitosamente",
  "user": { ... }
}
```

---

### POST /api/login
Inicia sesión con correo y contraseña.

**Request:**
```json
{
  "correo": "juan@example.com",
  "contrasenia": "password123"
}
```

**Response (200):**
```json
{
  "message": "Login exitoso",
  "user": { ... }
}
```

---

### POST /api/logout
Cierra la sesión actual.

**Response (200):**
```json
{
  "message": "Logout exitoso"
}
```

---

### GET /api/protected
Obtiene los datos del usuario autenticado.

**Headers:** Cookie con token JWT (httpOnly)

**Response (200):**
```json
{
  "message": "Datos protegidos obtenidos exitosamente",
  "user": {
    "id": 1,
    "nombre_completo": "Juan Pérez",
    "carrera": "Ingeniería de Sistemas",
    "cu": "35-5051",
    "correo": "juan@example.com",
    "rol_id": 1
  }
}
```

---

## 👥 Endpoints de Usuarios

### GET /api/usuarios
Obtiene todos los usuarios.

**Response (200):**
```json
[
  {
    "id": 1,
    "nombre_completo": "Juan Pérez",
    "carrera": "Ingeniería de Sistemas",
    "cu": "35-5051",
    "correo": "juan@example.com",
    "contrasenia": "$2b$10$...",
    "rol_id": 1
  },
  ...
]
```

---

### GET /api/usuarios/:id
Obtiene un usuario por ID.

**Params:**
- `id` - ID del usuario

**Response (200):**
```json
{
  "id": 1,
  "nombre_completo": "Juan Pérez",
  "carrera": "Ingeniería de Sistemas",
  "cu": "35-5051",
  "correo": "juan@example.com",
  "contrasenia": "$2b$10$...",
  "rol_id": 1
}
```

**Response (404):**
```json
{
  "message": "Usuario no encontrado"
}
```

---

### POST /api/usuarios
Crea un nuevo usuario (para administradores).

**Request:**
```json
{
  "nombre_completo": "María García",
  "carrera": "Ingeniería de Sistemas",
  "cu": "35-5052",
  "correo": "maria@example.com",
  "contrasenia": "password123",
  "rol_id": 1
}
```

**Response (201):**
```json
{
  "id": 2,
  "nombre_completo": "María García",
  "carrera": "Ingeniería de Sistemas",
  "cu": "35-5052",
  "correo": "maria@example.com",
  "contrasenia": "$2b$10$...",
  "rol_id": 1
}
```

---

### PUT /api/usuarios/:id
Actualiza un usuario por ID.

**Params:**
- `id` - ID del usuario a actualizar

**Request:**
```json
{
  "nombre_completo": "María García López",
  "carrera": "Ingeniería de Sistemas",
  "cu": "35-5052",
  "correo": "maria.garcia@example.com",
  "contrasenia": "newpassword123",
  "rol_id": 1
}
```

**Response (200):**
```json
{
  "id": 2,
  "nombre_completo": "María García López",
  "carrera": "Ingeniería de Sistemas",
  "cu": "35-5052",
  "correo": "maria.garcia@example.com",
  "contrasenia": "$2b$10$...",
  "rol_id": 1
}
```

**Response (404):**
```json
{
  "message": "Usuario no encontrado"
}
```

---

### DELETE /api/usuarios/:id
Elimina un usuario por ID.

**Params:**
- `id` - ID del usuario a eliminar

**Response (204):** Sin contenido

**Response (404):**
```json
{
  "message": "Usuario no encontrado"
}
```

---

## 📋 Resumen de Endpoints

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| POST | `/api/register` | Registra usuario | No |
| POST | `/api/login` | Inicia sesión | No |
| POST | `/api/logout` | Cierra sesión | Sí |
| GET | `/api/protected` | Datos del usuario | Sí |
| GET | `/api/usuarios` | Lista usuarios | No* |
| GET | `/api/usuarios/:id` | Obtiene usuario | No* |
| POST | `/api/usuarios` | Crea usuario | No* |
| PUT | `/api/usuarios/:id` | Actualiza usuario | No* |
| DELETE | `/api/usuarios/:id` | Elimina usuario | No* |

\* *Los endpoints de usuarios no requieren autenticación actualmente. Se pueden proteger agregando `authMiddleware` en las rutas si lo deseas.*

---

## 🔒 Códigos de Estado HTTP

- **200** - OK: Solicitud exitosa
- **201** - Created: Recurso creado exitosamente
- **204** - No Content: Solicitud exitosa sin contenido
- **400** - Bad Request: Datos inválidos
- **401** - Unauthorized: No autenticado o token inválido
- **404** - Not Found: Recurso no encontrado
- **500** - Internal Server Error: Error del servidor

---

## 📝 Notas

- Todas las contraseñas son hasheadas con bcrypt antes de almacenarse
- Los JWT tienen una expiración de 1 hora
- Las cookies son `httpOnly` y `secure` (en producción)
- El formato de CU debe ser: `##-####` (ej: 35-5051)
- Las contraseñas deben tener al menos 6 caracteres

