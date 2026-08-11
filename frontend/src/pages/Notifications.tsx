import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  api,
  type NotificationItem,
  notificationLink,
  getNotificationBadge,
  parseNotificationMessage,
} from '../api';
import GroupAvatar from '../components/GroupAvatar';
import './Notifications.css';

function formatRelativeTime(isoStr: string): string {
  const date = new Date(isoStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay === 1) return '어제';
  if (diffDay < 7) return `${diffDay}일 전`;

  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${m}월 ${d}일`;
}

interface NotificationRowProps {
  item: NotificationItem;
  isChecked: boolean;
  onToggleSelect: (e: React.MouseEvent, id: string) => void;
  onDelete: (id: string) => void;
}

function NotificationRow({ item, isChecked, onToggleSelect, onDelete }: NotificationRowProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartXRef = useRef<number | null>(null);
  const isSwipingRef = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    isSwipingRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const currentX = e.touches[0].clientX;
    const diffX = currentX - touchStartXRef.current;

    // Swipe left (negative diffX)
    if (diffX < -10) {
      isSwipingRef.current = true;
      const offset = Math.max(diffX, -84);
      setSwipeOffset(offset);
    } else if (diffX > 10 && swipeOffset < 0) {
      isSwipingRef.current = true;
      const offset = Math.min(0, swipeOffset + diffX);
      setSwipeOffset(offset);
    }
  };

  const handleTouchEnd = () => {
    if (swipeOffset < -40) {
      setSwipeOffset(-76); // Snap open delete button
    } else {
      setSwipeOffset(0); // Snap close
    }
    touchStartXRef.current = null;
  };

  const isUnread = !item.readAt;
  const linkUrl = notificationLink(item);
  const badge = getNotificationBadge(item.type);
  const { title, detail } = parseNotificationMessage(item.message);

  return (
    <div className={`notification-swipe-wrapper${isChecked ? ' is-selected' : ''}`}>
      {/* Background Revealed Delete Action */}
      <button
        type="button"
        className="notification-swipe-delete-btn"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(item.id);
        }}
      >
        삭제
      </button>

      {/* Foreground Sliding Card Container */}
      <div
        className="notification-swipe-content"
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: isSwipingRef.current ? 'none' : 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="notification-checkbox-wrap"
          onClick={(e) => onToggleSelect(e, item.id)}
          title="선택"
        >
          <input
            type="checkbox"
            checked={isChecked}
            onChange={() => {}}
          />
        </div>

        <Link
          to={linkUrl}
          className={`notification-card ${isUnread ? 'is-unread' : ''}`}
          onClick={(e) => {
            // Prevent navigation if user was just swiping or snap opened
            if (swipeOffset < 0) {
              e.preventDefault();
              setSwipeOffset(0);
            }
          }}
        >
          {/* Left Avatar */}
          <div className="notification-avatar-container">
            {item.group ? (
              <GroupAvatar
                src={item.group.profileImageUrl}
                name={item.group.name}
                size={44}
                radius={12}
                className="notification-avatar"
              />
            ) : item.actor?.profileImageUrl ? (
              <img
                src={item.actor.profileImageUrl}
                alt={item.actor.displayName}
                className="notification-avatar"
              />
            ) : (
              <div className="notification-avatar-fallback">
                {badge.emoji}
              </div>
            )}
            {isUnread && <span className="notification-unread-dot" />}
          </div>

          {/* Right Content */}
          <div className="notification-card-body">
            <div className="notification-card-meta">
              <div className="notification-meta-left">
                <span className="notification-group-name">
                  {item.group?.name || 'Clover 알림'}
                </span>
                <span
                  className="notification-type-badge"
                  style={{
                    color: badge.color,
                    backgroundColor: badge.bg,
                    borderColor: badge.border,
                  }}
                >
                  {badge.emoji} {badge.label}
                </span>
              </div>
              <span className="notification-time-text">
                {formatRelativeTime(item.sentAt)}
              </span>
            </div>

            <div className="notification-headline">{title}</div>

            {detail && (
              <div className="notification-detail-box">
                <span className="notification-detail-bullet">📌</span>
                <span className="notification-detail-text">{detail}</span>
              </div>
            )}
          </div>
        </Link>
      </div>
    </div>
  );
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'events' | 'joins'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const load = () => {
    setLoading(true);
    api
      .getNotifications()
      .then((res) => {
        const sorted = [...res].sort(
          (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
        );
        setNotifications(sorted);
        setSelectedIds(new Set());
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
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

  const handleDeleteAll = async () => {
    if (!window.confirm('전체 알림을 삭제하시겠습니까?')) return;
    try {
      await api.deleteAllNotifications();
      setNotifications([]);
      setSelectedIds(new Set());
    } catch (err) {
      console.error(err);
      alert('삭제 처리 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteSelected = async () => {
    const idsArray = Array.from(selectedIds);
    if (idsArray.length === 0) return;
    if (!window.confirm(`선택한 ${idsArray.length}개의 알림을 삭제하시겠습니까?`)) return;

    try {
      await api.deleteSelectedNotifications(idsArray);
      setNotifications((prev) => prev.filter((item) => !selectedIds.has(item.id)));
      setSelectedIds(new Set());
    } catch (err) {
      console.error(err);
      alert('선택 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteSingle = async (id: string) => {
    try {
      await api.deleteNotification(id);
      setNotifications((prev) => prev.filter((item) => item.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err) {
      console.error(err);
    }
  };

  const getFilteredNotifications = () => {
    switch (activeFilter) {
      case 'unread':
        return notifications.filter((n) => !n.readAt);
      case 'events':
        return notifications.filter((n) =>
          ['CREATED', 'CHANGED', 'CANCELLED', 'REMINDER'].includes(n.type),
        );
      case 'joins':
        return notifications.filter((n) =>
          ['JOIN_REQUEST', 'JOIN_APPROVED'].includes(n.type),
        );
      default:
        return notifications;
    }
  };

  const filteredList = getFilteredNotifications();
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const isAllSelected =
    filteredList.length > 0 && filteredList.every((item) => selectedIds.has(item.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      const next = new Set<string>();
      filteredList.forEach((item) => next.add(item.id));
      setSelectedIds(next);
    }
  };

  const handleToggleItem = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="notifications-page">
      {/* Top Header */}
      <div className="notifications-header">
        <div>
          <h1 className="notifications-title">새소식</h1>
          <p className="notifications-subtitle">
            모임의 새로운 일정, 투표 및 가입 소식을 한곳에서 확인하세요.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {unreadCount > 0 && (
            <button
              type="button"
              className="notif-text-action-btn"
              onClick={handleMarkAllRead}
            >
              모두 읽음
            </button>
          )}
          {notifications.length > 0 && (
            <button
              type="button"
              className="notif-text-action-btn notif-text-action-btn--danger"
              onClick={handleDeleteAll}
            >
              전체 비우기
            </button>
          )}
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="notifications-filter-bar">
        <button
          type="button"
          className={`filter-chip ${activeFilter === 'all' ? 'is-active' : ''}`}
          onClick={() => setActiveFilter('all')}
        >
          전체 ({notifications.length})
        </button>
        <button
          type="button"
          className={`filter-chip ${activeFilter === 'unread' ? 'is-active' : ''}`}
          onClick={() => setActiveFilter('unread')}
        >
          안 읽음 {unreadCount > 0 && <span className="filter-count-badge">{unreadCount}</span>}
        </button>
        <button
          type="button"
          className={`filter-chip ${activeFilter === 'events' ? 'is-active' : ''}`}
          onClick={() => setActiveFilter('events')}
        >
          📅 일정/투표
        </button>
        <button
          type="button"
          className={`filter-chip ${activeFilter === 'joins' ? 'is-active' : ''}`}
          onClick={() => setActiveFilter('joins')}
        >
          👥 가입/승인
        </button>
      </div>

      {/* Bulk Control Bar (Checkbox & Delete selected) */}
      {filteredList.length > 0 && (
        <div className="notifications-batch-bar">
          <label className="batch-select-all" onClick={handleToggleSelectAll}>
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={() => {}}
            />
            <span>전체 선택 ({selectedIds.size}/{filteredList.length})</span>
          </label>

          {selectedIds.size > 0 && (
            <button
              type="button"
              className="btn-delete-selected-clean"
              onClick={handleDeleteSelected}
            >
              선택 삭제 ({selectedIds.size})
            </button>
          )}
        </div>
      )}

      {/* Content List */}
      {loading ? (
        <div className="notifications-loading-wrap">
          <p className="notifications-loading">소식을 불러오는 중…</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="notifications-empty">
          <span className="notifications-empty-icon">📭</span>
          <p className="notifications-empty-title">새로운 소식이 없습니다</p>
          <p className="notifications-empty-desc">모임에 새로운 소식이 생기면 바로 알려드릴게요.</p>
        </div>
      ) : (
        <div className="notifications-list">
          {filteredList.map((item) => (
            <NotificationRow
              key={item.id}
              item={item}
              isChecked={selectedIds.has(item.id)}
              onToggleSelect={handleToggleItem}
              onDelete={handleDeleteSingle}
            />
          ))}
        </div>
      )}
    </div>
  );
}
