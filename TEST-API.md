# 🧪 PRUEBAS PARA VERIFICAR EL SISTEMA

## 1. Verificar Base de Datos

Ejecuta esto en PostgreSQL:

```sql
-- Verificar que las tablas existen
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('materias', 'clases', 'inscripciones');

-- Ver cuántas clases tiene el usuario 4
SELECT COUNT(*) as total FROM inscripciones WHERE id_usuario = 4;

-- Ver las clases del usuario 4
SELECT 
    c.id,
    m.nombre as materia,
    c.dia_semana,
    c.hora_inicio,
    c.hora_fin,
    c.tipo_clase
FROM inscripciones i
INNER JOIN clases c ON i.id_clase = c.id
INNER JOIN materias m ON c.id_materia = m.id
WHERE i.id_usuario = 4
ORDER BY c.dia_semana, c.hora_inicio;
```

**Resultado esperado:** 16 clases

## 2. Verificar el Servidor

Abre la terminal y ejecuta:
```bash
npm start
```

Deberías ver:
```
Server running on port 3000
```

## 3. Probar la API Directamente

### 3.1 Primero, inicia sesión

Abre el navegador y ve a:
```
http://localhost:3000/pages/auth/login.html
```

Inicia sesión con el usuario que tenga ID 4.

### 3.2 Luego, prueba la API

Abre la consola del navegador (F12) y ejecuta:

```javascript
// Probar la API de mis clases
fetch('/api/mis-clases', {
    method: 'GET',
    credentials: 'include'
})
.then(r => r.json())
.then(data => {
    console.log('Clases obtenidas:', data.length);
    console.log(data);
})
.catch(err => console.error('Error:', err));
```

**Resultado esperado:** Array con 16 clases

### 3.3 Probar los filtros

```javascript
// Ver todas las clases
fetch('/api/mis-clases', { credentials: 'include' })
.then(r => r.json())
.then(clases => {
    console.log('Total:', clases.length);
    console.log('Normales:', clases.filter(c => c.tipo_clase === 1).length);
    console.log('Auxiliaturas:', clases.filter(c => c.tipo_clase === 2).length);
});
```

**Resultado esperado:**
- Total: 16
- Normales: 12
- Auxiliaturas: 4

## 4. Verificar el Frontend

### 4.1 Ver TODAS las clases (Inicio)
```
http://localhost:3000/pages/dashboard/principal.html
```

### 4.2 Ver solo NORMALES (Editar Horario)
```
http://localhost:3000/pages/dashboard/principal.html?section=horario
```

### 4.3 Ver solo AUXILIATURAS
```
http://localhost:3000/pages/dashboard/principal.html?section=auxiliaturas
```

## 5. Ver Logs en la Consola

Abre la consola del navegador (F12) y busca:
```
Renderizando clases: X
Clase 1: {objeto}
Procesando: MATERIA - Día X, HH:MM - HH:MM
Buscando celda: dia=X, hora=HH:00 ENCONTRADA/NO ENCONTRADA
Creando tarjeta: altura=Xpx, offset=Xpx
Renderizado completo
```

## 6. Si NO se muestran las clases

### Paso 1: Verifica el usuario
```sql
-- Ver todos los usuarios
SELECT id, nombre_completo, correo FROM usuarios;
```

Anota el ID del usuario con el que inicias sesión.

### Paso 2: Si el ID es diferente de 4

Ejecuta esto cambiando `TU_ID_REAL` por el ID correcto:

```sql
-- Eliminar inscripciones antiguas
DELETE FROM inscripciones;

-- Insertar para tu ID real
INSERT INTO inscripciones (id_usuario, id_clase) 
SELECT TU_ID_REAL, id FROM clases;
```

Por ejemplo, si tu ID es 2:
```sql
DELETE FROM inscripciones;
INSERT INTO inscripciones (id_usuario, id_clase) 
SELECT 2, id FROM clases;
```

## 7. Verificar que los Datos Llegan al Frontend

En la consola del navegador:

```javascript
// Ver qué recibe el frontend
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const celdas = document.querySelectorAll('.schedule-cell');
        console.log('Total de celdas:', celdas.length);
        
        const celdasConClases = Array.from(celdas).filter(c => c.children.length > 0);
        console.log('Celdas con clases:', celdasConClases.length);
        
        celdasConClases.forEach(c => {
            console.log(`Día ${c.dataset.dia}, Hora ${c.dataset.hora}:`, c.children.length, 'clase(s)');
        });
    }, 2000);
});
```

## 8. Si Aún No Funciona

Ejecuta este script SQL completo:

```sql
-- RESET TOTAL
DROP TABLE IF EXISTS inscripciones CASCADE;
DROP TABLE IF EXISTS clases CASCADE;
DROP TABLE IF EXISTS materias CASCADE;

-- Recrear todo
-- (Usa el contenido de EJECUTAR-ESTE.sql)
```

## 9. Estructura Esperada en la BD

```
materias (6 registros)
├── PROGRAMACIÓN INTERMEDIA
├── FÍSICA BÁSICA III
├── TEORÍA DE SISTEMAS
├── SISTEMAS ADMINISTRATIVOS Y ECONÓMICOS
├── ÁLGEBRA II
└── CÁLCULO II

clases (16 registros)
├── 12 de tipo 1 (normales)
└── 4 de tipo 2 (auxiliaturas)

inscripciones (16 registros)
└── Todos vinculados al usuario ID=4
```

## 10. Comandos Rápidos

```bash
# Ver si el servidor está corriendo
netstat -ano | findstr :3000

# Matar el proceso si está atascado
taskkill /PID XXXXX /F

# Reiniciar el servidor
npm start
```
