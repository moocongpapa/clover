import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  api,
  VOTE_LABELS,
  type EventDetail,
  type VoteChoice,
  type VoteResults,
} from '../api';
import './GroupDetail.css';

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [votes, setVotes] = useState<VoteResults | null>(null);
  const [error, setError] = useState('');
  const [voting, setVoting] = useState(false);

  const load = () => {
    if (!id) return;
    Promise.all([api.getEvent(id), api.getVotes(id)])
      .then(([e, v]) => {
        setEvent(e);
        setVotes(v);
      })
      .catch((e) => setError(e.message));
  };

  useEffect(load, [id]);

  const handleVote = async (choice: VoteChoice) => {
    if (!id) return;
    setVoting(true);
    try {
      await api.castVote(id, choice);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '투표 실패');
    } finally {
      setVoting(false);
    }
  };

  const handleCancel = async () => {
    if (!id || !confirm('이벤트를 취소하시겠습니까?')) return;
    await api.cancelEvent(id);
    load();
  };

  if (error && !event) return <p className="form-error">{error}</p>;
  if (!event || !votes) return <p className="loading-text">불러오는 중…</p>;

  const locked = votes.event.voteLocked || event.status === 'CANCELLED';
  const myChoice = votes.myVote?.choice;

  return (
    <div>
      <p className="breadcrumb">
        <Link to={`/groups/${event.group.id}`}>{event.group.name}</Link>
      </p>

      <header className="event-detail-header">
        <h1>
          {event.title}
          {event.status === 'CANCELLED' && (
            <span className="status-cancelled">취소됨</span>
          )}
        </h1>
        <p>{event.description}</p>

        <div className="event-info-grid">
          <div className="info-cell">
            <label>날짜</label>
            <span>
              {new Date(event.date).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'short',
              })}
            </span>
          </div>
          <div className="info-cell">
            <label>시간</label>
            <span>{event.startTime}</span>
          </div>
          <div className="info-cell">
            <label>장소</label>
            <span>{event.location}</span>
          </div>
          <div className="info-cell">
            <label>등록자</label>
            <span>{event.createdBy.displayName}</span>
          </div>
        </div>

        {event.status === 'ACTIVE' && (
          <button type="button" className="btn-ghost" onClick={handleCancel}>
            이벤트 취소
          </button>
        )}
      </header>

      <section className="vote-section">
        <div className="vote-section__head">
          <h2>참석 투표</h2>
          {myChoice && (
            <span className={`vote-my-badge vote-my-badge--${myChoice.toLowerCase()}`}>
              {VOTE_LABELS[myChoice]}
            </span>
          )}
        </div>

        {!votes.myVote && !locked && (
          <p className="vote-hint">참석 여부를 선택해 주세요</p>
        )}

        {locked ? (
          <p className="vote-locked-banner">투표가 마감되었습니다</p>
        ) : (
          <div className="vote-segment" role="group" aria-label="참석 투표">
            {(['ATTEND', 'ABSENT', 'LATE'] as VoteChoice[]).map((c) => (
              <button
                key={c}
                type="button"
                className={`vote-segment__btn vote-segment__btn--${c.toLowerCase()}${
                  myChoice === c ? ' is-selected' : ''
                }`}
                disabled={voting}
                onClick={() => handleVote(c)}
              >
                <span className="vote-segment__label">{VOTE_LABELS[c]}</span>
                <span className="vote-segment__count">{votes.counts[c]}</span>
              </button>
            ))}
          </div>
        )}

        {locked && (
          <div className="vote-segment vote-segment--readonly" aria-hidden>
            {(['ATTEND', 'ABSENT', 'LATE'] as VoteChoice[]).map((c) => (
              <div
                key={c}
                className={`vote-segment__btn vote-segment__btn--${c.toLowerCase()}${
                  myChoice === c ? ' is-selected' : ''
                }`}
              >
                <span className="vote-segment__label">{VOTE_LABELS[c]}</span>
                <span className="vote-segment__count">{votes.counts[c]}</span>
              </div>
            ))}
          </div>
        )}

        <div className="vote-section__subhead">
          <h3>투표 현황</h3>
          <span className="vote-section__total">{votes.votes.length}명</span>
        </div>

        {votes.votes.length === 0 ? (
          <p className="vote-empty">아직 투표한 회원이 없습니다</p>
        ) : (
          <ul className="voter-list">
            {votes.votes.map((v) => (
              <li key={v.id} className="voter-list__item">
                <span className="voter-list__name">{v.user.displayName}</span>
                <span
                  className={`voter-list__badge voter-list__badge--${v.choice.toLowerCase()}`}
                >
                  {v.choiceLabel}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
