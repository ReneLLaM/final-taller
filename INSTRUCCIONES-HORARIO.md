# 📅 Sistema de Horarios - Instrucciones Completas

## ✅ Cambios Implementados

### 1. **Estilos Arreglados**
- ✅ Las tarjetas ya no se sobrelapan
- ✅ Usan sistema flex para acomodarse automáticamente
- ✅ Gap entre tarjetas en la misma celda

### 2. **Filtrado por Tipo de Clase**
- ✅ **Inicio**: Muestra todas las clases (normales + auxiliaturas)
- ✅ **Editar Horario**: Solo muestra clases normales (tipo_clase = 1)
- ✅ **Mis Auxiliaturas**: Solo muestra auxiliaturas (tipo_clase = 2)

### 3. **Celdas Interactivas**
- ✅ En la vista "Editar Horario" cualquier bloque es clickeable
- ✅ Al hacer clic se abre directamente el modal para agregar
- ✅ El modal mantiene el estilo solicitado

### 4. **Modal de Agregar Clase**
- ✅ Selector de materia (dropdown con materias de la BD)
- ✅ Campos: Sigla, Docente, Grupo, Hora Inicio/Fin, Aula
- ✅ Colores gestionados desde el modal de materias
- ✅ Cálculo automático de duración
- ✅ Botones "Cancelar" y "Guardar"

### 5. **APIs Creadas**
- ✅ `GET /api/materias` - Obtener todas las materias
- ✅ `POST /api/inscripciones` - Crear inscripción
- ✅ `GET /api/mis-inscripciones` - Ver mis inscripciones
- ✅ `DELETE /api/inscripciones/:id` - Eliminar inscripción

## 🚀 Cómo Usar el Sistema

### Acceder a Diferentes Vistas

#### 1. Ver Todo tu Horario (Inicio)
```
http://localhost:3000/pages/dashboard/principal.html
```
Muestra todas tus clases (normales + auxiliaturas)

#### 2. Editar Horario (Solo Clases Normales)
```
http://localhost:3000/pages/dashboard/principal.html?section=horario
```
- Solo muestra clases normales (tipo_clase = 1)
- Aparecen botones "+" en celdas vacías
- Puedes agregar nuevas clases

#### 3. Mis Auxiliaturas
```
http://localhost:3000/pages/dashboard/principal.html?section=auxiliaturas
```
- Solo muestra auxiliaturas (tipo_clase = 2)
- No aparecen botones "+"

### Agregar una Nueva Clase

1. Ve a "Editar Horario"
2. Haz clic en el bloque del horario donde quieres agendar
3. Llena el formulario:
   - **Materia**: Selecciona de la lista
   - **Sigla**: Ej: FIS100
   - **Docente**: Ej: R.GUTIERREZ
   - **Grupo**: Ej: G1
   - **Hora Inicio/Fin**: Selecciona las horas (por defecto se proponen 2h)
   - **Aula**: Ej: C101
   - **Color**: Se define al crear o editar la materia
4. Clic en "Guardar"
5. La clase se agregará automáticamente a tu horario

## 🗄️ Base de Datos

### Estructura de Tablas

```sql
-- Tabla materias
materias (id, nombre, color, usuario_id)

-- Tabla clases
clases (
    id, id_materia, sigla, docente, grupo,
    dia_semana, hora_inicio, hora_fin, tipo_clase, aula
)

-- Tabla inscripciones (relación usuario-clase)
inscripciones (id, id_usuario, id_clase, fecha_inscripcion)
```

### Actualizar la Base de Datos

Ejecuta el script de migración:
```bash
psql -U tu_usuario -d tu_base_de_datos -f database/migration-clases.sql
```

Esto creará:
- Tabla `clases` con los nuevos campos
- Tabla `inscripciones`
- Datos de ejemplo con el usuario id=4

## 🎨 Colores Disponibles

El selector de color (disponible en la gestión de materias) incluye:
1. 🔵 Azul (#2196F3)
2. 🔴 Rojo (#F44336)
3. 🟢 Verde (#4CAF50)
4. 🟠 Naranja (#FF9800)
5. 🟣 Morado (#9C27B0)
6. 🔵 Cyan (#00BCD4)
7. 🟠 Naranja Oscuro (#FF5722)
8. 🟢 Verde Claro (#8BC34A)
9. 🎨 Selector libre (input tipo color) para personalizar cualquier tono

## 📱 Responsive

El horario es completamente responsive y se adapta a:
- 💻 Desktop (1400px+)
- 📱 Tablets (768px - 1400px)
- 📱 Móviles (< 768px)

## 🔐 Autenticación

Todas las operaciones requieren autenticación:
- El token se envía automáticamente en las cookies
- Las APIs están protegidas con `verifyToken` middleware
- Solo puedes ver y modificar tus propias clases

## 🎯 Endpoints de la API

### Materias
```
GET    /api/materias           - Listar materias
GET    /api/materias/:id       - Ver materia
POST   /api/materias           - Crear materia
PUT    /api/materias/:id       - Actualizar materia
DELETE /api/materias/:id       - Eliminar materia
```

### Clases
```
GET    /api/clases             - Listar todas las clases
GET    /api/mis-clases         - Mis clases (autenticado)
GET    /api/clases/dia/:dia    - Clases por día
POST   /api/clases             - Crear clase
PUT    /api/clases/:id         - Actualizar clase
DELETE /api/clases/:id         - Eliminar clase
```

### Inscripciones
```
POST   /api/inscripciones                    - Inscribirse en clase
GET    /api/mis-inscripciones                - Ver mis inscripciones
DELETE /api/inscripciones/:id                - Eliminar inscripción
DELETE /api/inscripciones/clase/:id_clase    - Desinscribirse por clase
```

## ⚙️ Ejecutar el Servidor

```bash
npm start
```

El servidor arrancará en `http://localhost:3000`

## 🐛 Solución de Problemas

### Las tarjetas se solapan
✅ Ya corregido - Ahora usan flexbox

### No veo el botón "+"
- Asegúrate de estar en `?section=horario`
- El botón solo aparece en celdas vacías

### El modal no se abre
- Revisa la consola del navegador
- Verifica que jQuery no esté interfiriendo

### Error al guardar la clase
- Verifica que todos los campos estén llenos
- Revisa que la base de datos esté actualizada
- Verifica que estés autenticado

## 📝 Notas Importantes

1. Las clases creadas desde "Editar Horario" siempre son tipo `1` (normal)
2. El usuario se inscribe automáticamente en las clases que crea
3. Los colores se almacenan en formato hexadecimal
4. Los colores se editan desde el módulo de materias
5. Las nuevas clases se inicializan con 2h por defecto, pero puedes ajustarlo
6. La duración se calcula automáticamente
7. Las horas deben estar en formato HH:MM (24 horas)

## 🎉 Listo!

Ahora tienes un sistema completo de gestión de horarios con:
- ✅ Vista filtrada por tipo de clase
- ✅ Interfaz para agregar clases
- ✅ Modal elegante para gestionar materias y colores
- ✅ APIs RESTful completas
- ✅ Autenticación y autorización
- ✅ Diseño responsive
