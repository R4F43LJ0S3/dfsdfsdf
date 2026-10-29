-- ==============================================================================
-- Script de inicialización PostgreSQL para SIFTC (UTF-8 puro)
-- Esquema: seguridad (usuarios y roles base para pruebas locales del equipo)
-- ==============================================================================
SET client_encoding = 'UTF8';

CREATE SCHEMA IF NOT EXISTS seguridad;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS seguridad.roles (
    id_rol UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(30) NOT NULL UNIQUE,
    descripcion VARCHAR(150),
    permisos_clave VARCHAR(60) NOT NULL
);

CREATE TABLE IF NOT EXISTS seguridad.usuarios (
    id_usuario UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(120) NOT NULL UNIQUE,
    primer_nombre VARCHAR(30) NOT NULL,
    segundo_nombre VARCHAR(30),
    primer_apellido VARCHAR(30) NOT NULL,
    segundo_apellido VARCHAR(30),
    password_hash VARCHAR(100) NOT NULL,
    estado VARCHAR(10) NOT NULL DEFAULT 'activo',
    id_rol UUID NOT NULL REFERENCES seguridad.roles(id_rol)
);

-- Insertar o actualizar los 6 roles oficiales del sistema con UTF-8 íntegro
INSERT INTO seguridad.roles (id_rol, nombre, descripcion, permisos_clave)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Administrador', 'Control total del sistema', 'ADMIN_TOTAL'),
    ('00000000-0000-0000-0000-000000000002', 'Analista financiero', 'Calcula, valida y publica métricas', 'ANALISTA_METRICAS'),
    ('00000000-0000-0000-0000-000000000003', 'Gerente', 'Consulta rankings y toma decisiones', 'CONSULTA_GERENCIA'),
    ('00000000-0000-0000-0000-000000000004', 'Data Steward', 'Mantiene diccionario y reglas de calidad', 'DATA_STEWARD'),
    ('00000000-0000-0000-0000-000000000005', 'Auditor', 'Revisa linaje y bitácora', 'AUDITORIA'),
    ('00000000-0000-0000-0000-000000000006', 'Usuario móvil', 'Consulta cotizaciones y watchlist', 'CONSULTA_MOVIL')
ON CONFLICT (id_rol) DO UPDATE
SET nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    permisos_clave = EXCLUDED.permisos_clave;

-- Usuario semilla Analista: analista@siftc.edu.co / alza2026 (Juan Pérez Muñoz)
INSERT INTO seguridad.usuarios (id_usuario, email, primer_nombre, primer_apellido, segundo_apellido, password_hash, estado, id_rol)
VALUES (
    '01966f2a-4c3b-7a10-9e21-8b3d4c5e6f70',
    'analista@siftc.edu.co',
    'Juan',
    'Pérez',
    'Muñoz',
    '$2a$12$afO48hKy5Gyd.AW2c97zYO3FPxAPQqQHKX9aic9y5jF5s2lsF7GlK',
    'activo',
    '00000000-0000-0000-0000-000000000002'
) ON CONFLICT (email) DO UPDATE
SET primer_nombre = EXCLUDED.primer_nombre,
    primer_apellido = EXCLUDED.primer_apellido,
    segundo_apellido = EXCLUDED.segundo_apellido;

-- Usuario semilla Administrador: admin@siftc.edu.co / alza2026
INSERT INTO seguridad.usuarios (id_usuario, email, primer_nombre, primer_apellido, password_hash, estado, id_rol)
VALUES (
    '01966f2a-4c3b-7a10-9e21-8b3d4c5e6f71',
    'admin@siftc.edu.co',
    'Oscar',
    'Administrador',
    '$2a$12$afO48hKy5Gyd.AW2c97zYO3FPxAPQqQHKX9aic9y5jF5s2lsF7GlK',
    'activo',
    '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (email) DO UPDATE
SET primer_nombre = EXCLUDED.primer_nombre,
    primer_apellido = EXCLUDED.primer_apellido;
