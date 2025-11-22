-- =======================================
-- EJECUTA ESTE SCRIPT PARA RESETEAR TODO
-- =======================================
-- Copia y pega todo este contenido en pgAdmin o tu cliente PostgreSQL
-- IMPORTANTE:
--  - En pgAdmin: conéctate primero manualmente a la base de datos "taller_db" y luego ejecuta este script.
--  - En psql: puedes descomentar la siguiente línea para cambiar de base de datos.
-- \c taller_db;

-- 0. ELIMINAR TODAS LAS TABLAS DE DATOS (NO toca usuarios ni roles)
DROP TABLE IF EXISTS inscripciones CASCADE;
DROP TABLE IF EXISTS clases_horarios CASCADE;
DROP TABLE IF EXISTS clases CASCADE;
DROP TABLE IF EXISTS materias CASCADE;
DROP TABLE IF EXISTS aulas CASCADE;
DROP TABLE IF EXISTS materias_globales CASCADE;
DROP TABLE IF EXISTS carreras CASCADE;

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

-- 1.2 INSERTAR CARRERAS OFICIALES
INSERT INTO carreras (nombre) VALUES
('Derecho'),
('Comunicación Social'),
('Sociología'),
('Historia'),
('Ingeniería Química'),
('Ingeniería Industrial'),
('Ingeniería Ambiental'),
('Ingeniería de Alimentos'),
('Ingeniería Comercial'),
('Economía'),
('Administración de Empresas'),
('Trabajo Social'),
('Gerencia y Administración Pública'),
('Química Farmacéutica'),
('Bioquímica'),
('Biología'),
('Idiomas'),
('Pedagogía'),
('Psicología'),
('Gastronomía (T.U.S.)'),
('Turismo'),
('Bioimagenología'),
('Kinesiología y Fisioterapia'),
('Laboratorio Clínico (T.U.S.)'),
('Nutrición y Dietética'),
('Enfermería'),
('Medicina'),
('Odontología'),
('Ing. Petróleo y Gas Natural'),
('Petróleo y Gas Natural (T.U.S.)'),
('Ingeniería de Sistemas'),
('Ingeniería en Telecomunicaciones'),
('Ingeniería en Diseño y Animación Digital'),
('Ingeniería en Tecnologías de la Información y Seguridad'),
('Ingeniería en Ciencias de la Computación'),
('T.U.S. Industrias de la Alimentación'),
('T.U.S. Informática'),
('Ingeniería Civil'),
('Arquitectura'),
('Carrera de Prótesis dental'),
('Carrera Enfermería Obstetriz'),
('Carrera de Mercadotecnia'),
('Carrera de Química Industrial'),
('Carrera de Mecánica Automotriz'),
('Carrera de Mecánica Industrial'),
('Carrera de Electricidad'),
('Ingeniería en Biotecnología')
ON CONFLICT (nombre) DO NOTHING;

-- 1.3 AÑADIR COLUMNA carrera_id A USUARIOS (opcional, no borra datos)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS carrera_id INT;

-- 1.4 INSERTAR AULAS OFICIALES
INSERT INTO aulas (sigla, capacidad) VALUES
('E101', 89),
('E103', 97),
('E201', 89),
('E203', 96),
('E301', 97),
('E303', 90),
('C001', 105),
('C002', 114),
('C003', 57),
('C004', 70),
('C005', 50),
('C006', 62),
('C101', 113),
('C102', 95),
('C103', 72),
('C104', 62),
('C105', 56),
('C106', 67),
('C201', 101),
('C202', 109),
('C203', 78),
('C204', 66),
('C205', 60),
('C206', 78),
('C301', 121),
('F102', 60),
('F103', 76),
('F201', 21),
('F202', 72),
('B007', 50),
('B008', 105),
('D001', 80),
('D002', 36),
('D003', 56),
('D101', 72),
('D102', 41),
('D103', 63),
('DS03', 64)
ON CONFLICT (sigla) DO NOTHING;

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

-- 5. INSERTAR MATERIAS
INSERT INTO materias (nombre, sigla, docente, grupo, color, usuario_id) VALUES
('PROGRAMACIÓN INTERMEDIA', 'SIS101', 'H.PEÑARANDA', 'G3', '#FF1744', 4),
('FÍSICA BÁSICA III', 'FIS200', 'R.GUTIERREZ', 'G1', '#2196F3', 4),
('TEORÍA DE SISTEMAS', 'SIS308', 'E.ESPINOZA', 'G2', '#4CAF50', 4),
('SISTEMAS ADMINISTRATIVOS Y ECONÓMICOS', 'SIS310', 'M.RAMIREZ', 'G6', '#9C27B0', 4),
('ÁLGEBRA II', 'MAT103', 'E.ZAMBRANA', 'G6', '#8BC34A', 4),
('CÁLCULO II', 'MAT102', 'O.VELASCO', 'G8', '#FF9800', 4);

-- 6. INSERTAR CLASES
INSERT INTO clases (id_materia, sigla, docente, grupo, dia_semana, hora_inicio, hora_fin, tipo_clase, aula) VALUES
(1, 'SIS101', 'H.PEÑARANDA', 'G3', 1, '09:00', '11:00', 1, 'B205'),
(1, 'SIS101', 'H.PEÑARANDA', 'G3', 5, '09:00', '11:00', 1, 'B205'),
(2, 'FIS200', 'R.GUTIERREZ', 'G6', 2, '07:00', '09:00', 1, 'E301'),
(2, 'FIS200', 'R.GUTIERREZ', 'G1', 2, '09:00', '11:00', 1, 'E301'),
(2, 'FIS200', 'Rene Llanos', 'G1', 3, '09:00', '11:00', 2, 'C101'),
(2, 'FIS200', 'R.GUTIERREZ', 'G6', 4, '11:00', '13:00', 1, 'E301'),
(3, 'SIS308', 'E.ESPINOZA', 'G2', 1, '14:00', '16:00', 1, 'B008'),
(3, 'SIS308', 'E.ESPINOZA', 'G6', 3, '14:00', '16:00', 1, 'B008'),
(4, 'SIS310', 'M.RAMIREZ', 'G6', 2, '14:00', '16:00', 1, 'C001'),
(4, 'SIS310', 'M.RAMIREZ', 'G6', 5, '14:00', '16:00', 1, 'C001'),
(5, 'MAT103', 'E.ZAMBRANA', 'G6', 4, '11:00', '13:00', 1, 'C001'),
(5, 'MAT103', 'E.ZAMBRANA', 'G6', 5, '12:00', '13:00', 1, 'C001'),
(5, 'MAT103', 'Rene Llanos', 'G1', 4, '16:00', '18:00', 2, 'E301'),
(5, 'MAT103', 'Rene Llanos', 'G1', 5, '16:00', '18:00', 2, 'E301'),
(6, 'MAT102', 'O.VELASCO', 'G8', 1, '16:00', '18:00', 1, 'C003'),
(6, 'MAT102', 'O.VELASCO', 'G6', 4, '16:00', '18:00', 1, 'C003'),
-- Auxiliaturas que dicta el auxiliar (tipo 3)
(2, 'MAT102', 'Rene Llanos', 'G3', 2, '09:00', '11:00', 3, 'C101'),
(5, 'MAT103', 'Rene Llanos', 'G2', 3, '09:00', '11:00', 3, 'C101');

-- 7. INSCRIBIR USUARIO 4
INSERT INTO inscripciones (id_usuario, id_clase) VALUES
(4, 1), (4, 2), (4, 3), (4, 4), (4, 5), (4, 6), (4, 7), (4, 8),
(4, 9), (4, 10), (4, 11), (4, 12), (4, 13), (4, 14), (4, 15), (4, 16),
(4, 17), (4, 18);

-- 8. VERIFICAR
SELECT COUNT(*) as total_materias FROM materias;
SELECT COUNT(*) as total_clases FROM clases;
SELECT COUNT(*) as total_inscripciones FROM inscripciones WHERE id_usuario = 4;


