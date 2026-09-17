import { Router, Request, Response, NextFunction } from 'express';
import { UserService } from '../services/userService';
import { AuthService } from '../services/authService';
import { authenticate, requireRole } from '../middleware/auth';
import { UserRole } from '@zr-erp/shared';

const router = Router();
const userService = new UserService();
const authService = new AuthService();

// All user management routes require ADMIN
router.use(authenticate);
router.use(requireRole(UserRole.ADMIN));

router.get('/', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const users = userService.listUsers();
    res.json({
      success: true,
      data: { users },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, role, partnerId } = req.body;
    const actor = req.user ? { id: req.user.id, name: req.user.name } : undefined;

    const created = await authService.createUser(
      { name, email, password, role, partnerId },
      actor
    );

    res.status(201).json({
      success: true,
      data: { user: created },
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/status', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const actor = req.user ? { id: req.user.id, name: req.user.name } : undefined;

    userService.toggleUserStatus(id, Boolean(isActive), actor);

    res.json({
      success: true,
      data: { message: `Statut utilisateur mis à jour: ${isActive ? 'Actif' : 'Désactivé'}` },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
