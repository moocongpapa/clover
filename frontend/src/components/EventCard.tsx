import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  api,
  formatDateTime,
  formatEventTimeRange,
  formatTeamLabel,
  VOTE_CHOICES,
  VOTE_LABELS,
  type CalendarEvent,
  type VoteChoice,
} from '../api';
import GroupAvatar from './GroupAvatar';
import EventShareModal from './EventShareModal';

export function formatEventDateTime(
  date: string,
  startTime: string,
  endTime?: string | null,
) {
  const d = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const eventDay = new Date(d);
  eventDay.setHours(0, 0, 0, 0);

  let label = d.toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  });
  if (eventDay.getTime() === today.getTime()) label = '오늘';
  else if (eventDay.getTime() === tomorrow.getTime()) label = '내일';

  return `${label} ${formatEventTimeRange(startTime, endTime)}`;
}

export function HomeVoteProgressBar({ event }: { event: CalendarEvent }) {
  const total = event.voteCounts.ATTEND + event.voteCounts.LATE + event.voteCounts.ABSENT;
  if (total === 0) return null;

  const attendPct = (event.voteCounts.ATTEND / total) * 100;
  const latePct = (event.voteCounts.LATE / total) * 100;
  const absentPct = (event.voteCounts.ABSENT / total) * 100;

  return (
    <div
      className="home-vote-progress-wrap"
      title={`참석 ${event.voteCounts.ATTEND}명, 늦참 ${event.voteCounts.LATE}명, 불참 ${event.voteCounts.ABSENT}명`}
    >
      <div className="home-vote-progress-bar">
        {attendPct > 0 && (
          <div className="progress-bar-seg seg--attend" style={{ width: `${attendPct}%` }} />
        )}
        {latePct > 0 && (
          <div className="progress-bar-seg seg--late" style={{ width: `${latePct}%` }} />
        )}
        {absentPct > 0 && (
          <div className="progress-bar-seg seg--absent" style={{ width: `${absentPct}%` }} />
        )}
      </div>
      {typeof event.group?.memberCount === 'number' && event.group.memberCount > 0 && (
        <span className="home-vote-rate-text">
          {event.group.memberCount}명 중 {total}명 투표 ({Math.round((total / event.group.memberCount) * 100)}%)
        </span>
      )}
    </div>
  );
}

export function HomeVoteCounts({ event }: { event: CalendarEvent }) {
  return (
    <div style={{ width: '100%' }}>
      <HomeVoteProgressBar event={event} />
      <div className="home-vote-row" aria-label="투표 현황">
        {VOTE_CHOICES.map((c) => (
          <span
            key={c}
            className={`home-vote-btn home-vote-btn--${c.toLowerCase()}${
              event.myVote === c ? ' is-selected' : ''
            }`}
            style={{ cursor: 'default' }}
          >
            <span className="home-vote-btn__label">{VOTE_LABELS[c]}</span>
            <span className="home-vote-btn__count">({event.voteCounts[c]})</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export interface EventCardProps {
  event: CalendarEvent;
  onVoted?: () => void;
  votable?: boolean;
}

export default function EventCard({
  event,
  onVoted,
  votable = false,
}: EventCardProps) {
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<VoteChoice | null>(event.myVote);
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    setSelected(event.myVote);
  }, [event.myVote, event.id]);

  const handleVote = async (choice: VoteChoice) => {
    setVoting(true);
    setError('');
    try {
      if (selected === choice) {
        await api.cancelVote(event.id);
        setSelected(null);
      } else {
        await api.castVote(event.id, choice);
        setSelected(choice);
      }
      onVoted?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : '투표 실패');
    } finally {
      setVoting(false);
    }
  };

  const badge =
    event.status === 'CANCELLED' ? (
      <span className="home-badge home-badge--cancel">취소</span>
    ) : votable && !event.myVote && !event.voteLocked ? (
      <span className="home-badge home-badge--warn">투표 필요</span>
    ) : event.myVote ? (
      <span className={`home-badge home-badge--${event.myVote.toLowerCase()}`}>
        {VOTE_LABELS[event.myVote]}
      </span>
    ) : null;

  const isEdited = event.updatedAt !== event.createdAt;
  const stampValue = formatDateTime(isEdited ? event.updatedAt : event.createdAt);

  return (
    <article
      className={`home-event-card${
        votable && !event.myVote && !event.voteLocked ? ' home-event-card--action' : ''
      }`}
    >
      <div className="home-event-card__header-top">
        <Link
          to={`/groups/${event.group.id}`}
          className="home-event-card__group"
          style={{ textDecoration: 'none' }}
        >
          {event.group.name} 〉
        </Link>
        <div className="home-event-card__stamp-badge" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {stampValue && <span className="home-event-card__stamp">{stampValue}</span>}
          {badge}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowShare(true);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '26px',
              height: '26px',
              borderRadius: '8px',
              background: '#fee500',
              border: '1px solid #e6cf00',
              color: '#191919',
              cursor: 'pointer',
              padding: 0,
              fontSize: '12px',
            }}
            title="일정 및 투표 공유"
            aria-label="공유"
          >
            💬
          </button>
        </div>
      </div>

      <Link
        to={`/events/${event.id}`}
        className="home-event-card__body-main home-event-card__detail-link"
        aria-label={`${event.title} 일정 상세 보기`}
      >
        <GroupAvatar
          src={event.group.profileImageUrl}
          name={event.group.name}
          className="home-event-card__avatar"
          size={52}
          radius={14}
        />
        <div className="home-event-card__content-right">
          <h3>
            {event.title}
          </h3>
          <div className="home-event-card__meta">
            <div className="home-event-card__meta-date">
              📅 {formatEventDateTime(event.date, event.startTime, event.endTime)}
            </div>
            {event.location && (
              <div className="home-event-card__meta-location">
                📍 {event.location}
                {event.myTeam && (
                  <span className="home-event-card__team">
                    {' '}
                    · {formatTeamLabel(event.myTeam)}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </Link>

      {votable && event.status !== 'CANCELLED' && !event.voteLocked ? (
        <>
          <HomeVoteProgressBar event={event} />
          <div className="home-vote-row">
            {VOTE_CHOICES.map((c) => (
              <button
                key={c}
                type="button"
                className={`home-vote-btn home-vote-btn--${c.toLowerCase()}${
                  selected === c ? ' is-selected' : ''
                }`}
                disabled={voting}
                onClick={() => handleVote(c)}
              >
                <span className="home-vote-btn__label">{VOTE_LABELS[c]}</span>
                <span className="home-vote-btn__count">({event.voteCounts[c]})</span>
              </button>
            ))}
          </div>
          {error && <p className="home-event-card__error">{error}</p>}
        </>
      ) : (
        event.status !== 'CANCELLED' && <HomeVoteCounts event={event} />
      )}

      <EventShareModal
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        event={{
          id: event.id,
          title: event.title,
          date: event.date,
          startTime: event.startTime,
          endTime: event.endTime,
          location: event.location,
          groupName: event.group?.name,
          groupProfileImageUrl: event.group?.profileImageUrl,
          voteCounts: event.voteCounts,
        }}
      />
    </article>
  );
}
