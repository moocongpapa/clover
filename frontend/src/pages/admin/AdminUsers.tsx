import { useEffect, useState } from 'react';
import { api } from '../../api';
import './Admin.css';

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [blockedFilter, setBlockedFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [page, roleFilter, blockedFilter]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await api.admin.getUsers({
        search: search.trim() || undefined,
        role: roleFilter || undefined,
        isBlocked: blockedFilter === '' ? undefined : blockedFilter === 'true',
        page,
        limit: 15,
      });
      setUsers(res.users);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      alert(err.message || '사용자 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadUsers();
  };

  const viewUserDetail = async (id: string) => {
    setLoadingDetail(true);
    setSelectedUser(null);
    try {
      const detail = await api.admin.getUserDetail(id);
      setSelectedUser(detail);
    } catch (err: any) {
      alert(err.message || '사용자 정보를 불러오지 못했습니다.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const toggleBlockStatus = async (user: any) => {
    const nextBlocked = !user.isBlocked;
    const actionName = nextBlocked ? '이용 정지' : '정지 해제';
    if (!window.confirm(`정말 "${user.displayName}" 사용자를 ${actionName}하시겠습니까?`)) return;

    try {
      await api.admin.updateUser(user.id, { isBlocked: nextBlocked });
      if (selectedUser?.id === user.id) {
        setSelectedUser({ ...selectedUser, isBlocked: nextBlocked });
      }
      await loadUsers();
    } catch (err: any) {
      alert(err.message || '상태 변경 실패');
    }
  };

  const toggleAdminRole = async (user: any) => {
    const nextRole = user.role === 'ADMIN' ? 'MEMBER' : 'ADMIN';
    if (!window.confirm(`"${user.displayName}" 계정의 권한을 ${nextRole}으로 변경하시겠습니까?`)) return;

    try {
      await api.admin.updateUser(user.id, { role: nextRole });
      if (selectedUser?.id === user.id) {
        setSelectedUser({ ...selectedUser, role: nextRole });
      }
      await loadUsers();
    } catch (err: any) {
      alert(err.message || '권한 변경 실패');
    }
  };

  return (
    <div>
      <div className="admin-page-header">
        <div className="admin-page-title-row">
          <div>
            <h1 className="admin-page-title">👥 사용자 계정 관리</h1>
            <p className="admin-page-desc">전체 등록된 회원 계정을 검색하고 권한 및 이용 상태를 관리합니다. (총 {total}명)</p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <form onSubmit={handleSearchSubmit} className="admin-filter-bar">
        <input
          type="text"
          className="admin-search-input"
          placeholder="이름, 전화번호, 카카오ID 검색…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="admin-select-input"
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">권한: 전체</option>
          <option value="MEMBER">일반 회원 (MEMBER)</option>
          <option value="ADMIN">관리자 (ADMIN)</option>
        </select>
        <select
          className="admin-select-input"
          value={blockedFilter}
          onChange={(e) => {
            setBlockedFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">상태: 전체</option>
          <option value="false">정상 활동</option>
          <option value="true">이용 정지됨</option>
        </select>
        <button type="submit" className="admin-btn admin-btn--secondary">
          검색
        </button>
      </form>

      {/* User Table */}
      <div className="admin-card">
        {loading ? (
          <p>사용자 목록을 불러오는 중…</p>
        ) : users.length === 0 ? (
          <p style={{ color: 'var(--ink-muted)' }}>조건에 맞는 사용자가 없습니다.</p>
        ) : (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>사용자명</th>
                    <th>연락처</th>
                    <th>소속 모임</th>
                    <th>활동 통계</th>
                    <th>권한</th>
                    <th>상태</th>
                    <th>가입일</th>
                    <th style={{ textAlign: 'right' }}>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {u.profileImageUrl ? (
                            <img
                              src={u.profileImageUrl}
                              alt=""
                              style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                            />
                          ) : (
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>
                              👤
                            </div>
                          )}
                          <span style={{ fontWeight: 700 }}>{u.displayName}</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--ink-muted)' }}>{u.phoneNumber || '-'}</td>
                      <td>{u._count?.memberships || 0}개 모임</td>
                      <td style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
                        일정 {u._count?.createdEvents || 0} · 투표 {u._count?.votes || 0}
                      </td>
                      <td>
                        <span className={`admin-badge ${u.role === 'ADMIN' ? 'admin-badge--blue' : 'admin-badge--gray'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td>
                        <span className={`admin-badge ${u.isBlocked ? 'admin-badge--red' : 'admin-badge--green'}`}>
                          {u.isBlocked ? '이용 정지' : '정상'}
                        </span>
                      </td>
                      <td style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => viewUserDetail(u.id)}
                            className="admin-btn admin-btn--secondary admin-btn--sm"
                          >
                            상세
                          </button>
                          <button
                            onClick={() => toggleBlockStatus(u)}
                            className={`admin-btn admin-btn--sm ${u.isBlocked ? 'admin-btn--secondary' : 'admin-btn--danger'}`}
                          >
                            {u.isBlocked ? '정지 해제' : '정지'}
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

      {/* User Detail Modal */}
      {(selectedUser || loadingDetail) && (
        <div className="admin-modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            {loadingDetail ? (
              <p>사용자 세부 정보를 불러오는 중…</p>
            ) : selectedUser && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                  {selectedUser.profileImageUrl ? (
                    <img
                      src={selectedUser.profileImageUrl}
                      alt=""
                      style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                      👤
                    </div>
                  )}
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>
                      {selectedUser.displayName}
                    </h3>
                    <p style={{ fontSize: '12.5px', color: 'var(--ink-muted)', margin: '2px 0 0' }}>
                      카카오 식별자: {selectedUser.kakaoId}
                    </p>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '12px', marginBottom: '16px', fontSize: '13px' }}>
                  <p style={{ margin: '0 0 6px' }}><strong>연락처:</strong> {selectedUser.phoneNumber || '미등록'}</p>
                  <p style={{ margin: '0 0 6px' }}><strong>생년 / 성별:</strong> {selectedUser.birthYear ? `${selectedUser.birthYear}년생` : '-'} / {selectedUser.gender === 'MALE' ? '남성' : selectedUser.gender === 'FEMALE' ? '여성' : '미입력'}</p>
                  <p style={{ margin: '0 0 6px' }}><strong>소개:</strong> {selectedUser.bio || '없음'}</p>
                  <p style={{ margin: 0 }}><strong>가입일시:</strong> {new Date(selectedUser.createdAt).toLocaleString()}</p>
                </div>

                <h4 style={{ fontSize: '14px', fontWeight: 800, margin: '0 0 8px' }}>
                  소속 모임 목록 ({selectedUser.memberships?.length || 0}개)
                </h4>
                <div style={{ maxHeight: '140px', overflowY: 'auto', marginBottom: '16px' }}>
                  {selectedUser.memberships?.map((m: any) => (
                    <div
                      key={m.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 0',
                        borderBottom: '1px solid var(--border-soft, #f1f5f9)',
                        fontSize: '13px',
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{m.group?.name}</span>
                      <span className="admin-badge admin-badge--gray">{m.role} ({m.status})</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                  <button
                    onClick={() => toggleAdminRole(selectedUser)}
                    className="admin-btn admin-btn--secondary"
                  >
                    {selectedUser.role === 'ADMIN' ? '일반회원으로 변경' : '⭐ 관리자(ADMIN)로 지정'}
                  </button>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => toggleBlockStatus(selectedUser)}
                      className={`admin-btn ${selectedUser.isBlocked ? 'admin-btn--secondary' : 'admin-btn--danger'}`}
                    >
                      {selectedUser.isBlocked ? '이용 정지 해제' : '계정 이용 정지'}
                    </button>
                    <button onClick={() => setSelectedUser(null)} className="admin-btn admin-btn--secondary">
                      닫기
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
