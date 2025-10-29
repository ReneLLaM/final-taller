# Guía de Configuración - Taller de Especialidad

## 📋 Pasos para Configurar el Proyecto

### 1. Crear archivo .env

Crea un archivo `.env` en la raíz del proyecto con el siguiente contenido:

```env
# Base de datos PostgreSQL
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_NAME=taller
DB_PORT=5432

# Servidor Express
PORT=3000

# JWT Tokens (CAMBIAR EN PRODUCCIÓN)
JWT_SECRET=tu-secret-key-super-segura-cambiala-en-produccion
JWT_REFRESH_SECRET=tu-refresh-secret-key-cambiala

# Entorno
NODE_ENV=development
```

### 2. Iniciar Docker

```bash
docker compose up -d
```

### 3. Inicializar Roles en la Base de Datos

Conectate a PostgreSQL usando pgAdmin o la línea de comandos:

```bash
# Conectarse a PostgreSQL
docker exec -it taller-de-especialidad-postgres-1 psql -U postgres -d taller

# O usa pgAdmin con:
# Host: localhost
# Port: 5432
# Username: postgres
# Password: postgres
# Database: taller
```

Ejecuta el script SQL:

```sql
INSERT INTO roles (nombre) VALUES 
('estudiante'),
('auxiliar'),
('administrador');
```

O ejecuta el archivo `database/init-roles.sql` desde pgAdmin.

### 4. Instalar Dependencias

```bash
npm install
```

### 5. Iniciar el Servidor

```bash
# Modo desarrollo
npm run dev

# Modo producción
npm start
```

El servidor estará en: http://localhost:3000

## 🧪 Probar el Sistema

### 1. Registrar un Usuario

1. Ve a http://localhost:3000
2. Haz clic en "Regístrate aquí"
3. Completa el formulario con:
   - Nombre completo
   - Carrera
   - CU (formato: ##-####, ej: 35-5051)
   - Correo
   - Contraseña (mínimo 6 caracteres)

### 2. Iniciar Sesión

1. Ve a http://localhost:3000
2. Ingresa correo y contraseña
3. Serás redirigido al dashboard

### 3. Verificar Endpoints

Prueba los endpoints con Postman o curl:

```bash
# Login
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"correo":"test@test.com","contrasenia":"123456"}' \
  -c cookies.txt

# Protected (requiere cookie)
curl -X GET http://localhost:3000/api/protected \
  -b cookies.txt

# Logout
curl -X POST http://localhost:3000/api/logout \
  -b cookies.txt \
  -c cookies.txt
```

## 🔍 Verificar que Todo Funciona

1. **Base de datos**: Verifica en pgAdmin que las tablas existan
2. **Roles**: Verifica que los roles estén insertados
3. **Servidor**: Ve a http://localhost:3000 y deberías ver el login
4. **API**: Prueba POST /api/register con Postman
5. **Frontend**: Registra un usuario y prueba el login

## 🐛 Solución de Problemas

### Error: "Rol estudiante no encontrado"
**Solución**: Ejecuta el INSERT de roles en la base de datos (paso 3)

### Error: "Cannot find module 'bcrypt'"
**Solución**: Ejecuta `npm install`

### Error de conexión a PostgreSQL
**Solución**: Verifica que Docker esté corriendo con `docker ps`

### Error: Puerto 3000 en uso
**Solución**: Cambia el PORT en el archivo .env

## 📚 Estructura de Archivos Creados

```
public/
├── login.html              ✅
├── register.html           ✅
├── dashboard.html          ✅
├── css/
│   └── styles.css          ✅
└── js/
    ├── auth.js             ✅
    ├── register.js         ✅
    └── dashboard.js        ✅

src/
├── controllers/
│   └── auth.controller.js  ✅
├── middleware/
│   └── auth.middleware.js  ✅
├── routes/
│   └── auth.routes.js      ✅
└── index.js                ✅ (actualizado)

database/
└── init-roles.sql          ✅
```

## ✅ Checklist de Verificación

- [ ] Archivo .env creado
- [ ] Docker corriendo
- [ ] Roles insertados en la base de datos
- [ ] Dependencias instaladas (`npm install`)
- [ ] Servidor corriendo (`npm run dev`)
- [ ] Login visible en http://localhost:3000
- [ ] Registro funcionando
- [ ] Login funcionando
- [ ] Dashboard funcionando
- [ ] Logout funcionando

