import { Router, Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { authenticate } from '../middleware/auth';

const router = Router();
const authService = new AuthService();

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await authService.login(email, password, { ip, userAgent });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/me', authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', authenticate, (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: { message: 'Déconnexion réussie.' },
  });
});

export default router;
