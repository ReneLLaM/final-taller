-- =======================================
-- SCRIPT DE RESET COMPLETO DE HORARIOS
-- =======================================
-- Este script elimina y vuelve a crear todo el sistema de horarios
-- IMPORTANTE: Ejecutar este script completo en orden

-- ========================================
-- PASO 1: ELIMINAR TABLAS EN ORDEN CORRECTO
-- ========================================

-- 1.1 Eliminar inscripciones primero (depende de clases y usuarios)
DROP TABLE IF EXISTS inscripciones CASCADE;

-- 1.2 Eliminar clases (depende de materias)
DROP TABLE IF EXISTS clases CASCADE;

-- 1.3 Eliminar materias
DROP TABLE IF EXISTS materias CASCADE;

-- ========================================
-- PASO 2: CREAR TABLA MATERIAS
-- ========================================

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

-- ========================================
-- PASO 3: CREAR TABLA CLASES
-- ========================================

CREATE TABLE clases (
    id SERIAL PRIMARY KEY,
    id_materia INT NOT NULL,
    sigla VARCHAR(255) NOT NULL,
    docente VARCHAR(255) NOT NULL,
    grupo VARCHAR(255) NOT NULL,
    dia_semana INT NOT NULL, -- 1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes, 6=Sábado
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    tipo_clase INT NOT NULL DEFAULT 1, -- 1 = clase normal, 2 = auxiliatura
    aula VARCHAR(50) NOT NULL,
    FOREIGN KEY (id_materia) REFERENCES materias(id) ON DELETE CASCADE,
    CHECK (dia_semana >= 1 AND dia_semana <= 6),
    CHECK (tipo_clase IN (1, 2)),
    CHECK (hora_fin > hora_inicio)
);

-- ========================================
-- PASO 4: CREAR TABLA INSCRIPCIONES
-- ========================================

CREATE TABLE inscripciones (
    id SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_clase INT NOT NULL,
    fecha_inscripcion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (id_clase) REFERENCES clases(id) ON DELETE CASCADE,
    UNIQUE(id_usuario, id_clase) -- Evitar inscripciones duplicadas
);

-- ========================================
-- PASO 5: INSERTAR MATERIAS
-- ========================================

INSERT INTO materias (nombre, sigla, color, usuario_id) VALUES
('PROGRAMACIÓN INTERMEDIA', 'SIS101', '#FF1744', 4),
('FÍSICA BÁSICA III', 'FIS200', '#2196F3', 4),
('TEORÍA DE SISTEMAS', 'SIS308', '#4CAF50', 4),
('SISTEMAS ADMINISTRATIVOS Y ECONÓMICOS', 'SIS310', '#9C27B0', 4),
('ÁLGEBRA II', 'MAT103', '#8BC34A', 4),
('CÁLCULO II', 'MAT102', '#FF9800', 4);

-- ========================================
-- PASO 6: INSERTAR CLASES
-- ========================================

INSERT INTO clases (id_materia, sigla, docente, grupo, dia_semana, hora_inicio, hora_fin, tipo_clase, aula)
VALUES
-- PROGRAMACIÓN INTERMEDIA (id_materia = 1)
-- Lunes 09:00-11:00
(1, 'SIS101', 'H.PEÑARANDA', 'G3', 1, '09:00', '11:00', 1, 'B205'),
-- Viernes 09:00-11:00
(1, 'SIS101', 'H.PEÑARANDA', 'G3', 5, '09:00', '11:00', 1, 'B205'),

-- FÍSICA BÁSICA III (id_materia = 2)
-- Martes 07:00-09:00 (Grupo G6)
(2, 'FIS200', 'R.GUTIERREZ', 'G6', 2, '07:00', '09:00', 1, 'E301'),
-- Martes 09:00-11:00 (Grupo G1)
(2, 'FIS200', 'R.GUTIERREZ', 'G1', 2, '09:00', '11:00', 1, 'E301'),
-- Miércoles 09:00-11:00 (Auxiliatura)
(2, 'FIS200', 'Rene Llanos', 'G1', 3, '09:00', '11:00', 2, 'C101'),
-- Jueves 11:00-13:00
(2, 'FIS200', 'R.GUTIERREZ', 'G6', 4, '11:00', '13:00', 1, 'E301'),

-- TEORÍA DE SISTEMAS (id_materia = 3)
-- Lunes 14:00-16:00
(3, 'SIS308', 'E.ESPINOZA', 'G2', 1, '14:00', '16:00', 1, 'B008'),
-- Miércoles 14:00-16:00
(3, 'SIS308', 'E.ESPINOZA', 'G6', 3, '14:00', '16:00', 1, 'B008'),

-- SISTEMAS ADMINISTRATIVOS Y ECONÓMICOS (id_materia = 4)
-- Martes 14:00-16:00
(4, 'SIS310', 'M.RAMIREZ', 'G6', 2, '14:00', '16:00', 1, 'C001'),
-- Viernes 14:00-16:00
(4, 'SIS310', 'M.RAMIREZ', 'G6', 5, '14:00', '16:00', 1, 'C001'),

-- ÁLGEBRA II (id_materia = 5)
-- Jueves 11:00-13:00
(5, 'MAT103', 'E.ZAMBRANA', 'G6', 4, '11:00', '13:00', 1, 'C001'),
-- Viernes 12:00-13:00
(5, 'MAT103', 'E.ZAMBRANA', 'G6', 5, '12:00', '13:00', 1, 'C001'),
-- Jueves 16:00-18:00 (Auxiliatura)
(5, 'MAT103', 'Rene Llanos', 'G1', 4, '16:00', '18:00', 2, 'E301'),
-- Viernes 16:00-18:00 (Auxiliatura)
(5, 'MAT103', 'Rene Llanos', 'G1', 5, '16:00', '18:00', 2, 'E301'),

-- CÁLCULO II (id_materia = 6)
-- Lunes 16:00-18:00
(6, 'MAT102', 'O.VELASCO', 'G8', 1, '16:00', '18:00', 1, 'C003'),
-- Jueves 16:00-18:00
(6, 'MAT102', 'O.VELASCO', 'G6', 4, '16:00', '18:00', 1, 'C003');

-- ========================================
-- PASO 7: INSCRIBIR AL USUARIO ID=4 EN TODAS LAS CLASES
-- ========================================

INSERT INTO inscripciones (id_usuario, id_clase) VALUES
(4, 1),  -- PROGRAMACIÓN INTERMEDIA - Lunes 09:00
(4, 2),  -- PROGRAMACIÓN INTERMEDIA - Viernes 09:00
(4, 3),  -- FÍSICA BÁSICA III - Martes 07:00 (G6)
(4, 4),  -- FÍSICA BÁSICA III - Martes 09:00 (G1)
(4, 5),  -- FÍSICA BÁSICA III - Miércoles 09:00 (Auxiliatura)
(4, 6),  -- FÍSICA BÁSICA III - Jueves 11:00
(4, 7),  -- TEORÍA DE SISTEMAS - Lunes 14:00
(4, 8),  -- TEORÍA DE SISTEMAS - Miércoles 14:00
(4, 9),  -- SISTEMAS ADM. Y ECON. - Martes 14:00
(4, 10), -- SISTEMAS ADM. Y ECON. - Viernes 14:00
(4, 11), -- ÁLGEBRA II - Jueves 11:00
(4, 12), -- ÁLGEBRA II - Viernes 12:00
(4, 13), -- ÁLGEBRA II - Jueves 16:00 (Auxiliatura)
(4, 14), -- ÁLGEBRA II - Viernes 16:00 (Auxiliatura)
(4, 15), -- CÁLCULO II - Lunes 16:00
(4, 16); -- CÁLCULO II - Jueves 16:00

-- ========================================
-- PASO 8: VERIFICACIÓN - CONSULTAR LOS DATOS
-- ========================================

-- Ver todas las materias
SELECT * FROM materias ORDER BY id;

-- Ver todas las clases con sus materias
SELECT 
    c.id,
    m.nombre as materia,
    c.sigla,
    c.docente,
    c.grupo,
    CASE c.dia_semana
        WHEN 1 THEN 'Lunes'
        WHEN 2 THEN 'Martes'
        WHEN 3 THEN 'Miércoles'
        WHEN 4 THEN 'Jueves'
        WHEN 5 THEN 'Viernes'
        WHEN 6 THEN 'Sábado'
    END as dia,
    c.hora_inicio,
    c.hora_fin,
    CASE c.tipo_clase
        WHEN 1 THEN 'Normal'
        WHEN 2 THEN 'Auxiliatura'
    END as tipo,
    c.aula,
    m.color
FROM clases c
INNER JOIN materias m ON c.id_materia = m.id
ORDER BY c.dia_semana, c.hora_inicio;

-- Ver las inscripciones del usuario 4
SELECT 
    i.id as inscripcion_id,
    u.nombre_completo as estudiante,
    m.nombre as materia,
    c.sigla,
    c.docente,
    CASE c.dia_semana
        WHEN 1 THEN 'Lunes'
        WHEN 2 THEN 'Martes'
        WHEN 3 THEN 'Miércoles'
        WHEN 4 THEN 'Jueves'
        WHEN 5 THEN 'Viernes'
        WHEN 6 THEN 'Sábado'
    END as dia,
    c.hora_inicio,
    c.hora_fin,
    CASE c.tipo_clase
        WHEN 1 THEN 'Normal'
        WHEN 2 THEN 'Auxiliatura'
    END as tipo
FROM inscripciones i
INNER JOIN usuarios u ON i.id_usuario = u.id
INNER JOIN clases c ON i.id_clase = c.id
INNER JOIN materias m ON c.id_materia = m.id
WHERE i.id_usuario = 4
ORDER BY c.dia_semana, c.hora_inicio;

-- Contar totales
SELECT 
    (SELECT COUNT(*) FROM materias) as total_materias,
    (SELECT COUNT(*) FROM clases) as total_clases,
    (SELECT COUNT(*) FROM clases WHERE tipo_clase = 1) as clases_normales,
    (SELECT COUNT(*) FROM clases WHERE tipo_clase = 2) as auxiliaturas,
    (SELECT COUNT(*) FROM inscripciones WHERE id_usuario = 4) as inscripciones_usuario_4;

-- ========================================
-- RESULTADO ESPERADO:
-- ========================================
-- total_materias: 6
-- total_clases: 16
-- clases_normales: 12
-- auxiliaturas: 4
-- inscripciones_usuario_4: 16
-- ========================================
