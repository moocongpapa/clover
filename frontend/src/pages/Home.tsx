import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  api,
  VOTE_LABELS,
  type CalendarEvent,
  type VoteChoice,
} from '../api';
import { useAuth } from '../context/AuthContext';
import './Home.css';

function formatEventDate(date: string, startTime: string) {
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

  return `${label} ${startTime}`;
}

function isUpcoming(ev: CalendarEvent) {
  if (ev.status === 'CANCELLED') return false;
  const d = new Date(ev.date);
  const [h, m] = ev.startTime.split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d >= new Date();
}

function EventVoteCard({
  event,
  onVoted,
}: {
  event: CalendarEvent;
  onVoted: () => void;
}) {
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<VoteChoice | null>(event.myVote);

  const handleVote = async (choice: VoteChoice) => {
    setVoting(true);
    setError('');
    try {
      await api.castVote(event.id, choice);
      setSelected(choice);
      onVoted();
    } catch (e) {
      setError(e instanceof Error ? e.message : '투표 실패');
    } finally {
      setVoting(false);
    }
  };

  return (
    <article className="home-event-card home-event-card--action">
      <div className="home-event-card__head">
        <div>
          <span className="home-event-card__group">{event.group.name}</span>
          <h3>
            <Link to={`/events/${event.id}`}>{event.title}</Link>
          </h3>
          <p className="home-event-card__meta">
            {formatEventDate(event.date, event.startTime)} · {event.location}
          </p>
        </div>
        <span className="home-badge home-badge--warn">투표 필요</span>
      </div>

      <div className="home-vote-row">
        {(['ATTEND', 'ABSENT', 'LATE'] as VoteChoice[]).map((c) => (
          <button
            key={c}
            type="button"
            className={`home-vote-btn home-vote-btn--${c.toLowerCase()}${selected === c ? ' is-selected' : ''}`}
            disabled={voting}
            onClick={() => handleVote(c)}
          >
            {VOTE_LABELS[c]}
          </button>
        ))}
      </div>
      {error && <p className="home-event-card__error">{error}</p>}
    </article>
  );
}

function EventSummaryCard({ event }: { event: CalendarEvent }) {
  return (
    <Link to={`/events/${event.id}`} className="home-event-card">
      <div className="home-event-card__head">
        <div>
          <span className="home-event-card__group">{event.group.name}</span>
          <h3>{event.title}</h3>
          <p className="home-event-card__meta">
            {formatEventDate(event.date, event.startTime)} · {event.location}
          </p>
        </div>
        {event.myVote ? (
          <span className={`home-badge home-badge--${event.myVote.toLowerCase()}`}>
            {VOTE_LABELS[event.myVote]}
          </span>
        ) : event.status === 'CANCELLED' ? (
          <span className="home-badge home-badge--cancel">취소</span>
        ) : null}
      </div>
    </Link>
  );
}

function GuestLanding() {
  return (
    <div className="home-guest">
      <section className="hero">
        <p className="hero-eyebrow">Clover</p>
        <h1>
          모임 일정은 모이고,
          <br />
          <em>참석 여부는 자동으로</em> 알려줘요
        </h1>
        <p className="hero-desc">
          이벤트를 등록하면 회원 전체에 알림이 가고, 하루 전에는 미투표자에게만
          카카오로 리마인더가 전송돼요.
        </p>
        <div className="hero-actions">
          <Link to="/login" className="btn-primary">
            시작하기
          </Link>
          <Link to="/groups" className="btn-outline">
            모임 둘러보기
          </Link>
        </div>
      </section>
    </div>
  );
}

function HomeDashboard() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    api
      .getCalendar()
      .then(setEvents)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const upcoming = events.filter(isUpcoming);
  const needsVote = upcoming.filter((e) => !e.myVote);
  const voted = upcoming.filter((e) => e.myVote);
  const past = events.filter((e) => !isUpcoming(e));

  return (
    <div className="home-dashboard">
      <header className="home-dashboard__header">
        <h1>홈</h1>
        <p className="home-dashboard__sub">가입한 모임 일정이에요</p>
      </header>

      {loading ? (
        <p className="loading-text">불러오는 중…</p>
      ) : events.length === 0 ? (
        <div className="home-empty">
          <p>예정된 일정이 없어요.</p>
          <Link to="/groups" className="link-text">
            모임 찾아보기
          </Link>
        </div>
      ) : (
        <>
          {needsVote.length > 0 && (
            <section className="home-section">
              <h2 className="home-section__title">
                투표가 필요해요
                <span className="home-section__count">{needsVote.length}</span>
              </h2>
              <div className="home-event-list">
                {needsVote.map((ev) => (
                  <EventVoteCard key={ev.id} event={ev} onVoted={load} />
                ))}
              </div>
            </section>
          )}

          {voted.length > 0 && (
            <section className="home-section">
              <h2 className="home-section__title">투표 완료</h2>
              <div className="home-event-list">
                {voted.map((ev) => (
                  <EventSummaryCard key={ev.id} event={ev} />
                ))}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section className="home-section">
              <h2 className="home-section__title">지난 일정</h2>
              <div className="home-event-list">
                {past.slice(0, 5).map((ev) => (
                  <EventSummaryCard key={ev.id} event={ev} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) return <p className="loading-text">불러오는 중…</p>;
  if (!user) return <GuestLanding />;
  return <HomeDashboard />;
}
