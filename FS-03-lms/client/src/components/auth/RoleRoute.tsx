import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../app/hooks';
import type { UserRole } from '../../lib/roles';
import { getHomeRoute } from '../../lib/roles';
import { toast } from 'sonner';

interface LocationState {
  from: { pathname: string };
}

interface RoleRouteProps {
  allow: UserRole[];
  children?: React.ReactNode;
}

export function RoleRoute({ allow, children }: RoleRouteProps) {
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: { pathname: location.pathname } } as LocationState} replace />;
  }

  const userRole = user?.role as UserRole;
  if (!allow.includes(userRole)) {
    // Show toast only once per session
    const toastKey = `access-denied-${location.pathname}`;
    if (!sessionStorage.getItem(toastKey)) {
      sessionStorage.setItem(toastKey, 'true');
      toast.error('You don\'t have access to that page');
    }
    return <Navigate to={getHomeRoute(userRole)} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}

export function ProtectedRoute({ children }: { children?: React.ReactNode }) {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: { pathname: location.pathname } } as LocationState} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}

export function StudentOnlyRoute({ children }: { children?: React.ReactNode }) {
  return <RoleRoute allow={['student']}>{children}</RoleRoute>;
}

export function InstructorRoute({ children }: { children?: React.ReactNode }) {
  return <RoleRoute allow={['instructor', 'admin']}>{children}</RoleRoute>;
}

export function AdminRoute({ children }: { children?: React.ReactNode }) {
  return <RoleRoute allow={['admin']}>{children}</RoleRoute>;
}