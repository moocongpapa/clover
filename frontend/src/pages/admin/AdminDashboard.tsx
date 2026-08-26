import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type DashboardStats } from '../../api';
import './Admin.css';

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.admin.getDashboard();
      setStats(data);
    } catch (err: any) {
      setError(err.message || '통계를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="admin-card"><p>통계 데이터를 불러오는 중…</p></div>;
  }

  if (error || !stats) {
    return (
      <div className="admin-card">
        <p style={{ color: '#dc2626' }}>{error || '데이터를 불러올 수 없습니다.'}</p>
        <button onClick={loadStats} className="admin-btn admin-btn--secondary">다시 시도</button>
      </div>
    );
  }

  const { summary, trend7Days, recentUsers, recentGroups, recentFeedbacks } = stats;

  const maxDailyUser = Math.max(...trend7Days.map((t) => t.users), 1);

  return (
    <div>
      <div className="admin-page-header">
        <div className="admin-page-title-row">
          <div>
            <h1 className="admin-page-title">📊 운영 대시보드</h1>
            <p className="admin-page-desc">Clover 서비스의 핵심 지표 및 최근 활동 현황입니다.</p>
          </div>
          <button onClick={loadStats} className="admin-btn admin-btn--secondary">
            🔄 새로고침
          </button>
        </div>
      </div>

      {/* KPI 4-Grid */}
      <div className="admin-kpi-grid">
        <div className="admin-kpi-card">
          <p className="admin-kpi-card__label">👥 총 사용자 수</p>
          <p className="admin-kpi-card__val">{summary.totalUsers.toLocaleString()}명</p>
          <p className="admin-kpi-card__sub">오늘 +{summary.usersToday}명 (7일간 +{summary.users7d}명)</p>
        </div>
        <div className="admin-kpi-card">
          <p className="admin-kpi-card__label">🏠 개설된 모임 수</p>
          <p className="admin-kpi-card__val">{summary.totalGroups.toLocaleString()}개</p>
          <p className="admin-kpi-card__sub">공개 모임 {summary.publicGroups}개 (오늘 +{summary.groupsToday}개)</p>
        </div>
        <div className="admin-kpi-card">
          <p className="admin-kpi-card__label">📅 누적 일정 / 활성</p>
          <p className="admin-kpi-card__val">{summary.totalEvents}개</p>
          <p className="admin-kpi-card__sub">진행 예정 {summary.activeEvents}개 (총 투표 {summary.totalVotes}건)</p>
        </div>
        <div className="admin-kpi-card">
          <p className="admin-kpi-card__label">📩 미처리 사용자 피드백</p>
          <p className="admin-kpi-card__val" style={{ color: summary.pendingFeedback > 0 ? '#ea580c' : 'inherit' }}>
            {summary.pendingFeedback}건
          </p>
          <p className="admin-kpi-card__sub">
            <Link to="/admin/feedback" style={{ color: 'inherit', textDecoration: 'underline' }}>
              피드백 관리 바로가기 ›
            </Link>
          </p>
        </div>
      </div>

      {/* 7-Day User Growth Bar Chart */}
      <div className="admin-card">
        <h2 className="admin-card-title">📈 최근 7일 신규 가입자 추이</h2>
        <div className="admin-chart-wrap">
          {trend7Days.map((item, idx) => {
            const heightPercent = Math.max(8, (item.users / maxDailyUser) * 100);
            return (
              <div key={idx} className="admin-chart-col">
                <span className="admin-chart-val">{item.users}</span>
                <div
                  className="admin-chart-bar"
                  style={{ height: `${heightPercent}%` }}
                />
                <span className="admin-chart-label">{item.date}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2-Column Recent Lists */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {/* Recent Users */}
        <div className="admin-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 className="admin-card-title" style={{ margin: 0 }}>👤 최근 가입한 회원</h2>
            <Link to="/admin/users" style={{ fontSize: '12.5px', color: 'var(--accent)', fontWeight: 700 }}>
              전체 보기 ›
            </Link>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>이름</th>
                  <th>권한</th>
                  <th>상태</th>
                  <th>가입일</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 700 }}>{u.displayName}</td>
                    <td>
                      <span className={`admin-badge ${u.role === 'ADMIN' ? 'admin-badge--blue' : 'admin-badge--gray'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <span className={`admin-badge ${u.isBlocked ? 'admin-badge--red' : 'admin-badge--green'}`}>
                        {u.isBlocked ? '정지' : '정상'}
                      </span>
                    </td>
                    <td style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Groups */}
        <div className="admin-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 className="admin-card-title" style={{ margin: 0 }}>🏠 최근 생성된 모임</h2>
            <Link to="/admin/groups" style={{ fontSize: '12.5px', color: 'var(--accent)', fontWeight: 700 }}>
              전체 보기 ›
            </Link>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>모임명</th>
                  <th>종목</th>
                  <th>멤버수</th>
                  <th>생성일</th>
                </tr>
              </thead>
              <tbody>
                {recentGroups.map((g) => (
                  <tr key={g.id}>
                    <td style={{ fontWeight: 700 }}>{g.name}</td>
                    <td>
                      <span className="admin-badge admin-badge--gray">{g.category}</span>
                    </td>
                    <td>{g._count?.members || 0}명</td>
                    <td style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>
                      {new Date(g.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Feedbacks */}
      <div className="admin-card" style={{ marginTop: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 className="admin-card-title" style={{ margin: 0 }}>📩 최근 접수된 피드백</h2>
          <Link to="/admin/feedback" style={{ fontSize: '12.5px', color: 'var(--accent)', fontWeight: 700 }}>
            전체 피드백 관리 ›
          </Link>
        </div>
        {recentFeedbacks.length === 0 ? (
          <p style={{ color: 'var(--ink-muted)' }}>최근 접수된 피드백이 없습니다.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: '120px' }}>작성자</th>
                  <th>피드백 내용</th>
                  <th style={{ width: '90px' }}>상태</th>
                  <th style={{ width: '130px' }}>접수일시</th>
                </tr>
              </thead>
              <tbody>
                {recentFeedbacks.map((fb) => (
                  <tr key={fb.id}>
                    <td style={{ fontWeight: 700 }}>{fb.userName}</td>
                    <td style={{ whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>{fb.content}</td>
                    <td>
                      <span
                        className={`admin-badge ${
                          fb.status === 'RESOLVED'
                            ? 'admin-badge--green'
                            : fb.status === 'IN_PROGRESS'
                              ? 'admin-badge--blue'
                              : 'admin-badge--yellow'
                        }`}
                      >
                        {fb.status === 'RESOLVED' ? '완료' : fb.status === 'IN_PROGRESS' ? '검토' : '대기'}
                      </span>
                    </td>
                    <td style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>
                      {new Date(fb.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
