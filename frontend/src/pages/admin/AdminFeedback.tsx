import { useEffect, useState } from 'react';
import { api } from '../../api';
import './Admin.css';

export default function AdminFeedback() {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeedbacks();
  }, [page, statusFilter]);

  const loadFeedbacks = async () => {
    setLoading(true);
    try {
      const res = await api.admin.getFeedbacks({
        status: statusFilter || undefined,
        page,
        limit: 15,
      });
      setFeedbacks(res.feedbacks);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      alert(err.message || '피드백 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const changeStatus = async (id: string, status: string) => {
    try {
      await api.admin.updateFeedbackStatus(id, status);
      await loadFeedbacks();
    } catch (err: any) {
      alert(err.message || '상태 변경 실패');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('정말 이 피드백을 삭제하시겠습니까?')) return;
    try {
      await api.admin.deleteFeedback(id);
      await loadFeedbacks();
    } catch (err: any) {
      alert(err.message || '삭제 실패');
    }
  };

  return (
    <div>
      <div className="admin-page-header">
        <div className="admin-page-title-row">
          <div>
            <h1 className="admin-page-title">📩 사용자 피드백 & 문의 관리</h1>
            <p className="admin-page-desc">유저들이 마이페이지에서 보낸 의견과 제안을 확인하고 처리 상태를 관리합니다. (총 {total}건)</p>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="admin-filter-bar">
        <select
          className="admin-select-input"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">처리 상태: 전체</option>
          <option value="PENDING">대기 중 (PENDING)</option>
          <option value="IN_PROGRESS">검토 중 (IN_PROGRESS)</option>
          <option value="RESOLVED">반영/완료 (RESOLVED)</option>
        </select>
      </div>

      {/* Feedback Table */}
      <div className="admin-card">
        {loading ? (
          <p>피드백을 불러오는 중…</p>
        ) : feedbacks.length === 0 ? (
          <p style={{ color: 'var(--ink-muted)' }}>등록된 피드백이 없습니다.</p>
        ) : (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ width: '120px' }}>작성자</th>
                    <th>내용</th>
                    <th style={{ width: '100px' }}>처리 상태</th>
                    <th style={{ width: '130px' }}>접수일시</th>
                    <th style={{ width: '220px', textAlign: 'right' }}>상태 변경 & 관리</th>
                  </tr>
                </thead>
                <tbody>
                  {feedbacks.map((fb) => (
                    <tr key={fb.id}>
                      <td style={{ fontWeight: 700 }}>{fb.userName}</td>
                      <td style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{fb.content}</td>
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
                          {fb.status === 'RESOLVED' ? '완료' : fb.status === 'IN_PROGRESS' ? '검토중' : '대기중'}
                        </span>
                      </td>
                      <td style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>
                        {new Date(fb.createdAt).toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => changeStatus(fb.id, 'PENDING')}
                            className={`admin-btn admin-btn--sm ${fb.status === 'PENDING' ? 'admin-btn--primary' : 'admin-btn--secondary'}`}
                            title="대기중으로 변경"
                          >
                            대기
                          </button>
                          <button
                            onClick={() => changeStatus(fb.id, 'IN_PROGRESS')}
                            className={`admin-btn admin-btn--sm ${fb.status === 'IN_PROGRESS' ? 'admin-btn--primary' : 'admin-btn--secondary'}`}
                            title="검토중으로 변경"
                          >
                            검토
                          </button>
                          <button
                            onClick={() => changeStatus(fb.id, 'RESOLVED')}
                            className={`admin-btn admin-btn--sm ${fb.status === 'RESOLVED' ? 'admin-btn--primary' : 'admin-btn--secondary'}`}
                            title="완료로 변경"
                          >
                            완료
                          </button>
                          <button
                            onClick={() => handleDelete(fb.id)}
                            className="admin-btn admin-btn--danger admin-btn--sm"
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '16px' }}>
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="admin-btn admin-btn--secondary admin-btn--sm"
                >
                  이전
                </button>
                <span style={{ padding: '4px 10px', fontSize: '13px', color: 'var(--ink-muted)', alignSelf: 'center' }}>
                  {page} / {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="admin-btn admin-btn--secondary admin-btn--sm"
                >
                  다음
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
