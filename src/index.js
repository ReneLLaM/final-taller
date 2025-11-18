import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import { PORT } from "./config.js";
import usersRoutes from "./routes/users.routes.js";
import authRoutes from "./routes/auth.routes.js";
import clasesRoutes from "./routes/clases.routes.js";
import materiasRoutes from "./routes/materias.routes.js";
import inscripcionesRoutes from "./routes/inscripciones.routes.js";
import carrerasRoutes from "./routes/carreras.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Servir archivos estáticos (HTML, CSS, JS del frontend)
app.use(express.static(path.join(__dirname, "../public")));

// Rutas API
app.use("/api", authRoutes);
app.use("/api", usersRoutes);
app.use("/api", clasesRoutes);
app.use("/api", materiasRoutes);
app.use("/api", inscripcionesRoutes);
app.use("/api", carrerasRoutes);

// Ruta raíz - redirigir al login
app.get("/", (req, res) => {
    res.redirect("/pages/auth/login.html");
});

const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

server.on('error', (err) => {
    if (err.code === 'EACCES') {
        console.error(`Error: No se tienen permisos para usar el puerto ${PORT}`);
        console.error('Intenta usar un puerto diferente (ej: $env:PORT=3001; npm run dev)');
        process.exit(1);
    } else if (err.code === 'EADDRINUSE') {
        console.error(`Error: El puerto ${PORT} ya está en uso`);
        console.error('Detén el proceso que está usando este puerto o cambia el puerto');
        process.exit(1);
    } else {
        console.error('Error al iniciar el servidor:', err.message);
        process.exit(1);
    }
});

