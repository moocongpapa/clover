import { useEffect, useState } from 'react';
import { api, type RoleItem } from '../../api';
import './Admin.css';

const DEFAULT_ROLE_ICONS: Record<string, string> = {
  PRESIDENT: '👑',
  VICE_PRESIDENT: '🥈',
  SECRETARY: '💼',
  OFFICER: '🛡️',
  MEMBER: '👤',
};

export default function AdminRoles() {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleItem | null>(null);

  const [formKey, setFormKey] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [formIsStaff, setFormIsStaff] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    setLoading(true);
    try {
      const list = await api.admin.getRoles();
      setRoles(list);
    } catch (err: any) {
      setError(err.message || '직책 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingRole(null);
    setFormKey('');
    setFormLabel('');
    setFormIsStaff(true);
    setShowModal(true);
  };

  const openEditModal = (r: RoleItem) => {
    setEditingRole(r);
    setFormKey(r.key);
    setFormLabel(r.label);
    setFormIsStaff(r.isStaff);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLabel.trim()) return alert('직책 이름을 입력하세요.');
    setSaving(true);
    try {
      if (editingRole) {
        await api.admin.updateRole(editingRole.key, {
          label: formLabel.trim(),
          isStaff: formIsStaff,
        });
      } else {
        await api.admin.createRole({
          key: formKey.trim() ? formKey.trim().toUpperCase() : undefined,
          label: formLabel.trim(),
          isStaff: formIsStaff,
        });
      }
      setShowModal(false);
      await loadRoles();
    } catch (err: any) {
      alert(err.message || '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (key: string, name: string) => {
    if (!window.confirm(`정말 "${name}" 직책을 삭제하시겠습니까?`)) return;
    try {
      await api.admin.deleteRole(key);
      await loadRoles();
    } catch (err: any) {
      alert(err.message || '삭제 실패');
    }
  };

  const moveRole = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= roles.length) return;

    const newOrder = [...roles];
    const [moved] = newOrder.splice(index, 1);
    newOrder.splice(targetIndex, 0, moved);

    setRoles(newOrder);
    try {
      await api.admin.reorderRoles(newOrder.map((r) => r.key));
    } catch (err: any) {
      alert(err.message || '순서 변경 실패');
      await loadRoles();
    }
  };

  return (
    <div>
      <div className="admin-page-header">
        <div className="admin-page-title-row">
          <div>
            <h1 className="admin-page-title">🎖️ 모임 직책 & 운영진 역할 관리</h1>
            <p className="admin-page-desc">
              모임에서 사용하는 운영진 직책(회장, 부회장, 총무, 스태프 등)의 명칭을 변경하고, 새로운 직책(코치, 주장, 매니저 등)을 추가/삭제합니다.
            </p>
          </div>
          <button onClick={openCreateModal} className="admin-btn admin-btn--primary">
            + 새 직책 추가
          </button>
        </div>
      </div>

      {error && (
        <div className="admin-card" style={{ color: '#dc2626', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      <div className="admin-card">
        {loading ? (
          <p>직책 목록을 불러오는 중…</p>
        ) : roles.length === 0 ? (
          <p>등록된 직책이 없습니다.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: '80px', textAlign: 'center' }}>순서</th>
                  <th style={{ width: '70px', textAlign: 'center' }}>구분</th>
                  <th>직책 명칭 (표시 이름)</th>
                  <th>식별 키 (KEY)</th>
                  <th style={{ width: '130px', textAlign: 'center' }}>권한 레벨</th>
                  <th style={{ width: '110px', textAlign: 'center' }}>시스템 기본</th>
                  <th style={{ width: '140px', textAlign: 'right' }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((r, index) => {
                  const icon = DEFAULT_ROLE_ICONS[r.key] || '🏷️';
                  return (
                    <tr key={r.key}>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '2px' }}>
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => moveRole(index, 'up')}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              cursor: index === 0 ? 'not-allowed' : 'pointer',
                              opacity: index === 0 ? 0.3 : 1,
                              fontSize: '12px',
                              padding: '2px 4px',
                            }}
                            title="위로 이동"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            disabled={index === roles.length - 1}
                            onClick={() => moveRole(index, 'down')}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              cursor: index === roles.length - 1 ? 'not-allowed' : 'pointer',
                              opacity: index === roles.length - 1 ? 0.3 : 1,
                              fontSize: '12px',
                              padding: '2px 4px',
                            }}
                            title="아래로 이동"
                          >
                            ▼
                          </button>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', fontSize: '18px' }}>
                        {icon}
                      </td>
                      <td>
                        <strong style={{ fontSize: '14px', color: 'var(--ink-dark)' }}>
                          {r.label}
                        </strong>
                        {r.key === 'OFFICER' && (
                          <span style={{ fontSize: '11px', color: '#10b981', marginLeft: '6px', fontWeight: 600 }}>
                            (일반 운영진 ➔ 스태프)
                          </span>
                        )}
                      </td>
                      <td>
                        <code style={{ fontSize: '12px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                          {r.key}
                        </code>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span
                          className={`admin-badge ${
                            r.isStaff ? 'admin-badge--green' : 'admin-badge--gray'
                          }`}
                        >
                          {r.isStaff ? '🛡️ 운영진 권한' : '👤 일반 회원'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {r.isDefault ? (
                          <span style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>
                            기본 직책
                          </span>
                        ) : (
                          <span style={{ fontSize: '11.5px', color: '#2563eb', fontWeight: 600 }}>
                            사용자 추가
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={() => openEditModal(r)}
                            className="admin-btn admin-btn--secondary admin-btn--sm"
                            title="직책 명칭 및 권한 수정"
                          >
                            수정
                          </button>
                          {r.canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDelete(r.key, r.label)}
                              className="admin-btn admin-btn--danger admin-btn--sm"
                              title="직책 삭제"
                            >
                              삭제
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Role Create/Edit Modal */}
      {showModal && (
        <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <h3 className="admin-card-title">
              {editingRole ? `직책 수정: ${editingRole.label}` : '새 직책 추가'}
            </h3>
            <form onSubmit={handleSave}>
              <div className="admin-form-group">
                <label className="admin-form-label">직책 명칭 (화면 표시 이름) *</label>
                <input
                  type="text"
                  required
                  placeholder="예: 스태프, 코치, 주장, 매니저"
                  className="admin-form-input"
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                />
                <span style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '4px', display: 'block' }}>
                  멤버 목록의 배지와 직책 변경 드롭다운에 표시되는 이름입니다.
                </span>
              </div>

              {!editingRole && (
                <div className="admin-form-group">
                  <label className="admin-form-label">식별 코드 (영문 대문자 KEY)</label>
                  <input
                    type="text"
                    placeholder="예: COACH, CAPTAIN (비워두면 자동 생성)"
                    className="admin-form-input"
                    value={formKey}
                    onChange={(e) => setFormKey(e.target.value.toUpperCase())}
                  />
                </div>
              )}

              {(!editingRole || editingRole.key !== 'PRESIDENT') && (
                <div className="admin-form-group" style={{ marginTop: '14px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13.5px', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={formIsStaff}
                      onChange={(e) => setFormIsStaff(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }}
                    />
                    <span>운영진 권한 부여 (일정 등록, 공지 작성, 투표 관리 가능)</span>
                  </label>
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="admin-btn admin-btn--secondary"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="admin-btn admin-btn--primary"
                >
                  {saving ? '저장 중…' : '저장 완료'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
