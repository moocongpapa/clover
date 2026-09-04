import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, startKakaoLogin, type Group } from '../api';
import { useAuth } from '../context/AuthContext';
import GroupAvatar from './GroupAvatar';
import './GroupPreviewModal.css';

interface GroupPreviewModalProps {
  group: Group | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
  distanceStr?: string;
}

export default function GroupPreviewModal({
  group,
  isOpen,
  onClose,
  onUpdated,
  distanceStr,
}: GroupPreviewModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  if (!isOpen || !group) return null;

  const status = group.myMembership?.status;
  const isPresident = group.myMembership?.role === 'PRESIDENT';
  const isApproved = status === 'APPROVED';
  const isPending = status === 'PENDING';

  const locationText =
    group.activityRegion ||
    [group.activitySido, group.activitySigungu, group.activityDistrict]
      .filter(Boolean)
      .join(' ') ||
    '지역 미정';

  // Extract president name if available
  const presidentMember = (group as any).members?.find(
    (m: any) => m.role === 'PRESIDENT'
  );
  const presidentName = presidentMember?.user?.displayName || '모임장';

  const handleJoin = async () => {
    if (!user) {
      startKakaoLogin();
      return;
    }
    setBusy(true);
    setError('');
    setSuccessNotice('');
    try {
      await api.joinGroup(group.id);
      setSuccessNotice('가입 승인 요청이 완료되었습니다! 운영진이 승인하면 푸시 알림으로 알려드립니다.');
      onUpdated();
    } catch (err: any) {
      setError(err.message || '가입 신청 처리에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const handleCancelJoin = async () => {
    if (!confirm('가입 신청을 취소하시겠습니까?')) return;
    setBusy(true);
    setError('');
    setSuccessNotice('');
    try {
      await api.cancelJoinGroup(group.id);
      setSuccessNotice('가입 신청이 취소되었습니다.');
      onUpdated();
    } catch (err: any) {
      setError(err.message || '신청 취소에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const handleGoToGroup = () => {
    onClose();
    navigate(`/groups/${group.id}`);
  };

  return (
    <div className="group-preview-modal-backdrop" onClick={onClose}>
      <div className="group-preview-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="group-preview-modal-header">
          <h3 className="group-preview-modal-title">모임 간략 정보</h3>
          <button
            type="button"
            className="group-preview-modal-close-btn"
            onClick={onClose}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="group-preview-modal-body">
          {/* Hero Row: Avatar + Name + Category + President */}
          <div className="preview-hero">
            <GroupAvatar
              src={group.profileImageUrl}
              name={group.name}
              size={68}
              radius={18}
            />
            <div className="preview-hero__info">
              <span className="preview-category-badge">
                {group.customSportName || group.category}
              </span>
              <h2 className="preview-group-name">{group.name}</h2>
              <p className="preview-president-name">
                👑 {presidentName}
              </p>
            </div>
          </div>

          {/* Description */}
          <div className="preview-desc-box">
            {group.description || '등록된 모임 소개글이 없습니다.'}
          </div>

          {/* Quick Info 2x2 Grid */}
          <div className="preview-info-grid">
            <div className="preview-info-item">
              <span className="preview-info-label">📍 활동 지역</span>
              <span className="preview-info-value">
                {locationText}
                {distanceStr ? ` (${distanceStr})` : ''}
              </span>
            </div>

            <div className="preview-info-item">
              <span className="preview-info-label">👥 멤버 현황</span>
              <span className="preview-info-value">
                {group._count?.members ?? 0}명
                {group.maxMembers ? ` / 정원 ${group.maxMembers}명` : ''}
              </span>
            </div>

            <div className="preview-info-item" style={{ gridColumn: 'span 2' }}>
              <span className="preview-info-label">💰 정기 회비</span>
              <span className="preview-info-value">
                {group.monthlyFee
                  ? `월 ${group.monthlyFee.toLocaleString()}원${
                      group.dueDay
                        ? ` (${group.dueDay === 31 ? '매월 말일' : `매월 ${group.dueDay}일`} 마감)`
                        : ''
                    }`
                  : group.dueDay
                  ? `${group.dueDay === 31 ? '매월 말일' : `매월 ${group.dueDay}일`} 마감`
                  : '정기 회비 없음 (무료)'}
                {group.officerFeeExempt ? ' · 운영진 면제' : ''}
              </span>
            </div>
          </div>

          {/* Arenas if available */}
          {group.arenas && group.arenas.length > 0 && (
            <div className="preview-arenas-box">
              <span className="preview-arenas-title">🏟️ 주요 활동 구장</span>
              <div className="preview-arenas-list">
                {group.arenas.map((arena: any, idx: number) => (
                  <span key={arena.id || idx} className="preview-arena-tag">
                    {arena.placeName}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Error / Success Notice */}
          {error && (
            <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '10px 12px', borderRadius: '12px', fontSize: '12.5px', lineHeight: 1.4 }}>
              ⚠️ {error}
            </div>
          )}
          {successNotice && (
            <div style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '10px 12px', borderRadius: '12px', fontSize: '12.5px', lineHeight: 1.4 }}>
              🎉 {successNotice}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="group-preview-modal-footer">
          {!user ? (
            <button
              type="button"
              className="btn-preview-join"
              onClick={handleJoin}
            >
              🔒 카카오 로그인하고 가입 신청하기
            </button>
          ) : isApproved ? (
            <button
              type="button"
              className="btn-preview-join"
              onClick={handleGoToGroup}
            >
              🎉 {isPresident ? '내가 개설한 모임입니다 (홈으로 이동)' : '이미 가입된 모임입니다 (홈으로 이동)'}
            </button>
          ) : isPending ? (
            <div className="preview-pending-status-box">
              <p className="preview-pending-title">⏳ 가입 승인 대기 중</p>
              <p className="preview-pending-desc">
                모임 운영진이 승인하면 바로 활동을 시작할 수 있습니다.
              </p>
              <button
                type="button"
                className="btn-preview-cancel-join"
                disabled={busy}
                onClick={handleCancelJoin}
              >
                {busy ? '취소 처리 중…' : '가입 신청 취소'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn-preview-join"
              disabled={busy}
              onClick={handleJoin}
            >
              {busy ? '신청 처리 중…' : '🍀 가입 승인 요청하기'}
            </button>
          )}

          <button
            type="button"
            className="preview-detail-link"
            onClick={handleGoToGroup}
          >
            모임 상세 페이지 전체 보기 ›
          </button>
        </div>
      </div>
    </div>
  );
}
