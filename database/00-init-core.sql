-- Script de inicialización básica (se ejecuta antes que otros scripts)
-- Crea tablas de roles y usuarios, inserta roles base y algunos usuarios de prueba.

-- 0. Extensión para hashear contraseñas con bcrypt compatible
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Tabla de roles
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255)
);

-- 2. Tabla de usuarios (estructura base, sin columna carrera_id)
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

-- 3. Insertar roles base (si no existen)
INSERT INTO roles (nombre) VALUES 
    ('estudiante'),
    ('auxiliar'),
    ('administrador')
ON CONFLICT DO NOTHING;

-- 4. Crear usuarios de prueba solo si la tabla está vacía
DO $$
DECLARE
    v_count INT;
    v_rol_estudiante INT;
    v_rol_auxiliar INT;
    v_rol_admin INT;
BEGIN
    SELECT COUNT(*) INTO v_count FROM usuarios;

    IF v_count = 0 THEN
        SELECT id INTO v_rol_estudiante FROM roles WHERE nombre = 'estudiante' LIMIT 1;
        SELECT id INTO v_rol_auxiliar FROM roles WHERE nombre = 'auxiliar' LIMIT 1;
        SELECT id INTO v_rol_admin FROM roles WHERE nombre = 'administrador' LIMIT 1;

        -- Insertar algunos usuarios de ejemplo.
        -- Las contraseñas se hashean con bcrypt mediante pgcrypto (gen_salt('bf')).
        INSERT INTO usuarios (nombre_completo, carrera, cu, correo, contrasenia, rol_id) VALUES
            ('Demo Estudiante 1', 'Ingeniería de Sistemas', '00-0001', 'demo1@example.com', crypt('demo123', gen_salt('bf')), v_rol_estudiante),
            ('Demo Estudiante 2', 'Ingeniería de Sistemas', '00-0002', 'demo2@example.com', crypt('demo123', gen_salt('bf')), v_rol_estudiante),
            ('Demo Auxiliar',     'Ingeniería de Sistemas', '00-0003', 'auxiliar@example.com', crypt('demo123', gen_salt('bf')), v_rol_auxiliar),
            ('Demo Admin',        'Ingeniería de Sistemas', '00-0004', 'admin@example.com',    crypt('admin123', gen_salt('bf')), v_rol_admin);
    END IF;
END;
$$;

-- 5. Ajustar la secuencia de IDs de usuarios al máximo ID actual
SELECT setval(pg_get_serial_sequence('usuarios', 'id'), COALESCE((SELECT MAX(id) FROM usuarios), 1));
