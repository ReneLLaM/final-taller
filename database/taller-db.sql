

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
