import { useEffect, useState } from 'react';
import { api, type SystemAnnouncementItem } from '../../api';
import './Admin.css';

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState<SystemAnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<SystemAnnouncementItem | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [formPriority, setFormPriority] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const list = await api.admin.getAnnouncements();
      setAnnouncements(list);
    } catch (err: any) {
      alert(err.message || '시스템 공지를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setFormTitle('');
    setFormContent('');
    setFormActive(true);
    setFormPriority(0);
    setShowModal(true);
  };

  const openEditModal = (item: SystemAnnouncementItem) => {
    setEditingItem(item);
    setFormTitle(item.title);
    setFormContent(item.content);
    setFormActive(item.isActive);
    setFormPriority(item.priority);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) return alert('제목과 내용을 입력하세요.');
    setSaving(true);
    try {
      if (editingItem) {
        await api.admin.updateAnnouncement(editingItem.id, {
          title: formTitle.trim(),
          content: formContent.trim(),
          isActive: formActive,
          priority: Number(formPriority) || 0,
        });
      } else {
        await api.admin.createAnnouncement({
          title: formTitle.trim(),
          content: formContent.trim(),
          isActive: formActive,
          priority: Number(formPriority) || 0,
        });
      }
      setShowModal(false);
      await loadAnnouncements();
    } catch (err: any) {
      alert(err.message || '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item: SystemAnnouncementItem) => {
    try {
      await api.admin.updateAnnouncement(item.id, { isActive: !item.isActive });
      await loadAnnouncements();
    } catch (err: any) {
      alert(err.message || '상태 변경 실패');
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`정말 "${title}" 공지를 삭제하시겠습니까?`)) return;
    try {
      await api.admin.deleteAnnouncement(id);
      await loadAnnouncements();
    } catch (err: any) {
      alert(err.message || '삭제 실패');
    }
  };

  return (
    <div>
      <div className="admin-page-header">
        <div className="admin-page-title-row">
          <div>
            <h1 className="admin-page-title">📢 시스템 전체 공지 & 점검 배너</h1>
            <p className="admin-page-desc">
              모든 사용자 앱 상단에 긴급 공지나 점검 안내 배너를 띄우고 공지사항을 관리합니다.
            </p>
          </div>
          <button onClick={openCreateModal} className="admin-btn admin-btn--primary">
            + 새 시스템 공지 작성
          </button>
        </div>
      </div>

      <div className="admin-card">
        {loading ? (
          <p>공지사항을 불러오는 중…</p>
        ) : announcements.length === 0 ? (
          <p style={{ color: 'var(--ink-muted)' }}>등록된 시스템 공지가 없습니다.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>우선순위</th>
                  <th>제목 및 내용</th>
                  <th style={{ width: '120px' }}>배너 노출 여부</th>
                  <th style={{ width: '130px' }}>등록일시</th>
                  <th style={{ width: '180px', textAlign: 'right' }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {announcements.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className="admin-badge admin-badge--gray">{item.priority}</span>
                    </td>
                    <td>
                      <p style={{ fontWeight: 800, margin: '0 0 4px' }}>{item.title}</p>
                      <p style={{ fontSize: '12.5px', color: 'var(--ink-muted)', margin: 0, whiteSpace: 'pre-wrap' }}>
                        {item.content}
                      </p>
                    </td>
                    <td>
                      <button
                        onClick={() => toggleActive(item)}
                        className={`admin-badge ${item.isActive ? 'admin-badge--green' : 'admin-badge--gray'}`}
                        style={{ cursor: 'pointer', border: 'none' }}
                        title="클릭하여 노출 상태 전환"
                      >
                        {item.isActive ? '🟢 노출 중' : '⚪ 숨김'}
                      </button>
                    </td>
                    <td style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>
                      {new Date(item.createdAt).toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => openEditModal(item)}
                          className="admin-btn admin-btn--secondary admin-btn--sm"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.title)}
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
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 16px' }}>
              {editingItem ? '시스템 공지 수정' : '새 시스템 공지 작성'}
            </h3>
            <form onSubmit={handleSave}>
              <div className="admin-form-group">
                <label className="admin-form-label">공지 제목</label>
                <input
                  type="text"
                  className="admin-form-input"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="예: [안내] Clover 2.0 업데이트 및 신규 기능 안내"
                  required
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">공지 내용</label>
                <textarea
                  className="admin-form-textarea"
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="공지할 상세 내용을 입력하세요."
                  rows={4}
                  required
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">우선순위 (높을수록 상단 노출, 기본 0)</label>
                <input
                  type="number"
                  className="admin-form-input"
                  value={formPriority}
                  onChange={(e) => setFormPriority(Number(e.target.value))}
                />
              </div>

              <div className="admin-form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                  />
                  <span style={{ fontSize: '13.5px', fontWeight: 600 }}>즉시 상단 배너에 노출(활성화)</span>
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
                  {saving ? '저장 중…' : '공지 저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
