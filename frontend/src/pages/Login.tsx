import { type FormEvent, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import './Login.css';

export default function Login() {
  const { user, login, loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [name, setName] = useState('');
  const [kakaoUrl, setKakaoUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      setLoading(true);
      api
        .kakaoCallback(code)
        .then((res) => {
          loginWithToken(res.accessToken, res.user);
          navigate('/');
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }
  }, [searchParams, loginWithToken, navigate]);

  useEffect(() => {
    api.getKakaoUrl().then((r) => setKakaoUrl(r.url));
  }, []);

  const handleDevLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      await login(name.trim());
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>로그인</h1>
        <p className="login-sub">Clover에 오신 것을 환영해요</p>

        {kakaoUrl && (
          <a href={kakaoUrl} className="btn-kakao">
            카카오로 로그인
          </a>
        )}

        <div className="login-divider">
          <span>개발 모드</span>
        </div>

        <form onSubmit={handleDevLogin}>
          <label htmlFor="name">이름으로 빠른 로그인</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="홍길동"
            disabled={loading}
          />
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? '로그인 중…' : '개발 로그인'}
          </button>
        </form>

        {error && <p className="form-error">{error}</p>}

        <p className="login-note">
          카카오 API 키가 없을 때는 개발 로그인을 사용하세요.
        </p>
      </div>
    </div>
  );
}
