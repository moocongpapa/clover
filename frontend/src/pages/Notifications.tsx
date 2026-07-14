import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type NotificationItem, notificationLink, notificationIcon } from '../api';
import './Notifications.css';

export default function Notifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'events' | 'joins'>('all');

  const load = () => {
    setLoading(true);
    api.getNotifications()
      .then((res) => {
        // Sort newest first
        const sorted = [...res].sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
        setNotifications(sorted);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // Mark notifications as read when opening this page
    api.markNotificationsRead().catch((err) => console.error(err));
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.markNotificationsRead();
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const getFilteredNotifications = () => {
    switch (activeFilter) {
      case 'unread':
        return notifications.filter((n) => !n.readAt);
      case 'events':
        return notifications.filter((n) => ['CREATED', 'CHANGED', 'CANCELLED', 'REMINDER'].includes(n.type));
      case 'joins':
        return notifications.filter((n) => ['JOIN_REQUEST', 'JOIN_APPROVED'].includes(n.type));
      default:
        return notifications;
    }
  };

  const formatSentDate = (isoStr: string) => {
    const d = new Date(isoStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) {
      return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
  };

  const filteredList = getFilteredNotifications();

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <h1 className="notifications-title">새소식</h1>
        <button
          type="button"
          onClick={handleMarkAllRead}
          className="notifications-settings-btn"
          title="모두 읽음으로 표시"
        >
          ⚙️
        </button>
      </div>

      <div className="notifications-filter-bar">
        <button
          type="button"
          className={`filter-chip ${activeFilter === 'all' ? 'is-active' : ''}`}
          onClick={() => setActiveFilter('all')}
        >
          모두
        </button>
        <button
          type="button"
          className={`filter-chip ${activeFilter === 'unread' ? 'is-active' : ''}`}
          onClick={() => setActiveFilter('unread')}
        >
          읽지 않음
        </button>
        <button
          type="button"
          className={`filter-chip ${activeFilter === 'events' ? 'is-active' : ''}`}
          onClick={() => setActiveFilter('events')}
        >
          일정
        </button>
        <button
          type="button"
          className={`filter-chip ${activeFilter === 'joins' ? 'is-active' : ''}`}
          onClick={() => setActiveFilter('joins')}
        >
          가입/승인
        </button>
      </div>

      {loading ? (
        <p className="notifications-loading">소식을 불러오는 중…</p>
      ) : filteredList.length === 0 ? (
        <div className="notifications-empty">
          <p>도달한 소식이 없습니다.</p>
        </div>
      ) : (
        <div className="notifications-list">
          {filteredList.map((item) => {
            const isUnread = !item.readAt;
            const linkUrl = notificationLink(item);

            return (
              <Link
                key={item.id}
                to={linkUrl}
                className={`notification-item ${isUnread ? 'is-unread' : ''}`}
              >
                <div className="notification-avatar-container">
                  {item.actor?.profileImageUrl ? (
                    <img
                      src={item.actor.profileImageUrl}
                      alt=""
                      className="notification-avatar"
                    />
                  ) : (
                    <div className="notification-avatar-fallback">
                      {notificationIcon(item.type)}
                    </div>
                  )}
                  {isUnread && <span className="unread-dot" />}
                </div>

                <div className="notification-content">
                  <div className="notification-meta">
                    <span className="notification-group-name">
                      {item.group?.name || '시스템 알림'}
                    </span>
                    <span className="notification-time">
                      {formatSentDate(item.sentAt)}
                    </span>
                  </div>
                  <p className="notification-message">{item.message}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {notifications.some((n) => !n.readAt) && (
        <button
          type="button"
          className="floating-read-all-btn"
          onClick={handleMarkAllRead}
        >
          읽지 않은 소식 모두 읽기
        </button>
      )}
    </div>
  );
}
