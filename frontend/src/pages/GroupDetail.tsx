import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  api,
  formatCategoryEmoji,
  formatEventDate,
  formatEventTimeRange,
  ASSIGNABLE_ROLES,
  formatMemberDisplayName,
  formatPhoneNumber,
  isOfficerRole,
  isStaffRole,
  normalizeCategory,
  ROLE_LABELS,
  ROLE_SORT_ORDER,
  type Event,
  type GroupDetail,
} from '../api';
import './GroupDetail.css';

export default function GroupDetail() {
  const { id } = useParams<{ id: string }>();
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [accountCopied, setAccountCopied] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState('');

  const load = () => {
    if (!id) return;
    Promise.all([api.getGroup(id), api.listEvents(id)])
      .then(([g, e]) => {
        setGroup(g);
        setEvents(e);
      })
      .catch((e) => setError(e.message));
  };

  useEffect(load, [id]);

  if (error) return <p className="form-error">{error}</p>;
  if (!group) return <p className="loading-text">불러오는 중…</p>;

  const membership = group.myMembership;
  const isApproved = membership?.status === 'APPROVED';
  const isOfficer = membership?.role ? isStaffRole(membership.role) : false;
  const isPresident = membership?.role === 'PRESIDENT';

  const handleJoin = async () => {
    try {
      await api.joinGroup(group.id);
      setMessage('가입 신청이 완료되었습니다. 회장 승인을 기다려 주세요.');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '가입 실패');
    }
  };

  const handleCancelJoin = async () => {
    try {
      await api.cancelJoinGroup(group.id);
      setMessage('가입 신청을 취소했습니다.');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '취소 실패');
    }
  };

  const handleApprove = async (userId: string, status: string) => {
    await api.updateMember(group.id, userId, { status });
    load();
  };

  const handleSetRole = async (userId: string, role: string) => {
    try {
      await api.updateMember(group.id, userId, { role });
      setMessage('역할이 변경되었습니다.');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '역할 변경 실패');
    }
  };

  const handleTransfer = async () => {
    if (!transferTargetId) return;
    const target = group.members.find((m) => m.user.id === transferTargetId);
    if (!target) return;
    if (!confirm(`${target.user.displayName}님에게 회장직을 양도하시겠습니까?`)) {
      return;
    }
    try {
      await api.transferPresident(group.id, transferTargetId);
      setMessage('회장직이 양도되었습니다.');
      setShowTransfer(false);
      setTransferTargetId('');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '회장 양도 실패');
    }
  };

  const inviteUrl = `${window.location.origin}/invite/${group.inviteCode}`;

  const handleCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('링크 복사에 실패했습니다.');
    }
  };

  const handleCopyAccountNumber = async () => {
    if (!group.bankAccountNumber) return;
    try {
      await navigator.clipboard.writeText(group.bankAccountNumber);
      setAccountCopied(true);
      setTimeout(() => setAccountCopied(false), 2000);
    } catch {
      setError('계좌번호 복사에 실패했습니다.');
    }
  };

  const roleEmoji = (role: string) => {
    if (role === 'PRESIDENT') return '👑 ';
    if (role === 'VICE_PRESIDENT') return '🥈 ';
    if (role === 'SECRETARY') return '📋 ';
    if (role === 'OFFICER') return '⭐ ';
    return '';
  };

  const sortedMembers = [...group.members].sort((a, b) => {
    const orderA = ROLE_SORT_ORDER[a.role] ?? 99;
    const orderB = ROLE_SORT_ORDER[b.role] ?? 99;
    if (orderA !== orderB) return orderA - orderB;
    return a.user.displayName.localeCompare(b.user.displayName, 'ko');
  });

  const transferCandidates = sortedMembers.filter(
    (m) => m.role !== 'PRESIDENT',
  );

  const hasBankAccount = Boolean(
    group.bankName || group.bankAccountNumber || group.bankAccountHolder,
  );

  return (
    <div className="group-detail">
      <header className="group-hero">
        <div className="group-hero__main">
          {group.profileImageUrl && (
            <img
              src={group.profileImageUrl}
              alt=""
              className="group-hero__avatar"
            />
          )}
          <div>
            <span className="group-detail-category">
              <span className="group-detail-category__emoji" aria-hidden>
                {formatCategoryEmoji(group.category)}
              </span>
              {normalizeCategory(group.category)}
            </span>
            <h1>{group.name}</h1>
            <p>{group.description}</p>
            <p className="group-stats">
              {group.activityRegion && (
                <span className="group-stats__region">{group.activityRegion}</span>
              )}
              회원 {group._count.members}명 · 이벤트 {group._count.events}개
            </p>
            {isApproved && hasBankAccount && (
              <div className="group-hero__bank">
                <span className="group-hero__bank-label">모임 통장</span>
                <dl className="group-hero__bank-list">
                  {group.bankName && (
                    <>
                      <dt>은행</dt>
                      <dd>{group.bankName}</dd>
                    </>
                  )}
                  {group.bankAccountNumber && (
                    <>
                      <dt>계좌번호</dt>
                      <dd className="group-hero__bank-account">
                        <span>{group.bankAccountNumber}</span>
                        <button
                          type="button"
                          className="btn-sm btn-outline"
                          onClick={handleCopyAccountNumber}
                        >
                          {accountCopied ? '복사됨' : '복사'}
                        </button>
                      </dd>
                    </>
                  )}
                  {group.bankAccountHolder && (
                    <>
                      <dt>예금주</dt>
                      <dd>{group.bankAccountHolder}</dd>
                    </>
                  )}
                </dl>
              </div>
            )}
          </div>
        </div>
        {isOfficer && (
          <div className="group-actions">
            <Link to={`/groups/${group.id}/edit`} className="btn-outline">
              프로필 수정
            </Link>
            <Link to={`/groups/${group.id}/events/new`} className="btn-primary">
              이벤트 등록
            </Link>
          </div>
        )}
      </header>

      {message && <p className="info-banner">{message}</p>}

      {!membership && (
        <button type="button" className="btn-primary" onClick={handleJoin}>
          가입 신청
        </button>
      )}

      {membership?.status === 'PENDING' && (
        <div className="join-status-row">
          <p className="info-banner">가입 승인 대기 중입니다. 회장이 확인할 때까지 기다려 주세요.</p>
          <button type="button" className="btn-ghost" onClick={handleCancelJoin}>
            신청 취소
          </button>
        </div>
      )}

      {membership?.status === 'REJECTED' && (
        <div className="join-status-row">
          <p className="info-banner info-banner--warn">가입이 거절되었습니다.</p>
          <button type="button" className="btn-primary" onClick={handleJoin}>
            다시 신청
          </button>
        </div>
      )}

      {isApproved && (
        <section className="invite-box">
          <div className="invite-box__header">
            <strong>초대 링크</strong>
            <button
              type="button"
              className="btn-sm btn-outline"
              onClick={handleCopyInvite}
            >
              {copied ? '복사됨' : '복사'}
            </button>
          </div>
          <code>{inviteUrl}</code>
        </section>
      )}

      {isPresident && group.pendingRequests.length > 0 && (
        <section className="section-block">
          <h2>가입 신청 ({group.pendingRequests.length})</h2>
          <p className="section-desc">회장만 승인·거절할 수 있어요.</p>
          <ul className="member-list">
            {group.pendingRequests.map((m) => (
              <li key={m.id}>
                <span>{formatMemberDisplayName(m.user)}</span>
                {m.user.phoneNumber && (
                  <a
                    href={`tel:${m.user.phoneNumber}`}
                    className="member-list__phone"
                  >
                    {formatPhoneNumber(m.user.phoneNumber)}
                  </a>
                )}
                <div className="btn-row">
                  <button
                    type="button"
                    className="btn-sm btn-primary"
                    onClick={() => handleApprove(m.user.id, 'APPROVED')}
                  >
                    승인
                  </button>
                  <button
                    type="button"
                    className="btn-sm btn-ghost"
                    onClick={() => handleApprove(m.user.id, 'REJECTED')}
                  >
                    거절
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {isApproved && (
        <section className="section-block">
          <h2>운영진 & 회원</h2>
          <ul className="member-list">
            {sortedMembers.map((m) => (
              <li key={m.id}>
                <span className="member-list__name">
                  {roleEmoji(m.role)}
                  {formatMemberDisplayName(m.user)}{' '}
                  <em className="role-badge">{ROLE_LABELS[m.role]}</em>
                  {isPresident && m.role === 'PRESIDENT' && (
                    <span className="member-list__transfer">
                      {!showTransfer ? (
                        <button
                          type="button"
                          className="btn-sm btn-outline"
                          onClick={() => setShowTransfer(true)}
                        >
                          회장 양도
                        </button>
                      ) : (
                        <span className="transfer-panel">
                          <select
                            className="role-select"
                            value={transferTargetId}
                            onChange={(e) => setTransferTargetId(e.target.value)}
                          >
                            <option value="">회원 선택</option>
                            {transferCandidates.map((c) => (
                              <option key={c.id} value={c.user.id}>
                                {formatMemberDisplayName(c.user)}
                                {isOfficerRole(c.role)
                                  ? ` (${ROLE_LABELS[c.role]})`
                                  : ''}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="btn-sm btn-primary"
                            disabled={!transferTargetId}
                            onClick={handleTransfer}
                          >
                            확인
                          </button>
                          <button
                            type="button"
                            className="btn-sm btn-ghost"
                            onClick={() => {
                              setShowTransfer(false);
                              setTransferTargetId('');
                            }}
                          >
                            취소
                          </button>
                        </span>
                      )}
                    </span>
                  )}
                </span>
                <div className="member-list__aside">
                  {m.user.phoneNumber && (
                    <a
                      href={`tel:${m.user.phoneNumber}`}
                      className="member-list__phone"
                    >
                      {formatPhoneNumber(m.user.phoneNumber)}
                    </a>
                  )}
                  {isPresident && m.role !== 'PRESIDENT' && (
                    <select
                      className="role-select"
                      value={m.role}
                      onChange={(e) => handleSetRole(m.user.id, e.target.value)}
                      aria-label={`${m.user.displayName} 역할 변경`}
                    >
                      {ASSIGNABLE_ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {isApproved && (
        <section className="section-block">
          <h2>이벤트</h2>
          {events.length === 0 ? (
            <p className="empty-inline">등록된 이벤트가 없습니다.</p>
          ) : (
            <ul className="event-list">
              {events.map((ev) => (
                <li key={ev.id}>
                  <Link to={`/events/${ev.id}`} className="event-item">
                    <div>
                      <strong>{ev.title}</strong>
                      {ev.status === 'CANCELLED' && (
                        <span className="status-cancelled">취소됨</span>
                      )}
                      <span className="event-meta">
                        {formatEventDate(ev.date)}{' '}
                        {formatEventTimeRange(ev.startTime, ev.endTime)}{' '}
                        · {ev.location}
                      </span>
                    </div>
                    <span className="vote-pill">
                      투표 {ev._count?.votes ?? 0}명
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
