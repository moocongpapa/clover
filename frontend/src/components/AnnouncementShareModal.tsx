import { useState } from 'react';
import GroupAvatar from './GroupAvatar';
import { shareAnnouncementToKakao, type ShareAnnouncementData } from '../utils/kakaoShare';

export interface AnnouncementShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  announcement: ShareAnnouncementData | null;
  onSuccess?: (msg: string) => void;
}

export default function AnnouncementShareModal({
  isOpen,
  onClose,
  announcement,
  onSuccess,
}: AnnouncementShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  if (!isOpen || !announcement) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const targetUrl = announcement.groupId
    ? `${origin}/groups/${announcement.groupId}?tab=posts`
    : `${origin}/announcements`;

  const handleKakao = async () => {
    await shareAnnouncementToKakao(
      announcement,
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
      const pinPrefix = announcement.isPinned ? '📌 [필독 공지] ' : '📢 [공지] ';
      const groupLabel = announcement.groupName ? `[${announcement.groupName}] ` : '';
      const fullText = `🍀 ${pinPrefix}${groupLabel}${announcement.title}\n\n${announcement.content}\n\n👉 바로가기: ${targetUrl}`;
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setToast('단톡방에 바로 붙여넣을 수 있도록 공지 내용과 링크가 복사되었습니다!');
      onSuccess?.('공지 링크가 복사되었습니다.');
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
      style={{ animation: 'fadeIn 0.2s ease-out' }}
    >
      <div
        className="invite-modal-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <div className="invite-modal-handle" />

        {/* Header */}
        <div className="invite-modal-header">
          <div className="invite-modal-avatar-wrapper">
            <GroupAvatar
              name={announcement.groupName || announcement.title}
              src={announcement.groupProfileImageUrl}
              size={56}
            />
          </div>
          <div className="invite-modal-header-text">
            <span className="invite-modal-group-name">
              {announcement.isPinned && '📌 '}
              {announcement.groupName || '공지사항'}
            </span>
            <h3 className="invite-modal-title" style={{ fontSize: '17px', margin: '2px 0 4px', wordBreak: 'break-word' }}>
              {announcement.title}
            </h3>
            <p className="invite-modal-subtitle" style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
              카톡 단톡방에 공지글을 공유해 회원들에게 빠르게 알려보세요!
            </p>
          </div>
        </div>

        {/* Content Preview */}
        <div
          style={{
            margin: '0 0 16px',
            padding: '12px 14px',
            background: 'var(--surface-input, var(--grey-50, #f8fafc))',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            fontSize: '13px',
            lineHeight: 1.5,
            color: 'var(--ink-dark)',
            maxHeight: '80px',
            overflowY: 'auto',
            wordBreak: 'break-word',
          }}
        >
          {announcement.content}
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
              <span className="invite-action-btn__desc">카톡 단톡방이나 친구에게 공지 및 링크 전송</span>
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
                {copied ? '✅ 공지 내용 복사됨!' : '공지 내용 및 링크 복사하기'}
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
            value={targetUrl}
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
