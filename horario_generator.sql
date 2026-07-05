CREATE DATABASE IF NOT EXISTS horario_generator;

USE horario_generator;

CREATE TABLE IF NOT EXISTS docentes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(250) NOT NULL,
    horas_disponibles INT UNSIGNED DEFAULT 20
);

CREATE TABLE IF NOT EXISTS materia (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(250) NOT NULL,
    horas_semanales INT UNSIGNED DEFAULT  0,
    semestre ENUM('1', '2', '3', '4', '5', '6')
);

CREATE TABLE IF NOT EXISTS imparte (
    id INT PRIMARY KEY AUTO_INCREMENT,
    id_docente INT NOT NULL,
    id_materia INT NOT NULL,
    FOREIGN KEY (id_docente) REFERENCES docentes(id) ON DELETE CASCADE,
    FOREIGN KEY (id_materia) REFERENCES materia(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS modulos_horario (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(50) NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL
);

INSERT INTO modulos_horario (nombre, hora_inicio, hora_fin) 
VALUES 
('1ra Hora', '08:00:00', '08:50:00'),
('2da Hora', '08:50:00', '09:30:00'),

('3ra Hora', '10:00:00', '10:50:00'),
('4ta Hora', '10:50:00', '11:40:00'),
('5ta Hora', '11:40:00', '12:30:00');

CREATE TABLE IF NOT EXISTS grupos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(50) NOT NULL,
    semestre ENUM('1', '2', '3', '4', '5', '6') NOT NULL
);

CREATE TABLE IF NOT EXISTS horarios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre_horario VARCHAR(250) NOT NULL,
    id_grupo INT NOT NULL,
    id_imparte INT NOT NULL,
    id_modulo INT NOT NULL,
    dia_semana ENUM('Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes') NOT NULL,
    
    FOREIGN KEY (id_grupo) REFERENCES grupos(id) ON DELETE CASCADE,
    FOREIGN KEY (id_imparte) REFERENCES imparte(id) ON DELETE CASCADE,
    FOREIGN KEY (id_modulo) REFERENCES modulos_horario(id) ON DELETE CASCADE,

    UNIQUE KEY no_traslape_grupo (id_grupo, dia_semana, id_modulo)
);

DELIMITER $$

CREATE TRIGGER antes_de_insertar_horario
BEFORE INSERT ON horarios
FOR EACH ROW
BEGIN
    DECLARE v_id_docente INT;
    
    SELECT id_docente INTO v_id_docente 
    FROM imparte 
    WHERE id = NEW.id_imparte;

    IF EXISTS (
        SELECT 1 
        FROM horarios h
        JOIN imparte i ON h.id_imparte = i.id
        WHERE i.id_docente = v_id_docente 
            AND h.dia_semana = NEW.dia_semana 
            AND h.id_modulo = NEW.id_modulo
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error: El docente ya tiene otra clase asignada en ese mismo horario y día.';
    END IF;
END$$

DELIMITER ;