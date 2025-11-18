# 🎯 INSTRUCCIONES FINALES - Sistema de Horarios

## ✅ Lo Que He Corregido

### 1. **API Backend** ✓
- La consulta SQL está correcta
- Devuelve todas las clases del usuario autenticado
- Incluye JOIN con materias e inscripciones

### 2. **Filtrado por Tipo** ✓
- **Inicio** (`/pages/dashboard/principal.html`) → Muestra TODAS (tipo 1 + tipo 2)
- **Editar Horario** (`?section=horario`) → Solo NORMALES (tipo 1)
- **Mis Auxiliaturas** (`?section=auxiliaturas`) → Solo AUXILIATURAS (tipo 2)

### 3. **Renderizado en Grilla** ✓
- Calcula correctamente la posición según `hora_inicio` y `hora_fin`
- Altura máxima limitada a 60px (una celda)
- Maneja offset para horas con minutos (ej: 09:30)
- Logs de debug para rastrear problemas

### 4. **Estilos** ✓
- Márgenes iguales al header (140px)
- Tarjetas con `position: absolute`
- Altura fija de celdas (60px)
- Colores según tipo de clase

## 🚀 PASOS PARA HACER QUE FUNCIONE

### PASO 1: Ejecutar el Script SQL

**Opción A - Desde Terminal:**
```bash
cd "C:\Users\renel\OneDrive\Escritorio\Taller de especialidad"
psql -U postgres -d taller_db -f database/EJECUTAR-ESTE.sql
```

**Opción B - Desde pgAdmin:**
1. Abre pgAdmin
2. Conecta a la base de datos `taller_db`
3. Query Tool → Abrir archivo → `database/EJECUTAR-ESTE.sql`
4. Ejecutar (F5)

**Resultado esperado:**
```
total_materias: 6
total_clases: 16
total_inscripciones: 16
```

### PASO 2: Verificar el Usuario

Ejecuta en PostgreSQL:
```sql
SELECT id, nombre_completo, correo FROM usuarios;
```

**¿El usuario con el que inicias sesión tiene ID = 4?**

- ✅ **SÍ** → Continúa al Paso 3
- ❌ **NO** → Ejecuta esto (cambia `TU_ID` por tu ID real):

```sql
DELETE FROM inscripciones;
INSERT INTO inscripciones (id_usuario, id_clase) 
SELECT TU_ID, id FROM clases;
```

Ejemplo si tu ID es 2:
```sql
DELETE FROM inscripciones;
INSERT INTO inscripciones (id_usuario, id_clase) 
SELECT 2, id FROM clases;
```

### PASO 3: Reiniciar el Servidor

```bash
# Detener el servidor si está corriendo (Ctrl+C)

# Iniciar nuevamente
npm start
```

Deberías ver:
```
Server running on port 3000
```

### PASO 4: Abrir el Navegador

```
http://localhost:3000
```

Inicia sesión con tu usuario.

### PASO 5: Ver los Logs

**Abre la Consola del Navegador (F12)**

Deberías ver algo como:
```
=== INICIANDO CARGA DE HORARIO ===
Sección actual: null
Filtro: TODAS LAS CLASES
Llamando a /api/mis-clases...
Respuesta recibida: 200 OK
Clases obtenidas de la API: 16
Primera clase: {id: 1, sigla: "SIS101", ...}
Llamando a renderizarClases con 16 clases
Renderizando clases: 16
Clase 1: {id: 1, sigla: "SIS101", ...}
Procesando: PROGRAMACIÓN INTERMEDIA - Día 1, 09:00 - 11:00
Buscando celda: dia=1, hora=09:00 ENCONTRADA
Creando tarjeta: altura=60px, offset=0px
...
Renderizado completo
=== CARGA DE HORARIO COMPLETADA ===
```

### PASO 6: Probar las Diferentes Vistas

#### Ver TODO el Horario (Inicio)
```
http://localhost:3000/pages/dashboard/principal.html
```
**Debe mostrar:** 16 clases (12 normales + 4 auxiliaturas)

#### Ver Solo Clases Normales (Editar Horario)
```
http://localhost:3000/pages/dashboard/principal.html?section=horario
```
**Debe mostrar:** 12 clases normales + botones "+" en celdas vacías

#### Ver Solo Auxiliaturas
```
http://localhost:3000/pages/dashboard/principal.html?section=auxiliaturas
```
**Debe mostrar:** 4 auxiliaturas (sin botones "+")

## 🔍 DIAGNÓSTICO DE PROBLEMAS

### Problema 1: No se muestran clases

**En la consola del navegador, verifica:**

1. ¿Aparece el mensaje "INICIANDO CARGA DE HORARIO"?
   - ❌ NO → El JavaScript no se está cargando
   - ✅ SÍ → Continúa

2. ¿Cuál es el status de la respuesta?
   - `200 OK` → La API funciona ✓
   - `401 Unauthorized` → No estás autenticado
   - `500 Error` → Error en el servidor

3. ¿Cuántas clases dice "Clases obtenidas de la API"?
   - `0` → El usuario no tiene inscripciones (vuelve al PASO 2)
   - `16` → Las clases se obtienen correctamente ✓

4. ¿Dice "Buscando celda: ... ENCONTRADA"?
   - ❌ NO ENCONTRADA → Las celdas del HTML no coinciden
   - ✅ ENCONTRADA → El renderizado funciona ✓

### Problema 2: Error 401 (No Autorizado)

**Significa que no estás autenticado.**

1. Ve a `/pages/auth/login.html`
2. Inicia sesión
3. Vuelve a `/pages/dashboard/principal.html`

### Problema 3: "Clases obtenidas: 0"

**El usuario no tiene inscripciones.**

Ejecuta en PostgreSQL:
```sql
-- Ver tus inscripciones
SELECT * FROM inscripciones WHERE id_usuario = TU_ID;

-- Si está vacío, inserta:
INSERT INTO inscripciones (id_usuario, id_clase) 
SELECT TU_ID, id FROM clases;
```

### Problema 4: "NO ENCONTRADA" en las celdas

**Las celdas del HTML no coinciden con los datos.**

Verifica que las clases tengan:
- `dia_semana` entre 1 y 6
- `hora_inicio` en formato HH:MM:SS o HH:MM

Ejecuta:
```sql
SELECT id, dia_semana, hora_inicio, hora_fin 
FROM clases 
WHERE dia_semana < 1 OR dia_semana > 6;
```

Si hay resultados, corrígelos.

## 📊 Distribución de Clases

### Clases Normales (tipo_clase = 1) - 12 total

| Día       | Horario       | Materia                     | Sigla  | Aula |
|-----------|---------------|-----------------------------|--------|------|
| Lunes     | 09:00 - 11:00 | PROGRAMACIÓN INTERMEDIA     | SIS101 | B205 |
| Lunes     | 14:00 - 16:00 | TEORÍA DE SISTEMAS          | SIS308 | B008 |
| Lunes     | 16:00 - 18:00 | CÁLCULO II                  | MAT102 | C003 |
| Martes    | 07:00 - 09:00 | FÍSICA BÁSICA III           | FIS200 | E301 |
| Martes    | 09:00 - 11:00 | FÍSICA BÁSICA III           | FIS200 | E301 |
| Martes    | 14:00 - 16:00 | SISTEMAS ADM. Y ECON.       | SIS310 | C001 |
| Miércoles | 14:00 - 16:00 | TEORÍA DE SISTEMAS          | SIS308 | B008 |
| Jueves    | 11:00 - 13:00 | FÍSICA BÁSICA III           | FIS200 | E301 |
| Jueves    | 11:00 - 13:00 | ÁLGEBRA II                  | MAT103 | C001 |
| Jueves    | 16:00 - 18:00 | CÁLCULO II                  | MAT102 | C003 |
| Viernes   | 09:00 - 11:00 | PROGRAMACIÓN INTERMEDIA     | SIS101 | B205 |
| Viernes   | 12:00 - 13:00 | ÁLGEBRA II                  | MAT103 | C001 |
| Viernes   | 14:00 - 16:00 | SISTEMAS ADM. Y ECON.       | SIS310 | C001 |

### Auxiliaturas (tipo_clase = 2) - 4 total

| Día       | Horario       | Materia           | Docente      | Aula |
|-----------|---------------|-------------------|--------------|------|
| Miércoles | 09:00 - 11:00 | FÍSICA BÁSICA III | Rene Llanos  | C101 |
| Jueves    | 16:00 - 18:00 | ÁLGEBRA II        | Rene Llanos  | E301 |
| Viernes   | 16:00 - 18:00 | ÁLGEBRA II        | Rene Llanos  | E301 |

## 🎨 Colores

- 🔴 PROGRAMACIÓN INTERMEDIA: `#FF1744`
- 🔵 FÍSICA BÁSICA III: `#2196F3`
- 🟢 TEORÍA DE SISTEMAS: `#4CAF50`
- 🟣 SISTEMAS ADM. Y ECON.: `#9C27B0`
- 🟢 ÁLGEBRA II: `#8BC34A`
- 🟠 CÁLCULO II: `#FF9800`

## ✅ Checklist Final

- [ ] Script SQL ejecutado correctamente
- [ ] 6 materias en la BD
- [ ] 16 clases en la BD
- [ ] 16 inscripciones para tu usuario
- [ ] Servidor corriendo en puerto 3000
- [ ] Inicio de sesión exitoso
- [ ] Consola del navegador muestra logs
- [ ] Horario se renderiza en la página

## 🆘 Si Nada Funciona

1. **Elimina TODO y empieza de cero:**
```sql
DROP TABLE IF EXISTS inscripciones CASCADE;
DROP TABLE IF EXISTS clases CASCADE;
DROP TABLE IF EXISTS materias CASCADE;
```

2. **Ejecuta el script completo:**
```bash
psql -U postgres -d taller_db -f database/EJECUTAR-ESTE.sql
```

3. **Verifica tu ID de usuario y actualiza inscripciones**

4. **Reinicia el servidor**

5. **Limpia el caché del navegador (Ctrl+Shift+Delete)**

6. **Inicia sesión nuevamente**

---

**¡Ahora debería funcionar perfectamente!** 🎉
