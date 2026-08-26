import { useEffect, useState } from 'react';
import { api, type SystemAnnouncementItem } from '../api';

export default function SystemAnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<SystemAnnouncementItem[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('clover_dismissed_announcements') || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    api
      .getActiveSystemAnnouncements()
      .then((list) => setAnnouncements(list || []))
      .catch(() => {});
  }, []);

  const visibleAnnouncements = announcements.filter((a) => !dismissedIds.includes(a.id));

  if (visibleAnnouncements.length === 0) return null;

  const topAnnouncement = visibleAnnouncements[0];

  const handleDismiss = (id: string) => {
    const updated = [...dismissedIds, id];
    setDismissedIds(updated);
    try {
      localStorage.setItem('clover_dismissed_announcements', JSON.stringify(updated));
    } catch {}
  };

  return (
    <div
      style={{
        background: 'linear-gradient(90deg, #1e293b 0%, #0f172a 100%)',
        color: '#ffffff',
        padding: '8px 16px',
        fontSize: '12.5px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        position: 'relative',
        zIndex: 40,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: '14px', flexShrink: 0 }}>📢</span>
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <strong>{topAnnouncement.title}</strong>{' '}
          <span style={{ opacity: 0.85 }}>- {topAnnouncement.content}</span>
        </div>
      </div>
      <button
        onClick={() => handleDismiss(topAnnouncement.id)}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#94a3b8',
          fontSize: '16px',
          cursor: 'pointer',
          padding: '0 4px',
          lineHeight: 1,
          flexShrink: 0,
        }}
        title="닫기"
        aria-label="닫기"
      >
        ✕
      </button>
    </div>
  );
}
