import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { LoadingScreen } from '../../components/LoadingScreen';
import { useAuth } from './AuthContext';

export function RequireAuth({ requireActive = true }: { requireActive?: boolean }) {
  const { member, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <LoadingScreen />;
  if (!member) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (requireActive && member.status !== 'active') return <Navigate to="/pending" replace />;

  return <Outlet />;
}

export function RequireAdmin() {
  const { member } = useAuth();

  if (member?.status !== 'active' || member.role !== 'admin') return <Navigate to="/events" replace />;

  return <Outlet />;
}
