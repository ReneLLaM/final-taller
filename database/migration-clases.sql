-- =======================================
-- MIGRACIÓN DE LA TABLA CLASES
-- =======================================
-- Este script actualiza la tabla clases para incluir 
-- día de la semana y hora de inicio

-- 1. Eliminar la tabla clases existente (si existe)


-- 2. Recrear la tabla con la nueva estructura
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

CREATE TABLE clases (
    id SERIAL PRIMARY KEY,
    id_materia INT,
    sigla VARCHAR(255),
    docente VARCHAR(255),
    grupo VARCHAR(255),
    dia_semana INT, -- 1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes, 6=Sábado
    hora_inicio TIME,
    hora_fin TIME,
    tipo_clase INT, -- 1 = clase normal, 2 = auxiliatura
    aula VARCHAR(50),
    FOREIGN KEY (id_materia) REFERENCES materias(id)
);

-- 2.1. Crear tabla de inscripciones


CREATE TABLE inscripciones (
    id SERIAL PRIMARY KEY,
    id_usuario INT,
    id_clase INT,
    fecha_inscripcion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (id_clase) REFERENCES clases(id) ON DELETE CASCADE,
    UNIQUE(id_usuario, id_clase) -- Evitar duplicados
);

-- 3. Insertar los datos de ejemplo
INSERT INTO materias (nombre, sigla, color, usuario_id) VALUES
('Programación Intermedia', 'SIS101', '#FF1744', 4),
('Física Básica III', 'FIS200', '#2196F3', 4),
('Teoría de Sistemas', 'SIS308', '#4CAF50', 4),
('Sistemas Administrativos y Económicos', 'SIS310', '#9C27B0', 4),
('Álgebra II', 'MAT103', '#8BC34A', 4),
('Cálculo II', 'MAT102', '#FF9800', 4);

INSERT INTO clases (id_materia, sigla, docente, grupo, dia_semana, hora_inicio, hora_fin, tipo_clase, aula)
VALUES
-- PROGRAMACIÓN INTERMEDIA (Lunes y Viernes)
(1, 'SIS101', 'H.PEÑARANDA', 'G3', 1, '09:00', '11:00', 1, 'B205'),
(1, 'SIS101', 'H.PEÑARANDA', 'G3', 5, '09:00', '11:00', 1, 'B205'),

(2, 'FIS200', 'R.GUTIERREZ', 'G6', 2, '07:00', '09:00', 1, 'E301'),
(2, 'FIS200', 'R.GUTIERREZ', 'G1', 2, '09:00', '11:00', 1, 'E301'),
(2, 'FIS200', 'Rene Llanos', 'G1', 3, '09:00', '11:00', 2, 'C101'),
(2, 'FIS200', 'R.GUTIERREZ', 'G6', 4, '11:00', '13:00', 1, 'E301'),

(3, 'SIS308', 'E.ESPINOZA', 'G2', 1, '14:00', '16:00', 1, 'B008'),
(3, 'SIS308', 'E.ESPINOZA', 'G6', 3, '14:00', '16:00', 1, 'B008'),

(4, 'FIS200', 'R.GUTIERREZ', 'G6', 2, '14:00', '16:00', 1, 'C001'),
(4, 'FIS200', 'R.GUTIERREZ', 'G6', 5, '14:00', '16:00', 1, 'C001'),

(5, 'MAT103', 'E.ZAMBRANA', 'G6', 4, '11:00', '13:00', 1, 'C001'),
(5, 'MAT103', 'E.ZAMBRANA', 'G6', 5, '12:00', '13:00', 1, 'C001'),
(5, 'MAT103', 'Rene Llanos', 'G1', 4, '16:00', '18:00', 2, 'E301'),
(5, 'MAT103', 'Rene Llanos', 'G1', 5, '16:00', '18:00', 2, 'E301'),

(6, 'MAT102', 'O.VELASCO', 'G8', 1, '16:00', '18:00', 1, 'C003'),
(6, 'MAT102', 'O.VELASCO', 'G6', 4, '16:00', '18:00', 1, 'C003');

-- 4. Insertar inscripciones para el usuario con id 4
INSERT INTO inscripciones (id_usuario, id_clase) VALUES
(4, 1),  -- PROGRAMACIÓN INTERMEDIA - Lunes
(4, 2),  -- PROGRAMACIÓN INTERMEDIA - Viernes
(4, 3),  -- FÍSICA BÁSICA III - Martes 07:00
(4, 4),  -- FÍSICA BÁSICA III - Martes 09:00
(4, 5),  -- FÍSICA BÁSICA III - Miércoles (auxiliatura)
(4, 6),  -- FÍSICA BÁSICA III - Jueves
(4, 7),  -- TEORÍA DE SISTEMAS - Lunes
(4, 8),  -- TEORÍA DE SISTEMAS - Miércoles
(4, 9),  -- SISTEMAS ADM. Y ECON. - Martes
(4, 10), -- SISTEMAS ADM. Y ECON. - Viernes
(4, 11), -- ÁLGEBRA II - Jueves 11:00
(4, 12), -- ÁLGEBRA II - Viernes 12:00
(4, 13), -- ÁLGEBRA II - Jueves (auxiliatura)
(4, 14), -- ÁLGEBRA II - Viernes (auxiliatura)
(4, 15), -- CÁLCULO II - Lunes
(4, 16); -- CÁLCULO II - Jueves

-- 5. Verificar los datos insertados
SELECT 
    c.id,
    m.nombre as materia,
    c.sigla,
    c.docente,
    c.grupo,
    c.dia_semana,
    c.hora_inicio,
    c.hora_fin,
    c.tipo_clase,
    c.aula
FROM clases c
INNER JOIN materias m ON c.id_materia = m.id
ORDER BY c.dia_semana, c.hora_inicio;
