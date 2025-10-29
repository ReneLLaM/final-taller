-- Script para inicializar los roles en la base de datos
-- Ejecutar este script después de crear las tablas

-- Insertar roles
INSERT INTO roles (nombre) VALUES 
('estudiante'),
('auxiliar'),
('administrador')
ON CONFLICT DO NOTHING;

-- Verificar que los roles se insertaron correctamente
SELECT * FROM roles;

