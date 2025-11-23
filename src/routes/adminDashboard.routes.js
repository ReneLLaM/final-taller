import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { getAdminDashboardStats } from '../controllers/adminDashboard.controller.js';

const router = Router();

// Estadísticas agregadas para el dashboard del administrador
router.get(
  '/admin/dashboard-stats',
  authMiddleware,
  requireRole(3),
  getAdminDashboardStats,
);

export default router;
