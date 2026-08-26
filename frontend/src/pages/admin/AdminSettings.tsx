import { useEffect, useState } from 'react';
import { api } from '../../api';
import './Admin.css';

export default function AdminSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // Broadcast Notification Form
  const [pushTitle, setPushTitle] = useState('');
  const [pushMessage, setPushMessage] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await api.admin.getSettings();
      setSettings(data);
    } catch (err: any) {
      alert(err.message || '설정을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSetting = async (key: string, value: string) => {
    setSavingKey(key);
    try {
      await api.admin.setSetting(key, value);
      setSettings((prev) => ({ ...prev, [key]: value }));
      alert(`[${key}] 설정이 저장되었습니다.`);
    } catch (err: any) {
      alert(err.message || '설정 저장 실패');
    } finally {
      setSavingKey(null);
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pushTitle.trim() || !pushMessage.trim()) {
      return alert('알림 제목과 메시지를 입력하세요.');
    }

    if (!window.confirm(`전체 사용자에게 인앱/푸시 공지 알림을 발송하시겠습니까?\n\n제목: ${pushTitle}\n내용: ${pushMessage}`)) {
      return;
    }

    setBroadcasting(true);
    setBroadcastResult(null);
    try {
      const res = await api.admin.broadcastPush({
        title: pushTitle.trim(),
        message: pushMessage.trim(),
      });
      setBroadcastResult(`✅ 총 ${res.sentCount}명의 사용자에게 성공적으로 알림이 전송되었습니다.`);
      setPushTitle('');
      setPushMessage('');
    } catch (err: any) {
      alert(err.message || '알림 전송 실패');
    } finally {
      setBroadcasting(false);
    }
  };

  return (
    <div>
      <div className="admin-page-header">
        <div className="admin-page-title-row">
          <div>
            <h1 className="admin-page-title">⚙️ 앱 운영 설정 & 전체 알림 발송</h1>
            <p className="admin-page-desc">
              코드 배포 없이 운영 정책(최대 인원, 문의 링크 등)을 실시간 변경하고 전체 사용자에게 알림을 보냅니다.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <p>설정을 불러오는 중…</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
          {/* Operational Settings Card */}
          <div className="admin-card">
            <h2 className="admin-card-title">🔧 기본 운영 파라미터</h2>

            {/* Default Max Members */}
            <div className="admin-form-group">
              <label className="admin-form-label">모임 개설 시 기본 최대 정원 (명)</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="number"
                  className="admin-form-input"
                  value={settings['default_max_members'] ?? '50'}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, default_max_members: e.target.value }))
                  }
                />
                <button
                  onClick={() =>
                    handleSaveSetting('default_max_members', settings['default_max_members'] ?? '50')
                  }
                  disabled={savingKey === 'default_max_members'}
                  className="admin-btn admin-btn--primary admin-btn--sm"
                >
                  저장
                </button>
              </div>
            </div>

            {/* Customer Support Contact */}
            <div className="admin-form-group">
              <label className="admin-form-label">운영자 고객센터 카카오톡 ID 또는 오픈채팅 링크</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className="admin-form-input"
                  placeholder="예: https://open.kakao.com/o/..."
                  value={settings['support_kakao_link'] ?? ''}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, support_kakao_link: e.target.value }))
                  }
                />
                <button
                  onClick={() =>
                    handleSaveSetting('support_kakao_link', settings['support_kakao_link'] ?? '')
                  }
                  disabled={savingKey === 'support_kakao_link'}
                  className="admin-btn admin-btn--primary admin-btn--sm"
                >
                  저장
                </button>
              </div>
            </div>

            {/* Service Maintenance Mode */}
            <div className="admin-form-group" style={{ marginTop: '20px' }}>
              <label className="admin-form-label">서비스 점검 모드 활성화 (비상용)</label>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '10px 14px', borderRadius: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>
                  현재 상태: {settings['maintenance_mode'] === 'true' ? '🔴 점검 모드 활성 (접속 제한)' : '🟢 정상 운영 중'}
                </span>
                <button
                  onClick={() =>
                    handleSaveSetting(
                      'maintenance_mode',
                      settings['maintenance_mode'] === 'true' ? 'false' : 'true',
                    )
                  }
                  className={`admin-btn admin-btn--sm ${settings['maintenance_mode'] === 'true' ? 'admin-btn--secondary' : 'admin-btn--danger'}`}
                >
                  {settings['maintenance_mode'] === 'true' ? '점검 해제' : '점검 시작'}
                </button>
              </div>
            </div>
          </div>

          {/* Broadcast Push Card */}
          <div className="admin-card">
            <h2 className="admin-card-title">📣 전체 사용자 긴급/공지 알림 발송</h2>
            <p style={{ fontSize: '13px', color: 'var(--ink-muted)', marginBottom: '16px' }}>
              모든 가입 유저의 인앱 알림함에 실시간 공지 메시지를 일괄 발송합니다.
            </p>

            <form onSubmit={handleBroadcast}>
              <div className="admin-form-group">
                <label className="admin-form-label">알림 제목</label>
                <input
                  type="text"
                  className="admin-form-input"
                  placeholder="예: [안내] 금일 밤 정기 점검이 예정되어 있습니다."
                  value={pushTitle}
                  onChange={(e) => setPushTitle(e.target.value)}
                  required
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">알림 본문 내용</label>
                <textarea
                  className="admin-form-textarea"
                  placeholder="전체 사용자에게 전달할 메시지를 상세히 입력하세요."
                  value={pushMessage}
                  onChange={(e) => setPushMessage(e.target.value)}
                  rows={4}
                  required
                />
              </div>

              {broadcastResult && (
                <div style={{ background: '#e8f8f0', color: '#10b981', padding: '10px 12px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, marginBottom: '14px' }}>
                  {broadcastResult}
                </div>
              )}

              <button
                type="submit"
                disabled={broadcasting}
                className="admin-btn admin-btn--primary"
                style={{ width: '100%', height: '42px', fontSize: '14px' }}
              >
                {broadcasting ? '발송 중…' : '🚀 전체 사용자에게 알림 즉시 발송'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
