import { Request, Response, NextFunction } from 'express';
import { AuthService, UserSessionPayload } from '../services/authService';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import { UserRole } from '@zr-erp/shared';

// Extend Express Request interface with user
declare global {
  namespace Express {
    interface Request {
      user?: UserSessionPayload;
    }
  }
}

const authService = new AuthService();

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Accès non autorisé: jeton de connexion manquant.'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = authService.verifyToken(token);
    // Fetch live user to ensure account wasn't deactivated
    const liveUser = authService.getUserById(decoded.id);

    if (!liveUser.isActive) {
      return next(new UnauthorizedError('Ce compte utilisateur a été désactivé.'));
    }

    req.user = liveUser;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...allowedRoles: (UserRole | UserRole[])[]) {
  const flattened = allowedRoles.flat();
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentification requise.'));
    }

    if (!flattened.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Action non autorisée pour le profil "${req.user.role}". Droits insuffisants.`
        )
      );
    }

    next();
  };
}

/**
 * Strict Financial Guard:
 * Only ADMIN and PARTNER roles can access financial, partner, or withdrawal endpoints.
 * EMPLOYEE and VIEWER roles are strictly prohibited from modifying financial records.
 */
export function requireFinanceAccess(requireMutation: boolean = false) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentification requise.'));
    }

    // Employees cannot access finance at all
    if (req.user.role === UserRole.EMPLOYEE) {
      return next(
        new ForbiddenError('Les employés n\'ont pas accès aux données ou opérations financières.')
      );
    }

    // Viewers cannot perform mutations
    if (requireMutation && req.user.role === UserRole.VIEWER) {
      return next(
        new ForbiddenError('Les comptes en lecture seule ne peuvent pas effectuer de modifications financières.')
      );
    }

    next();
  };
}

/**
 * Partner Self-Isolation Guard:
 * When a PARTNER accesses partner-specific actions (e.g. withdraw/contribute),
 * ensure they only operate on their own partner account.
 */
export function requireOwnPartnerOrAdmin(partnerIdParam: string = 'partnerId') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentification requise.'));
    }

    if (req.user.role === UserRole.ADMIN) {
      return next(); // Admin has universal access
    }

    const targetPartnerId = req.params[partnerIdParam] || req.body[partnerIdParam];

    if (req.user.role === UserRole.PARTNER) {
      if (!req.user.partnerId || req.user.partnerId !== targetPartnerId) {
        return next(
          new ForbiddenError('Vous ne pouvez consulter ou gérer que votre propre compte associé.')
        );
      }
      return next();
    }

    next(new ForbiddenError('Droits insuffisants.'));
  };
}
