# Horario - Instrucciones de Instalación

Este documento explica cómo configurar y visualizar el horario de clases.

## 1. Actualizar la Base de Datos

Ejecuta el script de migración para actualizar la estructura de la tabla `clases`:

```bash
psql -U tu_usuario -d tu_base_de_datos -f database/migration-clases.sql
```

O si prefieres usar la base de datos completa desde cero:

```bash
psql -U tu_usuario -d tu_base_de_datos -f database/taller-db.sql
```

## 2. Reiniciar el Servidor

Después de actualizar la base de datos, reinicia el servidor de Node.js:

```bash
npm start
```

## 3. Acceder al Horario

Abre tu navegador y ve a:

```
http://localhost:3000/pages/dashboard/principal.html?section=horario
```

## Estructura de la Base de Datos

La tabla `materias` incluye:

- `id` - Identificador único
- `nombre` - Nombre visible en el horario
- `color` - Color asociado a la materia (formato hex)
- `usuario_id` - Propietario de la materia

La tabla `clases` ahora incluye:

- `id` - ID único de la clase
- `id_materia` - ID de la materia (FK)
- `sigla` - Código de la materia (ej: SIS101)
- `docente` - Nombre del docente
- `grupo` - Grupo (ej: G1, G2, G3)
- `dia_semana` - Día de la semana (1=Lunes, 2=Martes, ..., 6=Sábado)
- `hora_inicio` - Hora de inicio (formato TIME)
- `hora_fin` - Hora de fin (formato TIME)
- `tipo_clase` - Tipo de clase:
  - `1` = Clase normal (fondo #edfaff)
  - `2` = Auxiliatura (fondo #fffeeb)
- `aula` - Aula donde se imparte la clase

## API Endpoints

### Obtener todas las clases
```
GET /api/clases
```

### Obtener clases por día
```
GET /api/clases/dia/:dia
```

Donde `:dia` es un número del 1 al 6 (1=Lunes, 6=Sábado)

### Crear una nueva clase
```
POST /api/clases
```

Body:
```json
{
  "id_materia": 1,
  "sigla": "SIS101",
  "docente": "H.PEÑARANDA",
  "grupo": "G3",
  "dia_semana": 1,
  "hora_inicio": "09:00",
  "hora_fin": "11:00",
  "tipo_clase": 1,
  "aula": "B205"
}
```

### Actualizar una clase
```
PUT /api/clases/:id
```

### Eliminar una clase
```
DELETE /api/clases/:id
```

## Características del Horario

- ✅ Diseño responsivo
- ✅ Colores personalizados por materia
- ✅ Diferenciación visual entre clases normales y auxiliaturas
- ✅ Información completa: materia, docente, grupo, aula y horario
- ✅ Grid semanal de Lunes a Sábado
- ✅ Franjas horarias de 7:00 a 22:00
- ✅ Tarjetas que ocupan el espacio según duración de la clase

## Solución de Problemas

### Error al cargar el horario

1. Verifica que el servidor esté corriendo
2. Asegúrate de que la base de datos esté actualizada con la migración
3. Revisa la consola del navegador para ver errores

### Las clases no se muestran

1. Verifica que existan datos en la tabla `clases`
2. Ejecuta la consulta de verificación del archivo `migration-clases.sql`
3. Revisa los logs del servidor

### Error de conexión a la base de datos

1. Verifica que PostgreSQL esté corriendo
2. Revisa las credenciales en el archivo `.env`
3. Asegúrate de que la base de datos exista
