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
-- Copiamos exactamente las auxiliaturas del estudiante (tipo 2) pero marcadas como tipo 3
-- FIS200 G1: 1 vez por semana
(2, 'FIS200', 'Rene Llanos', 'G1', 3, '09:00', '11:00', 3, 'C101'),
-- MAT103 G1: 2 veces por semana
(5, 'MAT103', 'Rene Llanos', 'G1', 4, '16:00', '18:00', 3, 'E301'),
(5, 'MAT103', 'Rene Llanos', 'G1', 5, '16:00', '18:00', 3, 'E301');

-- 6.1 Sincronizar materias_globales con las materias creadas para el usuario de prueba
INSERT INTO materias_globales (nombre, sigla, color)
SELECT DISTINCT nombre, sigla, color
FROM materias
ON CONFLICT (sigla) DO NOTHING;

-- 7. INSCRIBIR AUTOMÁTICAMENTE A UN ESTUDIANTE Y A UN AUXILIAR (DATOS DE PRUEBA)
--    - Estudiante: se inscribe a clases tipo 1 y 2 (materias + auxiliaturas que recibe)
--    - Auxiliar: se inscribe a clases tipo 1 y 3 (materias + auxiliaturas que dicta)
DO $$
DECLARE
    v_estudiante_id INT;
    v_auxiliar_id INT;
BEGIN
    -- Intentar usar un estudiante específico por correo (si existe)
    SELECT id INTO v_estudiante_id
    FROM usuarios
    WHERE LOWER(correo) = LOWER('reneco@gmail.com')
    LIMIT 1;

    -- Si no se encuentra por correo, tomar cualquier usuario con rol estudiante (rol_id = 1)
    IF v_estudiante_id IS NULL THEN
        SELECT id INTO v_estudiante_id
        FROM usuarios
        WHERE rol_id = 1
        ORDER BY id
        LIMIT 1;
    END IF;

    -- Buscar un auxiliar (rol_id = 2)
    SELECT id INTO v_auxiliar_id
    FROM usuarios
    WHERE rol_id = 2
    ORDER BY id
    LIMIT 1;

    -- Asignar al auxiliar en auxiliar_materias las mismas materias globales
    -- que tienen clases marcadas como auxiliaturas (tipo_clase = 2).
    -- La frecuencia (veces_por_semana) se calcula según cuántas clases tipo 2 hay
    -- por materia/grupo (FIS200: 1, MAT103: 2).
    IF v_auxiliar_id IS NOT NULL THEN
        INSERT INTO auxiliar_materias (auxiliar_id, materia_global_id, grupo, veces_por_semana, horas_por_clase)
        SELECT
            v_auxiliar_id,
            mg.id,
            c.grupo,
            COUNT(*) AS veces_por_semana,
            2 AS horas_por_clase
        FROM clases c
        JOIN materias m ON c.id_materia = m.id
        JOIN materias_globales mg ON mg.sigla = m.sigla
        WHERE c.tipo_clase = 2
        GROUP BY mg.id, c.grupo
        ON CONFLICT (auxiliar_id, materia_global_id, grupo) DO NOTHING;
    END IF;

    -- Inscribir estudiante a todas las clases tipo 1 y 2
    IF v_estudiante_id IS NOT NULL THEN
        INSERT INTO inscripciones (id_usuario, id_clase)
        SELECT v_estudiante_id, c.id
        FROM clases c
        WHERE c.tipo_clase IN (1, 2);
    END IF;

    -- Inscribir auxiliar a todas las clases tipo 1 y 3 (no a tipo 2)
    IF v_auxiliar_id IS NOT NULL THEN
        INSERT INTO inscripciones (id_usuario, id_clase)
        SELECT v_auxiliar_id, c.id
        FROM clases c
        WHERE c.tipo_clase IN (1, 3);
    END IF;
END;
$$;

-- 8. VERIFICAR
SELECT COUNT(*) as total_materias FROM materias;
SELECT COUNT(*) as total_clases FROM clases;
SELECT COUNT(*) as total_inscripciones FROM inscripciones;


