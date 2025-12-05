-- Script de inicialización básica (se ejecuta antes que otros scripts)
-- Crea tablas de roles y usuarios e inserta solo los roles base.

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
