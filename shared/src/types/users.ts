export enum UserRole {
  ADMIN = 'ADMIN',
  PARTNER = 'PARTNER',
  EMPLOYEE = 'EMPLOYEE',
  VIEWER = 'VIEWER'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  partnerId?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  user: User;
  token: string;
}
