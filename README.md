# Taller de Especialidad – Sistema de Gestión de Horarios y Auxiliaturas

Este proyecto implementa un sistema de gestión académica con:

- Backend en Node.js + Express
- Base de datos PostgreSQL (Docker)
- Frontend en HTML/CSS/JS (carpeta `public`)
- Autenticación con JWT y manejo de horarios/auxiliaturas.

Este README se centra solo en **cómo instalar, inicializar la base de datos y ejecutar el sistema**.

---

## 1. Requisitos

- Windows 10+ (o SO compatible con Docker)
- Node.js LTS (18.x o similar)
- Docker Desktop

---

## 2. Configurar variables de entorno

1. En la raíz del proyecto, crear un archivo `.env` (si no existe) con valores como:

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

2. Guardar el archivo `.env`.

---

## 3. Inicializar la base de datos con Docker

La base de datos PostgreSQL se levanta con `docker-compose.yml` y, en su **primera inicialización**, ejecuta automáticamente el script `database/EJECUTAR-ESTE.sql`, que crea todas las tablas necesarias (incluida `usuarios`).

### 3.1 Primera vez o reinicio limpio

Si es la primera vez que levantas la base de datos, o quieres empezar desde cero:

1. Asegúrate de que no haya contenedores viejos corriendo:

   ```powershell
   docker-compose down
   ```

2. (Opcional pero recomendado) Borra el contenido de la carpeta `postgres/` para que Postgres se inicialice desde cero y ejecute de nuevo el script:

   - Cerrar el servidor y detener Docker.
   - Eliminar la carpeta `postgres` o vaciar su contenido.

3. Levantar la base de datos y pgAdmin:

   ```powershell
   docker-compose up -d
   ```

Al crear el contenedor y la carpeta de datos por primera vez, Postgres ejecutará automáticamente `EJECUTAR-ESTE.sql` y dejará la base de datos lista.

### 3.2 Verificar que la base de datos está creada

1. Abrir pgAdmin (por ejemplo `http://localhost:5050`).
2. Conectarse al servidor Postgres y a la base de datos `taller-db`.
3. Comprobar que existen tablas como `usuarios`, `roles`, `auxiliar_materias`, `auxiliar_votaciones`, etc.

---

## 4. Instalar dependencias Node

En la raíz del proyecto:

```powershell
npm install
```

Esto descargará las dependencias definidas en `package.json`.

---

## 5. Ejecutar el servidor

Con la base de datos levantada y el `.env` configurado:

### 5.1 Modo desarrollo

```powershell
npm run dev
```

### 5.2 Modo normal

```powershell
npm start
```

Luego abrir en el navegador:

- `http://localhost:3000/` → redirige a la pantalla de login.

Desde ahí se puede probar todo el flujo de autenticación, dashboard y gestión de horarios/auxiliaturas.

---

## 6. Detener servicios

- Para detener el servidor Node: `Ctrl + C` en la terminal.
- Para detener los contenedores Docker:

  ```powershell
  docker-compose down
  ```

Con estos pasos, el proyecto queda listo para ser levantado y probado sin necesidad de ejecutar manualmente los scripts SQL.
