import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function InviteJoin() {
  const { code } = useParams<{ code: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/login');
      return;
    }
    if (!code) return;

    api
      .joinByInvite(code)
      .then(() => navigate('/my-groups'))
      .catch(() => navigate('/groups'));
  }, [code, user, loading, navigate]);

  return <p className="loading-text">초대 링크 처리 중…</p>;
}
