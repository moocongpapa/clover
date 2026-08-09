import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  api,
  getNotificationBadge,
  parseNotificationMessage,
  notificationLink,
  type NotificationItem,
} from '../api';
import GroupAvatar from './GroupAvatar';
import './NotificationBell.css';

function formatRelativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return new Date(iso).toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
  });
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await api.getNotificationUnreadCount();
      setUnreadCount(count);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleToggle = async () => {
    if (open) {
      setOpen(false);
      return;
    }

    setOpen(true);
    setLoading(true);

    try {
      await api.markNotificationsRead();
      const list = await api.getNotifications();
      setItems(list);
      setUnreadCount(0);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="notification-bell" ref={panelRef}>
      <button
        type="button"
        className="notification-bell__trigger"
        onClick={handleToggle}
        aria-label="알림"
        aria-expanded={open}
      >
        <span className="notification-bell__icon" aria-hidden>
          🔔
        </span>
        {unreadCount > 0 && (
          <span className="notification-bell__badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notification-bell__panel" role="dialog" aria-label="알림 목록">
          <div className="notification-bell__header">알림</div>
          {loading ? (
            <p className="notification-bell__empty">불러오는 중…</p>
          ) : items.length === 0 ? (
            <p className="notification-bell__empty">새 알림이 없습니다</p>
          ) : (
            <ul className="notification-bell__list">
              {items.map((item) => {
                const badge = getNotificationBadge(item.type);
                const { title, detail } = parseNotificationMessage(item.message);

                return (
                  <li key={item.id}>
                    <Link
                      to={notificationLink(item)}
                      className={`notification-bell__item${item.readAt ? '' : ' is-unread'}`}
                      onClick={() => setOpen(false)}
                    >
                      {item.group?.profileImageUrl ? (
                        <GroupAvatar
                          src={item.group.profileImageUrl}
                          name={item.group.name}
                          size={36}
                          radius={10}
                          className="notification-bell__item-icon"
                        />
                      ) : (
                        <span className="notification-bell__item-icon" aria-hidden>
                          {badge.emoji}
                        </span>
                      )}
                      <span className="notification-bell__item-body">
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: '800',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              color: badge.color,
                              backgroundColor: badge.bg,
                            }}
                          >
                            {badge.label}
                          </span>
                          <span className="notification-bell__time" style={{ marginLeft: 'auto' }}>
                            {formatRelativeTime(item.sentAt)}
                          </span>
                        </span>
                        <span className="notification-bell__message" style={{ fontWeight: '700', color: 'var(--ink-dark)' }}>
                          {title}
                        </span>
                        {detail && (
                          <span style={{
                            display: 'block',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: 'var(--ink-muted)',
                            marginTop: '2px',
                            background: 'var(--grey-50)',
                            padding: '3px 6px',
                            borderRadius: '6px'
                          }}>
                            📌 {detail}
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
