import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isProfileComplete } from '../api';

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <p className="loading-text">불러오는 중…</p>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If user profile is missing any required field (name, birthday, gender, phone), require onboarding
  if (!isProfileComplete(user) && location.pathname !== '/profile/edit') {
    return <Navigate to="/profile/edit?required=true" replace />;
  }

  return <>{children}</>;
}
