

CREATE TABLE roles(
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255)
);

CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nombre_completo VARCHAR(255),
    carrera VARCHAR(255),
    cu varchar(8),
    correo VARCHAR(255),
    contrasenia VARCHAR(255),
    rol_id INT,
    FOREIGN KEY (rol_id) REFERENCES roles(id)
);


-- INSERT INTO roles (nombre) VALUES ('estudiante'),('auxiliar'),('administrador');

-- INSERT INTO usuarios (nombre_completo,carrera,cu,correo,contrasenia,rol_id) VALUES ('Rene Llanos','Ingeniería de Sistemas','35-5051','rene.llanos@gmail.com','123456',1);


-- =======================================
-- CREACIÓN DE TABLAS
-- =======================================

CREATE TABLE materias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255)
);

CREATE TABLE clases (
    id SERIAL PRIMARY KEY,
    id_materia INT,
    sigla VARCHAR(255),
    docente VARCHAR(255),
    grupo VARCHAR(255),
    color VARCHAR(255),
    hora_fin VARCHAR(255),
    tipo_clase INT, -- 1 = estudiante normal, 2 = auxiliatura, 3 = administrador
    aula VARCHAR(50),
    FOREIGN KEY (id_materia) REFERENCES materias(id)
);

-- =======================================
-- INSERCIÓN DE DATOS
-- =======================================

-- MATERIAS
INSERT INTO materias (nombre) VALUES
('Programación Intermedia'),
('Física Básica III'),
('Teoría de Sistemas'),
('Sistemas Administrativos y Económicos'),
('Álgebra II'),
('Cálculo II');

-- CLASES
INSERT INTO clases (id_materia, sigla, docente, grupo, color, hora_fin, tipo_clase, aula)
VALUES
-- PROGRAMACIÓN INTERMEDIA
(1, 'SIS101', 'H.PEÑARANDA', 'G3', 'rojo', '11:00', 1, 'B205'),
(1, 'SIS101', 'H.PEÑARANDA', 'G3', 'rojo', '11:00', 1, 'B205'),

-- FÍSICA BÁSICA III
(2, 'FIS200', 'R.GUTIERREZ', 'G6', 'azul', '09:00', 1, 'E301'),
(2, 'FIS200', 'Rene Llanos', 'G1', 'azul', '11:00', 2, 'C101'),

-- TEORÍA DE SISTEMAS
(3, 'SIS308', 'E.ESPINOZA', 'G2', 'verde', '16:00', 1, 'B008'),
(3, 'SIS308', 'E.ESPINOZA', 'G6', 'verde', '16:00', 1, 'B008'),

-- SISTEMAS ADMINISTRATIVOS Y ECONÓMICOS
(4, 'FIS200', 'R.GUTIERREZ', 'G6', 'morado', '16:00', 1, 'C001'),
(4, 'FIS200', 'R.GUTIERREZ', 'G6', 'morado', '16:00', 1, 'C001'),

-- ÁLGEBRA II
(5, 'MAT103', 'E.ZAMBRANA', 'G6', 'verde', '13:00', 1, 'C001'),
(5, 'FIS200', 'Rene Llanos', 'G1', 'verde', '13:00', 2, 'C001'),

-- CÁLCULO II
(6, 'MAT102', 'O.VELASCO', 'G8', 'naranja', '18:00', 1, 'C003'),
(6, 'MAT102', 'O.VELASCO', 'G6', 'naranja', '18:00', 1, 'C101');

