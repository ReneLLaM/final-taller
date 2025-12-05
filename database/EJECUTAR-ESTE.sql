-- =======================================
-- EJECUTA ESTE SCRIPT PARA RESETEAR TODO
-- =======================================
-- Copia y pega todo este contenido en pgAdmin o tu cliente PostgreSQL
-- IMPORTANTE:
--  - En pgAdmin: conéctate primero manualmente a la base de datos "taller_db" y luego ejecuta este script.
--  - En psql: puedes descomentar la siguiente línea para cambiar de base de datos.
-- \c taller_db;

--- 0. ELIMINAR TODAS LAS TABLAS DE DATOS (NO toca usuarios ni roles)
DROP TABLE IF EXISTS auxiliar_matricula_estudiantes CASCADE;
DROP TABLE IF EXISTS auxiliar_matriculaciones CASCADE;
DROP TABLE IF EXISTS auxiliar_votos CASCADE;
DROP TABLE IF EXISTS auxiliar_votaciones CASCADE;
DROP TABLE IF EXISTS inscripciones CASCADE;
DROP TABLE IF EXISTS auxiliar_materias CASCADE;
DROP TABLE IF EXISTS clases_horarios CASCADE;
DROP TABLE IF EXISTS clases CASCADE;
DROP TABLE IF EXISTS materias CASCADE;
DROP TABLE IF EXISTS aulas CASCADE;
DROP TABLE IF EXISTS materias_globales CASCADE;
DROP TABLE IF EXISTS carreras CASCADE;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre_completo VARCHAR(255),
    carrera VARCHAR(255),
    cu VARCHAR(8),
    correo VARCHAR(255),
    contrasenia VARCHAR(255),
    rol_id INT,
    FOREIGN KEY (rol_id) REFERENCES roles(id)
);

INSERT INTO roles (nombre)
SELECT 'estudiante'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE nombre = 'estudiante');

INSERT INTO roles (nombre)
SELECT 'auxiliar'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE nombre = 'auxiliar');

INSERT INTO roles (nombre)
SELECT 'administrador'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE nombre = 'administrador');

INSERT INTO usuarios (nombre_completo, carrera, cu, correo, contrasenia, rol_id)
SELECT 'Estudiante Base', NULL, NULL, 'estudiante@gmail.com',
       crypt('123456', gen_salt('bf'::text)),
       (SELECT id FROM roles WHERE nombre = 'estudiante')
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE correo = 'estudiante@gmail.com');

INSERT INTO usuarios (nombre_completo, carrera, cu, correo, contrasenia, rol_id)
SELECT 'Auxiliar Base', NULL, NULL, 'auxiliar@gmail.com',
       crypt('123456', gen_salt('bf'::text)),
       (SELECT id FROM roles WHERE nombre = 'auxiliar')
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE correo = 'auxiliar@gmail.com');

INSERT INTO usuarios (nombre_completo, carrera, cu, correo, contrasenia, rol_id)
SELECT 'Administrador Base', NULL, NULL, 'admin@gmail.com',
       crypt('123456', gen_salt('bf'::text)),
       (SELECT id FROM roles WHERE nombre = 'administrador')
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE correo = 'admin@gmail.com');

-- 1. TABLA DE CARRERAS (lista oficial)
CREATE TABLE carreras (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL UNIQUE
);

-- 1.0 TABLA DE MATERIAS GLOBALES (lista oficial de materias)
CREATE TABLE materias_globales (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    sigla VARCHAR(50) NOT NULL,
    color VARCHAR(7) NOT NULL,
    CONSTRAINT materias_globales_nombre_unique UNIQUE (nombre),
    CONSTRAINT materias_globales_sigla_unique UNIQUE (sigla)
);

-- 1.1 TABLA DE AULAS (lista oficial de aulas con capacidad)
CREATE TABLE aulas (
    id SERIAL PRIMARY KEY,
    sigla VARCHAR(50) NOT NULL UNIQUE,
    capacidad INT NOT NULL
);

-- 1.3 AÑADIR COLUMNA carrera_id A USUARIOS (opcional, no borra datos)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'usuarios'
          AND column_name = 'carrera_id'
    ) THEN
        ALTER TABLE usuarios ADD COLUMN carrera_id INT;
    END IF;
END;
$$;

-- 2. CREAR MATERIAS
CREATE TABLE materias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    sigla VARCHAR(50) NOT NULL,
    docente VARCHAR(255),
    grupo VARCHAR(50),
    color VARCHAR(7) NOT NULL,
    usuario_id INT NOT NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    UNIQUE(usuario_id, nombre),
    UNIQUE(usuario_id, sigla)
);

-- 3. CREAR CLASES
CREATE TABLE clases (
    id SERIAL PRIMARY KEY,
    id_materia INT NOT NULL,
    sigla VARCHAR(255) NOT NULL,
    docente VARCHAR(255) NOT NULL,
    grupo VARCHAR(255) NOT NULL,
    dia_semana INT NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    tipo_clase INT NOT NULL DEFAULT 1,
    aula VARCHAR(50) NOT NULL,
    FOREIGN KEY (id_materia) REFERENCES materias(id) ON DELETE CASCADE
);

-- 3.1 TABLA DE ASIGNACIÓN DE MATERIAS A AUXILIARES
--    Relaciona usuarios con rol auxiliar con materias globales que dictan
CREATE TABLE auxiliar_materias (
    id SERIAL PRIMARY KEY,
    auxiliar_id INT NOT NULL,
    materia_global_id INT NOT NULL,
    grupo VARCHAR(50) NOT NULL,
    veces_por_semana INT NOT NULL DEFAULT 2,
    horas_por_clase INT NOT NULL DEFAULT 2,
    FOREIGN KEY (auxiliar_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (materia_global_id) REFERENCES materias_globales(id) ON DELETE CASCADE,
    UNIQUE(auxiliar_id, materia_global_id, grupo)
);

-- 3.2 TABLAS PARA MATRÍCULA A AUXILIATURAS (por código)
CREATE TABLE auxiliar_matriculaciones (
    id SERIAL PRIMARY KEY,
    auxiliar_materia_id INT NOT NULL UNIQUE,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (auxiliar_materia_id) REFERENCES auxiliar_materias(id) ON DELETE CASCADE
);

CREATE TABLE auxiliar_matricula_estudiantes (
    id SERIAL PRIMARY KEY,
    matriculacion_id INT NOT NULL,
    estudiante_id INT NOT NULL,
    fecha_inscripcion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (matriculacion_id) REFERENCES auxiliar_matriculaciones(id) ON DELETE CASCADE,
    FOREIGN KEY (estudiante_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    UNIQUE(matriculacion_id, estudiante_id)
);

-- 3.3 TABLA PARA ESTADO DE VOTACIONES DE AUXILIATURAS
CREATE TABLE auxiliar_votaciones (
    id SERIAL PRIMARY KEY,
    auxiliar_materia_id INT NOT NULL UNIQUE,
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_inicio TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_cierre TIMESTAMP,
    FOREIGN KEY (auxiliar_materia_id) REFERENCES auxiliar_materias(id) ON DELETE CASCADE
);

CREATE TABLE auxiliar_votos (
    id SERIAL PRIMARY KEY,
    votacion_id INT NOT NULL,
    estudiante_id INT NOT NULL,
    dia_semana INT NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (votacion_id) REFERENCES auxiliar_votaciones(id) ON DELETE CASCADE,
    FOREIGN KEY (estudiante_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    UNIQUE (votacion_id, estudiante_id, dia_semana, hora_inicio)
);

-- 3.1 CREAR TABLA PARA HORARIOS IMPORTADOS DESDE EXCEL
CREATE TABLE clases_horarios (
    id SERIAL PRIMARY KEY,
    archivo VARCHAR(255),
    hoja VARCHAR(255),
    fila INTEGER,
    dia_semana INT NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    aula VARCHAR(50),
    materia VARCHAR(255),
    docente VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. CREAR INSCRIPCIONES
CREATE TABLE inscripciones (
    id SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_clase INT NOT NULL,
    fecha_inscripcion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (id_clase) REFERENCES clases(id) ON DELETE CASCADE,
    UNIQUE(id_usuario, id_clase)
);

-- Auxiliaturas que dicta el auxiliar (tipo 3)
-- Copiamos exactamente las auxiliaturas del estudiante (tipo 2) pero marcadas como tipo 3
-- FIS200 G1: 1 vez por semana
-- (2, 'FIS200', 'Rene Llanos', 'G1', 3, '09:00', '11:00', 3, 'C101'),
-- MAT103 G1: 2 veces por semana
-- (5, 'MAT103', 'Rene Llanos', 'G1', 4, '16:00', '18:00', 3, 'E301'),
-- (5, 'MAT103', 'Rene Llanos', 'G1', 5, '16:00', '18:00', 3, 'E301');



