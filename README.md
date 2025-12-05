# Taller de Especialidad – Sistema de Gestión de Horarios y Auxiliaturas

Este proyecto implementa un sistema completo de gestión académica con:

- Backend en Node.js + Express
- Base de datos PostgreSQL (Docker)
- Frontend en HTML/CSS/JS (carpeta `public`)
- Autenticación con JWT, gestión de roles (estudiante, auxiliar, administrador) y manejo de horarios/auxiliaturas.

La consigna de entrega se organiza en **3 carpetas principales**, más esta carpeta de proyecto.

---

## 1. Estructura de la entrega

Dentro de la carpeta `ENTREGA/` se encuentran las 3 carpetas pedidas en la guía:

1. **`ENTREGA/01-CODIGO-FUENTE/` — Código fuente**

   Contiene el **código fuente del sistema** listo para abrirse en un IDE o clonar a otra máquina:

   - `src/` → backend (controladores, rutas, middlewares, socket, etc.)
   - `public/` → frontend (páginas HTML, CSS, JS del dashboard y auth)
   - `database/` → scripts SQL (`EJECUTAR-ESTE.sql`, `taller-db.sql`, etc.)
   - `docker-compose.yml` → define el contenedor de PostgreSQL + pgAdmin
   - `package.json` y `package-lock.json` → dependencias Node
   - Opcional: `.env.example` con variables de entorno de ejemplo

   Esta carpeta representa el **código fuente oficial** del sistema.

2. **`ENTREGA/02-SOFTWARE-Y-DOCUMENTACION/` — Software, instaladores, componentes y README**

   Carpeta que agrupa **todo el software necesario y la documentación de instalación**:

   - Copia completa del proyecto (sin archivos `.md` originales), incluyendo:
     - `src/`, `public/`, `database/`, `scripts/`, `docker-compose.yml`, etc.
     - Carpetas como `node_modules/`, `postgres/`, `pgadmin/` (si se generaron).
   - Subcarpeta `instaladores/`:
     - `ENLACES-INSTALADORES.txt` → enlaces oficiales a Node.js, Docker Desktop, etc.
     - `proyecto-codigo-fuente.zip` → ZIP con el contenido de `01-CODIGO-FUENTE/`.
   - Subcarpeta `componentes/`:
     - `LEEME-COMPONENTES.txt` → referencia a los scripts SQL y componentes usados.
   - Archivo **`README-INSTALACION.md`**:
     - Documento principal de **gestión e instalación** donde se explican:
       - Requisitos de software
       - Configuración de `.env`
       - Uso de `docker-compose up -d`
       - Ejecución de `EJECUTAR-ESTE.sql` y scripts adicionales
       - Arranque del servidor (`npm install`, `npm run dev` / `npm start`)
       - Cómo detener servicios y notas para la evaluación

   Esta carpeta responde al punto **"todo el software (instaladores) componentes README"** de la consigna.

3. **`ENTREGA/03-MAQUINA-VIRTUAL/` — Máquina virtual (.ova)**

   Carpeta reservada para colocar el archivo de máquina virtual:

   - Debe contener el archivo `.ova` proporcionado para la evaluación.
   - El contenido interno de la VM **no se modifica** desde este proyecto; solo se referencia como parte de la entrega.

---

## 2. Estructura del proyecto (carpeta actual)

En la raíz del proyecto se encuentran, entre otros:

- `src/` → código backend (controladores, rutas, middlewares, configuración de Socket.IO, etc.)
- `public/` → frontend (páginas de autenticación, dashboard, estilos y scripts de secciones)
- `database/` → scripts SQL para creación de tablas, roles, horarios, etc.
- `docker-compose.yml` → servicio `myDB` (PostgreSQL) y `pgAdmin`.
- `package.json` → scripts de Node:
  - `npm run dev` → desarrollo
  - `npm start` → ejecución normal
- `ENTREGA/` → carpeta con las 3 carpetas de entrega descritas arriba.

---

## 3. Resumen rápido de instalación y ejecución

> **IMPORTANTE:** Los pasos detallados están en `ENTREGA/02-SOFTWARE-Y-DOCUMENTACION/README-INSTALACION.md`. Aquí solo se resume el flujo principal.

### 3.1 Requisitos

- Windows 10+ (o SO compatible con Docker)
- Node.js LTS (18.x o similar)
- Docker Desktop

### 3.2 Levantar base de datos (Docker)

1. Abrir una terminal en la raíz del proyecto o en `ENTREGA/01-CODIGO-FUENTE/`.
2. Ejecutar:

   ```powershell
   docker-compose up -d
   ```

3. Abrir pgAdmin (por ejemplo `http://localhost:5050`) y conectarse a la BD `taller-db`.
4. Ejecutar el script `database/EJECUTAR-ESTE.sql` para crear tablas y relaciones.

### 3.3 Configurar variables de entorno

1. Crear un archivo `.env` en la raíz del proyecto (o en `01-CODIGO-FUENTE`), por ejemplo:

   ```env
   DB_USER=taller
   DB_PASSWORD=123456
   DB_HOST=localhost
   DB_NAME=taller-db
   DB_PORT=5432
   PORT=3000
   JWT_SECRET=una-clave-segura
   JWT_REFRESH_SECRET=otra-clave-segura
   ```

### 3.4 Instalar dependencias e iniciar servidor

1. Instalar dependencias Node:

   ```powershell
   npm install
   ```

2. Iniciar el servidor en desarrollo:

   ```powershell
   npm run dev
   ```

3. Abrir el navegador en:

   - `http://localhost:3000/` → redirige a la pantalla de login.

---

## 4. Notas finales

- Para instrucciones detalladas de **gestión e instalación**, revisar:
  - `ENTREGA/02-SOFTWARE-Y-DOCUMENTACION/README-INSTALACION.md`
- Para la entrega final, se pueden empaquetar las carpetas:
  - `ENTREGA/01-CODIGO-FUENTE/`
  - `ENTREGA/02-SOFTWARE-Y-DOCUMENTACION/`
  - `ENTREGA/03-MAQUINA-VIRTUAL/`

Este README resume la organización general del proyecto y cómo se ajusta a la consigna de las 3 carpetas.
