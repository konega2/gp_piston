export const ADMIN_USER = 'admin';
export const ADMIN_PASSWORD = 'gp2026';

export function validateAdminCredentials(user: string, password: string): boolean {
  return user.trim() === ADMIN_USER && password === ADMIN_PASSWORD;
}
