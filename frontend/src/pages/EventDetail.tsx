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
        <h2>참석 투표</h2>

        {!votes.myVote && !locked && (
          <p className="not-voted-tag">아직 투표하지 않았습니다</p>
        )}

        {locked ? (
          <p className="info-banner">투표가 마감되었습니다.</p>
        ) : (
          <div className="vote-buttons">
            {(['ATTEND', 'ABSENT', 'LATE'] as VoteChoice[]).map((c) => (
              <button
                key={c}
                type="button"
                className={`vote-btn ${
                  myChoice === c
                    ? c === 'ATTEND'
                      ? 'active-attend'
                      : c === 'ABSENT'
                        ? 'active-absent'
                        : 'active-late'
                    : ''
                }`}
                disabled={voting}
                onClick={() => handleVote(c)}
              >
                {VOTE_LABELS[c]}
              </button>
            ))}
          </div>
        )}

        <div className="vote-summary">
          <span className="summary-chip attend">
            참석 {votes.counts.ATTEND}
          </span>
          <span className="summary-chip absent">
            불참 {votes.counts.ABSENT}
          </span>
          <span className="summary-chip late">늦참 {votes.counts.LATE}</span>
        </div>

        <h3>투표 현황</h3>
        <div className="voter-grid">
          {votes.votes.map((v) => (
            <div key={v.id} className="voter-card">
              <span>{v.user.displayName}</span>
              <span
                className={`stamp stamp-${v.choice.toLowerCase()}`}
              >
                {v.choiceLabel}
              </span>
            </div>
          ))}
        </div>
      </section>

      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
