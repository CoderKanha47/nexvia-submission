export type UserRole = 'student' | 'instructor' | 'admin';

export const ROLE_LABELS: Record<UserRole, string> = {
  student: 'Student',
  instructor: 'Instructor',
  admin: 'Admin',
};

export const ROLE_COLORS: Record<UserRole, { bg: string; text: string }> = {
  student: { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  instructor: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  admin: { bg: 'bg-amber-100', text: 'text-amber-700' },
};

export const ROLE_ICONS: Record<UserRole, string> = {
  student: 'graduation-cap',
  instructor: 'chalkboard-teacher',
  admin: 'shield-check',
};

export const HOME_ROUTES: Record<UserRole, string> = {
  student: '/my-learning',
  instructor: '/instructor/dashboard',
  admin: '/admin',
};

export function getRoleLabel(role: UserRole): string {
  return ROLE_LABELS[role] ?? role;
}

export function getRoleColors(role: UserRole): { bg: string; text: string } {
  return ROLE_COLORS[role] ?? { bg: 'bg-gray-100', text: 'text-gray-700' };
}

export function getHomeRoute(role: UserRole): string {
  return HOME_ROUTES[role] ?? '/my-learning';
}

export function getRoleIcon(role: UserRole): string {
  return ROLE_ICONS[role] ?? 'user';
}