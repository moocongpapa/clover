import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  api,
  ROLE_LABELS,
  type Event,
  type GroupDetail,
} from '../api';
import { useAuth } from '../context/AuthContext';
import './GroupDetail.css';

export default function GroupDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

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
  const isOfficer =
    membership?.role === 'PRESIDENT' || membership?.role === 'OFFICER';
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

  const handleSetOfficer = async (userId: string, role: string) => {
    await api.updateMember(group.id, userId, { role });
    load();
  };

  const handleTransfer = async (userId: string) => {
    if (!confirm('회장직을 양도하시겠습니까?')) return;
    await api.transferPresident(group.id, userId);
    load();
  };

  const inviteUrl = `${window.location.origin}/invite/${group.inviteCode}`;

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
            <span className="group-category">{group.category}</span>
            <h1>{group.name}</h1>
            <p>{group.description}</p>
            <p className="group-stats">
              회원 {group._count.members}명 · 이벤트 {group._count.events}개
            </p>
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
          <strong>초대 링크</strong>
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
                <span>{m.user.displayName}</span>
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
            {group.members.map((m) => (
              <li key={m.id}>
                <span>
                  {m.user.displayName}{' '}
                  <em className="role-badge">{ROLE_LABELS[m.role]}</em>
                </span>
                {isPresident && m.user.id !== user?.id && (
                  <div className="btn-row">
                    {m.role === 'MEMBER' && (
                      <button
                        type="button"
                        className="btn-sm btn-outline"
                        onClick={() => handleSetOfficer(m.user.id, 'OFFICER')}
                      >
                        운영진 지정
                      </button>
                    )}
                    {m.role === 'OFFICER' && (
                      <button
                        type="button"
                        className="btn-sm btn-ghost"
                        onClick={() => handleSetOfficer(m.user.id, 'MEMBER')}
                      >
                        운영진 해제
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-sm btn-outline"
                      onClick={() => handleTransfer(m.user.id)}
                    >
                      회장 양도
                    </button>
                  </div>
                )}
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
                        {new Date(ev.date).toLocaleDateString('ko-KR')} {ev.startTime}{' '}
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
