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

// Ruta raíz - redirigir al login
app.get("/", (req, res) => {
    res.redirect("/pages/auth/login.html");
});

app.listen(PORT);
console.log(`Server running on port ${PORT}`);

