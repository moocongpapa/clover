import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, formatUserDisplayName, type Announcement } from '../api';
import { useAuth } from '../context/AuthContext';
import GroupAvatar from '../components/GroupAvatar';
import AnnouncementShareModal from '../components/AnnouncementShareModal';
import { type ShareAnnouncementData } from '../utils/kakaoShare';
import './Announcements.css';

export default function Announcements() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [shareTarget, setShareTarget] = useState<ShareAnnouncementData | null>(null);

  // Edit State
  const [editingItem, setEditingItem] = useState<Announcement | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const loadAnnouncements = () => {
    setLoading(true);
    api.listAnnouncements()
      .then((list) => {
        setAnnouncements(list);
        const shareId = searchParams.get('shareId');
        if (shareId) {
          const target = list.find((a) => a.id === shareId);
          if (target) {
            setShareTarget({
              id: target.id,
              title: target.title,
              content: target.content,
              isPinned: target.isPinned,
              authorName: formatUserDisplayName(target.author),
              groupId: target.groupId,
              groupName: target.group?.name,
              groupProfileImageUrl: target.group?.profileImageUrl,
              createdAt: target.createdAt,
            });
          }
          searchParams.delete('shareId');
          setSearchParams(searchParams, { replace: true });
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleOpenEdit = (item: Announcement, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingItem(item);
    setEditTitle(item.title);
    setEditContent(item.content);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editTitle.trim() || !editContent.trim()) return;
    setSavingEdit(true);
    try {
      await api.updateAnnouncement(editingItem.id, {
        title: editTitle.trim(),
        content: editContent.trim(),
      });
      setEditingItem(null);
      loadAnnouncements();
    } catch (err: any) {
      alert(err.message || '게시글 수정 실패');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (item: Announcement, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`정말 "${item.title}" 공지/게시글을 삭제하시겠습니까?`)) return;
    try {
      await api.deleteAnnouncement(item.id);
      loadAnnouncements();
    } catch (err: any) {
      alert(err.message || '게시글 삭제 실패');
    }
  };

  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="announcements-page">
      <header className="announcements-header">
        <h1 className="page-title">📢 공지사항</h1>
        {isAdmin && (
          <Link to="/announcements/new" className="btn-primary btn-write">
            글쓰기
          </Link>
        )}
      </header>

      {loading ? (
        <p className="loading-text">불러오는 중…</p>
      ) : announcements.length === 0 ? (
        <div className="empty-state">
          <p>등록된 공지사항이 없습니다.</p>
        </div>
      ) : (
        <div className="announcements-list">
          {announcements.map((item) => {
            const isAuthor = user && item.author?.id === user.id;
            const canManage = isAuthor || isAdmin;

            return (
              <article
                key={item.id}
                className={`announcement-card ${expandedId === item.id ? 'is-expanded' : ''}`}
                onClick={() => toggleExpand(item.id)}
              >
                <div className="announcement-card__top">
                  <GroupAvatar
                    src={item.group?.profileImageUrl}
                    name={item.group?.name || '모임 공지'}
                    size={42}
                    radius={12}
                  />
                  <div className="announcement-card__header">
                    <div className="announcement-card__meta">
                      {item.group?.name && (
                        <span className="announcement-group-name">
                          {item.group.name}
                        </span>
                      )}
                      <span className="announcement-author">{formatUserDisplayName(item.author)}</span>
                      <span className="announcement-date">
                        {new Date(item.createdAt).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <h3 className="announcement-title">{item.title}</h3>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Kakao Share Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShareTarget({
                          id: item.id,
                          title: item.title,
                          content: item.content,
                          isPinned: item.isPinned,
                          authorName: formatUserDisplayName(item.author),
                          groupId: item.groupId,
                          groupName: item.group?.name,
                          groupProfileImageUrl: item.group?.profileImageUrl,
                          createdAt: item.createdAt,
                        });
                      }}
                      style={{
                        background: '#fee500',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '4px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#191919',
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                      }}
                      title="카카오톡 공유"
                      aria-label="카카오톡 공유"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#000000">
                        <path d="M12 3C6.5 3 2 6.6 2 11c0 2.8 1.9 5.3 4.8 6.7-.2.8-.8 3-1 3.5 0 .1 0 .2.1.2.1 0 .2 0 .3-.1.4-.3 3.4-2.3 4.7-3.2.7.1 1.4.1 2.1.1 5.5 0 10-3.6 10-8s-4.5-8-10-8z" />
                      </svg>
                      <span>공유</span>
                    </button>

                    {canManage && (
                      <div className="announcement-card__actions" style={{ display: 'flex', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={(e) => handleOpenEdit(item, e)}
                          style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '14px',
                            cursor: 'pointer',
                            padding: '4px',
                            opacity: 0.8,
                          }}
                          title="게시글 수정"
                          aria-label="게시글 수정"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDelete(item, e)}
                          style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '14px',
                            cursor: 'pointer',
                            padding: '4px',
                            opacity: 0.8,
                          }}
                          title="게시글 삭제"
                          aria-label="게시글 삭제"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                    <span className="expand-indicator">{expandedId === item.id ? '▲' : '▼'}</span>
                  </div>
                </div>

                {expandedId === item.id && (
                  <div className="announcement-card__content" onClick={(e) => e.stopPropagation()}>
                    <p className="announcement-text">{item.content}</p>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Edit Announcement Modal */}
      {editingItem && (
        <div
          className="post-write-modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setEditingItem(null)}
        >
          <div
            className="post-write-modal-card"
            style={{
              background: 'var(--surface)',
              borderRadius: '20px',
              padding: '24px',
              width: '100%',
              maxWidth: '480px',
              boxShadow: 'var(--shadow-lg)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>✏️ 게시글 수정</h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', color: 'var(--ink-muted)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>제목</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    fontSize: '14px',
                    background: 'var(--surface-input, var(--surface))',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>내용</label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  required
                  rows={6}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    fontSize: '14px',
                    background: 'var(--surface-input, var(--surface))',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 600,
                  }}
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="btn-primary"
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {savingEdit ? '저장 중…' : '수정 완료'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Announcement Share Modal */}
      <AnnouncementShareModal
        isOpen={Boolean(shareTarget)}
        onClose={() => setShareTarget(null)}
        announcement={shareTarget}
      />
    </div>
  );
}
