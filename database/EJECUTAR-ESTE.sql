-- =======================================
-- EJECUTA ESTE SCRIPT PARA RESETEAR TODO
-- =======================================
-- Copia y pega todo este contenido en pgAdmin o tu cliente PostgreSQL

\c taller_db;

-- 1. ELIMINAR TODO (en orden correcto)
DROP TABLE IF EXISTS inscripciones CASCADE;
DROP TABLE IF EXISTS clases CASCADE;
DROP TABLE IF EXISTS materias CASCADE;

-- 2. CREAR MATERIAS
CREATE TABLE materias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    sigla VARCHAR(50) NOT NULL,
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
INSERT INTO materias (nombre, sigla, color, usuario_id) VALUES
('PROGRAMACIÓN INTERMEDIA', 'SIS101', '#FF1744', 4),
('FÍSICA BÁSICA III', 'FIS200', '#2196F3', 4),
('TEORÍA DE SISTEMAS', 'SIS308', '#4CAF50', 4),
('SISTEMAS ADMINISTRATIVOS Y ECONÓMICOS', 'SIS310', '#9C27B0', 4),
('ÁLGEBRA II', 'MAT103', '#8BC34A', 4),
('CÁLCULO II', 'MAT102', '#FF9800', 4);

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
(6, 'MAT102', 'O.VELASCO', 'G6', 4, '16:00', '18:00', 1, 'C003');

-- 7. INSCRIBIR USUARIO 4
INSERT INTO inscripciones (id_usuario, id_clase) VALUES
(4, 1), (4, 2), (4, 3), (4, 4), (4, 5), (4, 6), (4, 7), (4, 8),
(4, 9), (4, 10), (4, 11), (4, 12), (4, 13), (4, 14), (4, 15), (4, 16);

-- 8. VERIFICAR
SELECT COUNT(*) as total_materias FROM materias;
SELECT COUNT(*) as total_clases FROM clases;
SELECT COUNT(*) as total_inscripciones FROM inscripciones WHERE id_usuario = 4;
