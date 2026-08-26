import { useEffect, useState } from 'react';
import { api } from '../../api';
import './Admin.css';

export default function AdminGroups() {
  const [groups, setGroups] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [publicFilter, setPublicFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGroups();
  }, [page, categoryFilter, publicFilter]);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const res = await api.admin.getGroups({
        search: search.trim() || undefined,
        category: categoryFilter || undefined,
        isPublic: publicFilter === '' ? undefined : publicFilter === 'true',
        page,
        limit: 15,
      });
      setGroups(res.groups);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      alert(err.message || '모임 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadGroups();
  };

  const togglePublic = async (group: any) => {
    const nextPublic = !group.isPublic;
    const actionName = nextPublic ? '공개로 전환' : '비공개(숨김)로 전환';
    if (!window.confirm(`"${group.name}" 모임을 ${actionName}하시겠습니까?`)) return;

    try {
      await api.admin.updateGroup(group.id, { isPublic: nextPublic });
      await loadGroups();
    } catch (err: any) {
      alert(err.message || '상태 변경 실패');
    }
  };

  const handleDeleteGroup = async (group: any) => {
    const confirmName = window.prompt(
      `⚠️ 경고: 모임을 삭제하면 모든 일정, 투표, 회비 기록이 완전히 삭제됩니다.\n삭제를 진행하려면 모임 이름("${group.name}")을 그대로 입력하세요:`,
    );
    if (confirmName !== group.name) {
      if (confirmName !== null) alert('모임 이름이 일치하지 않아 취소되었습니다.');
      return;
    }

    try {
      await api.admin.deleteGroup(group.id);
      alert('모임이 정상적으로 삭제되었습니다.');
      await loadGroups();
    } catch (err: any) {
      alert(err.message || '모임 삭제 실패');
    }
  };

  return (
    <div>
      <div className="admin-page-header">
        <div className="admin-page-title-row">
          <div>
            <h1 className="admin-page-title">🏠 개설된 모임 관리</h1>
            <p className="admin-page-desc">등록된 모든 모임을 조회하고 공개 여부 및 부적절한 모임을 관리합니다. (총 {total}개)</p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <form onSubmit={handleSearchSubmit} className="admin-filter-bar">
        <input
          type="text"
          className="admin-search-input"
          placeholder="모임명, 설명, 초대코드 검색…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="admin-select-input"
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">카테고리: 전체</option>
          <option value="풋살/축구">풋살/축구</option>
          <option value="농구">농구</option>
          <option value="야구">야구</option>
          <option value="러닝">러닝</option>
          <option value="테니스">테니스</option>
          <option value="탁구">탁구</option>
          <option value="배드민턴">배드민턴</option>
          <option value="볼링">볼링</option>
          <option value="골프">골프</option>
          <option value="기타">기타</option>
        </select>
        <select
          className="admin-select-input"
          value={publicFilter}
          onChange={(e) => {
            setPublicFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">공개 상태: 전체</option>
          <option value="true">공개 모임</option>
          <option value="false">비공개 모임</option>
        </select>
        <button type="submit" className="admin-btn admin-btn--secondary">
          검색
        </button>
      </form>

      {/* Group Table */}
      <div className="admin-card">
        {loading ? (
          <p>모임 목록을 불러오는 중…</p>
        ) : groups.length === 0 ? (
          <p style={{ color: 'var(--ink-muted)' }}>조건에 맞는 모임이 없습니다.</p>
        ) : (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>모임명</th>
                    <th>카테고리</th>
                    <th>모임장 (회장)</th>
                    <th>멤버 수</th>
                    <th>일정 수</th>
                    <th>상태</th>
                    <th>개설일</th>
                    <th style={{ textAlign: 'right' }}>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((g) => (
                    <tr key={g.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {g.profileImageUrl ? (
                            <img
                              src={g.profileImageUrl}
                              alt=""
                              style={{ width: '28px', height: '28px', borderRadius: '8px', objectFit: 'cover' }}
                            />
                          ) : (
                            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                              🍀
                            </div>
                          )}
                          <div>
                            <span style={{ fontWeight: 700 }}>{g.name}</span>
                            <span style={{ fontSize: '11px', color: 'var(--ink-muted)', display: 'block' }}>
                              초대코드: {g.inviteCode}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="admin-badge admin-badge--gray">{g.category}</span>
                      </td>
                      <td style={{ color: 'var(--ink-dark)' }}>
                        {g.president?.displayName || '-'}
                      </td>
                      <td>{g._count?.members || 0} / {g.maxMembers || 50}명</td>
                      <td>{g._count?.events || 0}개</td>
                      <td>
                        <span className={`admin-badge ${g.isPublic ? 'admin-badge--green' : 'admin-badge--yellow'}`}>
                          {g.isPublic ? '공개' : '비공개'}
                        </span>
                      </td>
                      <td style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>
                        {new Date(g.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => togglePublic(g)}
                            className="admin-btn admin-btn--secondary admin-btn--sm"
                            title="공개/비공개 전환"
                          >
                            {g.isPublic ? '비공개로' : '공개로'}
                          </button>
                          <button
                            onClick={() => handleDeleteGroup(g)}
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
