import { useState } from 'react';
import GroupAvatar from './GroupAvatar';
import { shareEventToKakao, formatEventScheduleText, type ShareEventData } from '../utils/kakaoShare';

export interface EventShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: ShareEventData | null;
  onSuccess?: (msg: string) => void;
}

export default function EventShareModal({
  isOpen,
  onClose,
  event,
  onSuccess,
}: EventShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  if (!isOpen || !event) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const eventUrl = `${origin}/events/${event.id}`;
  const scheduleText = formatEventScheduleText(event.date, event.startTime, event.endTime);

  const handleKakao = async () => {
    await shareEventToKakao(
      event,
      (msg) => {
        setToast(msg);
        onSuccess?.(msg);
        setTimeout(() => setToast(null), 3000);
      },
      (err) => {
        setToast(err);
        setTimeout(() => setToast(null), 3000);
      },
    );
  };

  const handleCopyLink = async () => {
    try {
      const fullText = `🍀 [${event.groupName || '모임'}] ${event.title}\n📅 일시: ${scheduleText}${
        event.location ? `\n📍 장소: ${event.location}` : ''
      }\n\n🗳️ 참석 투표 바로가기:\n${eventUrl}`;
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setToast('단톡방에 바로 붙여넣을 수 있도록 일정 안내와 투표 링크가 복사되었습니다!');
      onSuccess?.('일정 투표 링크가 복사되었습니다.');
      setTimeout(() => setCopied(false), 2500);
      setTimeout(() => setToast(null), 3500);
    } catch {
      setToast('링크 복사에 실패했습니다.');
    }
  };

  return (
    <div
      className="invite-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="invite-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="invite-modal-handle" />

        <div className="invite-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>📢</span>
            <h3 className="invite-modal-title">일정(투표) 공유하기</h3>
          </div>
          <button
            type="button"
            className="invite-modal-close"
            onClick={onClose}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {/* Event Preview Card */}
        <div className="invite-modal-preview" style={{ alignItems: 'flex-start' }}>
          <GroupAvatar
            src={event.groupProfileImageUrl}
            name={event.groupName || 'Clover'}
            size={48}
            radius={14}
          />
          <div className="invite-modal-preview-text">
            <h4 className="invite-modal-group-name" style={{ fontSize: '15px', color: 'var(--ink-dark)' }}>
              {event.title}
            </h4>
            <p className="invite-modal-group-desc" style={{ marginTop: '3px', color: 'var(--ink-muted)' }}>
              📅 {scheduleText}
              {event.location && ` · 📍 ${event.location}`}
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: '11.5px', color: 'var(--accent)', fontWeight: 700 }}>
              카톡 단톡방에 공유하여 모임원들의 참석 투표를 모아보세요!
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="invite-modal-actions">
          <button
            type="button"
            className="invite-action-btn invite-action-btn--kakao"
            onClick={handleKakao}
          >
            <div className="invite-action-btn__icon invite-action-btn__icon--kakao">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3C6.5 3 2 6.6 2 11c0 2.8 1.9 5.3 4.8 6.7-.2.8-.8 3-1 3.5 0 .1 0 .2.1.2.1 0 .2 0 .3-.1.4-.3 3.4-2.3 4.7-3.2.7.1 1.4.1 2.1.1 5.5 0 10-3.6 10-8s-4.5-8-10-8z" />
              </svg>
            </div>
            <div className="invite-action-btn__content">
              <span className="invite-action-btn__title">카카오톡으로 공유하기</span>
              <span className="invite-action-btn__desc">카톡 단톡방이나 친구에게 일정 및 투표 전송</span>
            </div>
            <span className="invite-action-btn__arrow">›</span>
          </button>

          <button
            type="button"
            className="invite-action-btn invite-action-btn--link"
            onClick={handleCopyLink}
          >
            <div className="invite-action-btn__icon invite-action-btn__icon--link">
              🔗
            </div>
            <div className="invite-action-btn__content">
              <span className="invite-action-btn__title">
                {copied ? '✅ 투표 링크 복사됨!' : '투표 링크 및 안내문 복사하기'}
              </span>
              <span className="invite-action-btn__desc">카톡 등에 직접 붙여넣을 수 있는 메시지 복사</span>
            </div>
            <span className="invite-action-btn__arrow">›</span>
          </button>
        </div>

        {/* URL Box */}
        <div className="invite-modal-url-box">
          <input
            type="text"
            readOnly
            value={eventUrl}
            className="invite-modal-url-input"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <button
            type="button"
            className="invite-modal-url-copy-btn"
            onClick={handleCopyLink}
          >
            {copied ? '복사됨' : '복사'}
          </button>
        </div>

        {toast && (
          <div className="invite-share-toast">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
