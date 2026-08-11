import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatUserDisplayName, type Announcement } from '../api';
import { useAuth } from '../context/AuthContext';
import GroupAvatar from '../components/GroupAvatar';
import './Announcements.css';

export default function Announcements() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    api.listAnnouncements()
      .then(setAnnouncements)
      .finally(() => setLoading(false));
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
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
          {announcements.map((item) => (
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
                <span className="expand-indicator">{expandedId === item.id ? '▲' : '▼'}</span>
              </div>
              
              {expandedId === item.id && (
                <div className="announcement-card__content" onClick={(e) => e.stopPropagation()}>
                  <p className="announcement-text">{item.content}</p>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
