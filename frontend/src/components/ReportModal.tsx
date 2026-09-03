import { useState } from 'react';
import { api } from '../api';
import './ReportModal.css';

export interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: '모임' | '게시글' | '일정' | '회원';
  targetId: string;
  targetTitle: string;
  onSuccess?: () => void;
}

const REPORT_REASONS = [
  '음란물 또는 청소년 유해 매체물',
  '불법 도박, 사기 또는 부당한 금전 요구',
  '욕설, 인격 모독, 비방 또는 혐오 발언',
  '영리 목적의 상업적 광고 및 무단 도배',
  '개인정보 노출 또는 사칭 행위',
  '기타 서비스 운영 정책 위반',
];

export default function ReportModal({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetTitle,
  onSuccess,
}: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>(REPORT_REASONS[0]);
  const [detailText, setDetailText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const reportContent = `[🚨신고 접수] 대상: ${targetType} (ID: ${targetId}, 제목/이름: ${targetTitle})\n사유: ${selectedReason}\n상세 내용: ${detailText.trim() || '없음'}`;
      await api.sendFeedback(reportContent);
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onClose();
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (err: any) {
      console.error(err);
      alert(err.message || '신고 접수에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="report-modal-backdrop" onClick={onClose}>
      <div className="report-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="report-modal-header">
          <h3 className="report-modal-title">🚨 부적절 콘텐츠 신고</h3>
        </div>

        {submitted ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <span style={{ fontSize: '36px', display: 'block', marginBottom: '8px' }}>✅</span>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', color: '#16a34a' }}>신고가 정상 접수되었습니다</h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
              관리팀이 내용을 신속히 확인하여 24시간 이내에 조치하겠습니다.
            </p>
          </div>
        ) : (
          <>
            <p className="report-modal-target">
              <strong>신고 대상:</strong> [{targetType}] {targetTitle}
            </p>

            <div className="report-reasons-list">
              {REPORT_REASONS.map((reason) => (
                <label
                  key={reason}
                  className={`report-reason-option ${selectedReason === reason ? 'is-selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="reportReason"
                    value={reason}
                    checked={selectedReason === reason}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    style={{ accentColor: '#ef4444' }}
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>

            <textarea
              className="report-detail-textarea"
              placeholder="구체적인 사유나 정황을 작성해 주시면 조치에 큰 도움이 됩니다. (선택사항)"
              value={detailText}
              onChange={(e) => setDetailText(e.target.value)}
              maxLength={500}
            />

            <p className="report-notice">
              ℹ️ 허위 신고 시 서비스 이용이 제한될 수 있습니다. 신고자의 정보는 절대 공개되지 않습니다.
            </p>

            <div className="report-actions">
              <button
                type="button"
                className="btn-report-cancel"
                disabled={submitting}
                onClick={onClose}
              >
                취소
              </button>
              <button
                type="button"
                className="btn-report-submit"
                disabled={submitting}
                onClick={handleSubmit}
              >
                {submitting ? '접수 중…' : '신고 제출하기'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
