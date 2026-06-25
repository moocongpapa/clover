import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  api,
  formatEventTimeRange,
  formatTeamLabel,
  VOTE_CHOICES,
  VOTE_LABELS,
  type CalendarEvent,
  type VoteChoice,
} from '../api';
import { useAuth } from '../context/AuthContext';
import SegmentedControl from '../components/SegmentedControl';
import './Home.css';

function formatEventDate(
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

function eventEndAt(ev: CalendarEvent) {
  const d = new Date(ev.date);
  const [h, m] = (ev.endTime ?? ev.startTime).split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d;
}

function isUpcoming(ev: CalendarEvent) {
  return !ev.isPast;
}

function HomeVoteCounts({ event }: { event: CalendarEvent }) {
  return (
    <div className="home-vote-counts" aria-label="투표 현황">
      {VOTE_CHOICES.map((c) => (
        <span
          key={c}
          className={`home-vote-count home-vote-count--${c.toLowerCase()}${
            event.myVote === c ? ' is-mine' : ''
          }`}
        >
          <span className="home-vote-count__label">{VOTE_LABELS[c]}</span>
          <span className="home-vote-count__num">{event.voteCounts[c]}</span>
        </span>
      ))}
    </div>
  );
}

function HomeEventCard({
  event,
  onVoted,
  votable = false,
}: {
  event: CalendarEvent;
  onVoted?: () => void;
  votable?: boolean;
}) {
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<VoteChoice | null>(event.myVote);

  useEffect(() => {
    setSelected(event.myVote);
  }, [event.myVote, event.id]);

  const handleVote = async (choice: VoteChoice) => {
    setVoting(true);
    setError('');
    try {
      await api.castVote(event.id, choice);
      setSelected(choice);
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

  return (
    <article
      className={`home-event-card${votable && !event.myVote && !event.voteLocked ? ' home-event-card--action' : ''}`}
    >
      <div className="home-event-card__head">
        <div>
          <span className="home-event-card__group">{event.group.name}</span>
          <h3>
            <Link to={`/events/${event.id}`}>{event.title}</Link>
          </h3>
          <p className="home-event-card__meta">
            {formatEventDate(event.date, event.startTime, event.endTime)} · {event.location}
            {event.myTeam && (
              <span className="home-event-card__team">
                {' '}
                · {formatTeamLabel(event.myTeam)}
              </span>
            )}
          </p>
        </div>
        {badge}
      </div>

      {votable && event.status !== 'CANCELLED' && !event.voteLocked ? (
        <>
          <div className="home-vote-row">
            {VOTE_CHOICES.map((c) => (
              <button
                key={c}
                type="button"
                className={`home-vote-btn home-vote-btn--${c.toLowerCase()}${selected === c ? ' is-selected' : ''}`}
                disabled={voting}
                onClick={() => handleVote(c)}
              >
                <span className="home-vote-btn__label">{VOTE_LABELS[c]}</span>
                <span className="home-vote-btn__count">{event.voteCounts[c]}</span>
              </button>
            ))}
          </div>
          {error && <p className="home-event-card__error">{error}</p>}
        </>
      ) : (
        event.status !== 'CANCELLED' && <HomeVoteCounts event={event} />
      )}
    </article>
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

type HomeTab = 'upcoming' | 'past';

function HomeDashboard() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<HomeTab>('upcoming');

  const load = () => {
    api
      .getCalendar()
      .then(setEvents)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const upcoming = events.filter(isUpcoming);
  const needsVote = upcoming.filter((e) => !e.myVote && !e.voteLocked);
  const voted = upcoming.filter((e) => e.myVote || e.voteLocked);
  const past = events
    .filter((e) => !isUpcoming(e))
    .sort((a, b) => eventEndAt(b).getTime() - eventEndAt(a).getTime());

  return (
    <div className="home-dashboard">
      <div className="home-tabs">
        <SegmentedControl<HomeTab>
          name="홈 일정 보기"
          options={[
            { value: 'upcoming', label: '진행 중 일정' },
            { value: 'past', label: `지난 일정${past.length ? ` (${past.length})` : ''}` },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {loading ? (
        <p className="loading-text">불러오는 중…</p>
      ) : events.length === 0 ? (
        <div className="home-empty">
          <p>예정된 일정이 없어요.</p>
          <Link to="/groups" className="link-text">
            모임 찾아보기
          </Link>
        </div>
      ) : tab === 'upcoming' ? (
        needsVote.length === 0 && voted.length === 0 ? (
          <div className="home-empty">
            <p>진행 중인 일정이 없어요.</p>
            {past.length > 0 && (
              <button
                type="button"
                className="link-text"
                onClick={() => setTab('past')}
              >
                지난 일정 보기
              </button>
            )}
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
                    <HomeEventCard key={ev.id} event={ev} votable onVoted={load} />
                  ))}
                </div>
              </section>
            )}

            {voted.length > 0 && (
              <section className="home-section">
                <h2 className="home-section__title">투표 완료 · 진행 예정</h2>
                <div className="home-event-list">
                  {voted.map((ev) => (
                    <HomeEventCard key={ev.id} event={ev} votable onVoted={load} />
                  ))}
                </div>
              </section>
            )}
          </>
        )
      ) : past.length === 0 ? (
        <div className="home-empty">
          <p>지난 일정이 없어요.</p>
        </div>
      ) : (
        <section className="home-section">
          <div className="home-event-list">
            {past.map((ev) => (
              <HomeEventCard key={ev.id} event={ev} />
            ))}
          </div>
        </section>
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
