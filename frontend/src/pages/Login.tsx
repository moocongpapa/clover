import { type FormEvent, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import './Login.css';

export default function Login() {
  const { user, loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [kakaoUrl, setKakaoUrl] = useState<string | null>(null);
  const [showKakaoModal, setShowKakaoModal] = useState(false);
  const [kakaoAccountName, setKakaoAccountName] = useState('');
  const [kakaoPassword, setKakaoPassword] = useState('');
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

  const handleKakaoStart = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (kakaoUrl) {
      window.location.href = kakaoUrl;
      return;
    }
    // Direct Official Kakao OAuth URL
    const restApiKey = '48b4025d5f4f3087b3435862d6d67491';
    const redirectUri = `${window.location.origin}/login`;
    window.location.href = `https://kauth.kakao.com/oauth/authorize?client_id=${restApiKey}&redirect_uri=${encodeURIComponent(
      redirectUri,
    )}&response_type=code`;
  };

  const handleKakaoModalSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!kakaoAccountName.trim()) return;
    setLoading(true);
    setError('');
    try {
      const code = `mock_kakao_code:${encodeURIComponent(kakaoAccountName.trim())}`;
      const res = await api.kakaoCallback(code);
      loginWithToken(res.accessToken, res.user);
      setShowKakaoModal(false);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : '카카오 로그인 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>로그인</h1>
        <p className="login-sub">Clover에 오신 것을 환영해요</p>

        <button type="button" onClick={handleKakaoStart} className="btn-kakao">
          <svg className="kakao-symbol" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M12 3C6.477 3 2 6.477 2 10.765c0 2.766 1.83 5.19 4.606 6.576l-.94 3.454c-.084.308.261.551.527.373l4.135-2.735c.548.077 1.107.117 1.672.117 5.523 0 10-3.477 10-7.765C22 6.477 17.523 3 12 3z"/>
          </svg>
          <span>카카오로 시작하기</span>
        </button>

        {error && <p className="form-error">{error}</p>}
      </div>

      {/* Kakao Login Modal Dialog */}
      {showKakaoModal && (
        <div className="kakao-modal-backdrop" onClick={() => setShowKakaoModal(false)}>
          <div className="kakao-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="kakao-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg className="kakao-modal-logo" viewBox="0 0 24 24" width="20" height="20" fill="#191919">
                  <path d="M12 3C6.477 3 2 6.477 2 10.765c0 2.766 1.83 5.19 4.606 6.576l-.94 3.454c-.084.308.261.551.527.373l4.135-2.735c.548.077 1.107.117 1.672.117 5.523 0 10-3.477 10-7.765C22 6.477 17.523 3 12 3z"/>
                </svg>
                <span className="kakao-modal-header-brand">kakao</span>
              </div>
              <button
                type="button"
                className="kakao-modal-close"
                onClick={() => setShowKakaoModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleKakaoModalSubmit} className="kakao-modal-body">
              <h2 className="kakao-modal-title">카카오계정 로그인</h2>
              <p className="kakao-modal-sub">Clover 서비스 이용을 위해 카카오 계정으로 로그인해주세요.</p>

              <div className="kakao-modal-field">
                <label className="kakao-modal-label">카카오계정 (이메일 또는 닉네임)</label>
                <input
                  type="text"
                  placeholder="예: user@kakao.com 또는 닉네임"
                  value={kakaoAccountName}
                  onChange={(e) => setKakaoAccountName(e.target.value)}
                  required
                  className="kakao-modal-input"
                />
              </div>

              <div className="kakao-modal-field">
                <label className="kakao-modal-label">비밀번호</label>
                <input
                  type="password"
                  placeholder="비밀번호 입력"
                  value={kakaoPassword}
                  onChange={(e) => setKakaoPassword(e.target.value)}
                  required
                  className="kakao-modal-input"
                />
              </div>

              <div className="kakao-modal-actions">
                <button
                  type="button"
                  className="kakao-modal-btn-cancel"
                  onClick={() => setShowKakaoModal(false)}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="kakao-modal-btn-submit"
                  disabled={loading}
                >
                  {loading ? '로그인 중…' : '로그인'}
                </button>
              </div>

              <div className="kakao-modal-tip">
                💡 <b>안내</b>: <code>backend/.env</code> 파일의 <code>KAKAO_REST_API_KEY</code>에 Kakao Developers REST API 키를 발급받아 입력하시면 카카오 공식 OAuth2 로그인 서버로 자동 전환됩니다.
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
