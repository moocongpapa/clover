import { useEffect, useState } from 'react';
import { api, type CategoryItem } from '../../api';
import './Admin.css';

export default function AdminCategories() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCat, setEditingCat] = useState<CategoryItem | null>(null);
  const [formValue, setFormValue] = useState('');
  const [formEmoji, setFormEmoji] = useState('⚽');
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const list = await api.admin.getCategories();
      setCategories(list);
    } catch (err: any) {
      setError(err.message || '카테고리를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingCat(null);
    setFormValue('');
    setFormEmoji('⚽');
    setFormActive(true);
    setShowModal(true);
  };

  const openEditModal = (cat: CategoryItem) => {
    setEditingCat(cat);
    setFormValue(cat.value);
    setFormEmoji(cat.emoji);
    setFormActive(cat.isActive);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValue.trim()) return alert('카테고리 이름을 입력하세요.');
    setSaving(true);
    try {
      if (editingCat) {
        await api.admin.updateCategory(editingCat.id, {
          value: formValue.trim(),
          emoji: formEmoji.trim() || '✨',
          isActive: formActive,
        });
      } else {
        await api.admin.createCategory({
          value: formValue.trim(),
          emoji: formEmoji.trim() || '✨',
          isActive: formActive,
        });
      }
      setShowModal(false);
      await loadCategories();
    } catch (err: any) {
      alert(err.message || '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`정말 "${name}" 카테고리를 삭제하시겠습니까?`)) return;
    try {
      await api.admin.deleteCategory(id);
      await loadCategories();
    } catch (err: any) {
      alert(err.message || '삭제 실패');
    }
  };

  const moveCategory = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const newOrder = [...categories];
    const [moved] = newOrder.splice(index, 1);
    newOrder.splice(targetIndex, 0, moved);

    setCategories(newOrder);
    try {
      await api.admin.reorderCategories(newOrder.map((c) => c.id));
    } catch (err: any) {
      alert(err.message || '순서 변경 실패');
      await loadCategories();
    }
  };

  return (
    <div>
      <div className="admin-page-header">
        <div className="admin-page-title-row">
          <div>
            <h1 className="admin-page-title">📁 종목 및 카테고리 관리</h1>
            <p className="admin-page-desc">
              모임 생성 및 탐색 시 노출되는 스포츠/관심사 카테고리를 실시간으로 관리합니다.
            </p>
          </div>
          <button onClick={openCreateModal} className="admin-btn admin-btn--primary">
            + 새 카테고리 추가
          </button>
        </div>
      </div>

      {error && <p style={{ color: '#dc2626', marginBottom: '14px' }}>{error}</p>}

      <div className="admin-card">
        {loading ? (
          <p>카테고리를 불러오는 중…</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>순서</th>
                  <th style={{ width: '70px' }}>아이콘</th>
                  <th>카테고리명</th>
                  <th>상태</th>
                  <th style={{ width: '120px' }}>순서 변경</th>
                  <th style={{ width: '130px', textAlign: 'right' }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat, idx) => (
                  <tr key={cat.id}>
                    <td style={{ color: 'var(--ink-muted)', fontWeight: 700 }}>{idx + 1}</td>
                    <td style={{ fontSize: '20px' }}>{cat.emoji}</td>
                    <td style={{ fontWeight: 700 }}>{cat.value}</td>
                    <td>
                      <span
                        className={`admin-badge ${cat.isActive ? 'admin-badge--green' : 'admin-badge--gray'}`}
                      >
                        {cat.isActive ? '공개 중' : '숨김(비활성)'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          disabled={idx === 0}
                          onClick={() => moveCategory(idx, 'up')}
                          className="admin-btn admin-btn--secondary admin-btn--sm"
                          title="위로 이동"
                        >
                          ▲
                        </button>
                        <button
                          disabled={idx === categories.length - 1}
                          onClick={() => moveCategory(idx, 'down')}
                          className="admin-btn admin-btn--secondary admin-btn--sm"
                          title="아래로 이동"
                        >
                          ▼
                        </button>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => openEditModal(cat)}
                          className="admin-btn admin-btn--secondary admin-btn--sm"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDelete(cat.id, cat.value)}
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
        )}
      </div>

      {/* Modal Dialog */}
      {showModal && (
        <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 16px' }}>
              {editingCat ? '카테고리 수정' : '새 카테고리 등록'}
            </h3>
            <form onSubmit={handleSave}>
              <div className="admin-form-group">
                <label className="admin-form-label">이모지 아이콘</label>
                <input
                  type="text"
                  className="admin-form-input"
                  value={formEmoji}
                  onChange={(e) => setFormEmoji(e.target.value)}
                  placeholder="예: ⚽, 🏸, 🏄"
                  maxLength={4}
                  required
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">카테고리명</label>
                <input
                  type="text"
                  className="admin-form-input"
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                  placeholder="예: 서핑/웨이크보드"
                  required
                />
              </div>

              <div className="admin-form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                  />
                  <span style={{ fontSize: '13.5px', fontWeight: 600 }}>사용자에게 공개(활성화)</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
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
                  {saving ? '저장 중…' : '저장하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
