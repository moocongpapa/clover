import { useEffect, useState, useMemo } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
  api,
  formatDateTime,
  formatEventTimeRange,
  formatTeamLabel,
  isProfileComplete,
  isStaffRole,
  VOTE_CHOICES,
  VOTE_LABELS,
  type CalendarEvent,
  type VoteChoice,
} from '../api';
import { useAuth } from '../context/AuthContext';
import GroupAvatar from '../components/GroupAvatar';
import LoadingIndicator from '../components/LoadingIndicator';
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

function HomeVoteProgressBar({ event }: { event: CalendarEvent }) {
  const total = event.voteCounts.ATTEND + event.voteCounts.LATE + event.voteCounts.ABSENT;
  if (total === 0) return null;

  const attendPct = (event.voteCounts.ATTEND / total) * 100;
  const latePct = (event.voteCounts.LATE / total) * 100;
  const absentPct = (event.voteCounts.ABSENT / total) * 100;

  return (
    <div className="home-vote-progress-wrap" title={`참석 ${event.voteCounts.ATTEND}명, 늦참 ${event.voteCounts.LATE}명, 불참 ${event.voteCounts.ABSENT}명`}>
      <div className="home-vote-progress-bar">
        {attendPct > 0 && <div className="progress-bar-seg seg--attend" style={{ width: `${attendPct}%` }} />}
        {latePct > 0 && <div className="progress-bar-seg seg--late" style={{ width: `${latePct}%` }} />}
        {absentPct > 0 && <div className="progress-bar-seg seg--absent" style={{ width: `${absentPct}%` }} />}
      </div>
    </div>
  );
}

function HomeVoteCounts({ event }: { event: CalendarEvent }) {
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
      className={`home-event-card${votable && !event.myVote && !event.voteLocked ? ' home-event-card--action' : ''}`}
    >
      <div className="home-event-card__header-top">
        <span className="home-event-card__group">{event.group.name}</span>
        <div className="home-event-card__stamp-badge">
          {stampValue && (
            <span className="home-event-card__stamp">
              {stampValue}
            </span>
          )}
          {badge}
        </div>
      </div>

      <div className="home-event-card__body-main">
        <GroupAvatar
          src={event.group.profileImageUrl}
          name={event.group.name}
          className="home-event-card__avatar"
          size={52}
        />
        <div className="home-event-card__content-right">
          <h3>
            <Link to={`/events/${event.id}`}>{event.title}</Link>
          </h3>
          <div className="home-event-card__meta">
            <div className="home-event-card__meta-date">
              {formatEventDate(event.date, event.startTime, event.endTime)}
            </div>
            <div className="home-event-card__meta-location">
              {event.location}
              {event.myTeam && (
                <span className="home-event-card__team">
                  {' '}
                  · {formatTeamLabel(event.myTeam)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {votable && event.status !== 'CANCELLED' && !event.voteLocked ? (
        <>
          <HomeVoteProgressBar event={event} />
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
                <span className="home-vote-btn__count">({event.voteCounts[c]})</span>
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
  const [demoVote, setDemoVote] = useState<'ATTEND' | 'LATE' | 'ABSENT' | null>('ATTEND');

  const attendCount = 14 + (demoVote === 'ATTEND' ? 1 : 0);
  const lateCount = 2 + (demoVote === 'LATE' ? 1 : 0);
  const absentCount = 1 + (demoVote === 'ABSENT' ? 1 : 0);

  return (
    <div className="home-guest">
      {/* Background ambient light */}
      <div className="landing-ambient-glow" />

      {/* Main Hero Section */}
      <section className="landing-hero">
        <div className="landing-badge-pill">
          <span className="landing-badge-icon">🍀</span>
          <span>모임 일정 & 실시간 참석 투표</span>
        </div>

        <h1 className="landing-hero-title">
          모임 일정은 <span className="landing-highlight">한눈에,</span><br />
          참석 투표는 <span className="landing-highlight landing-highlight--green">자동으로</span>
        </h1>

        <p className="landing-hero-subtitle">
          번거로운 단톡방 투표와 참석 확인은 이제 그만.<br className="mobile-break" />
          일정 등록부터 카카오톡 자동 리마인더, 조 편성, 회비 정산까지 한번에 해결하세요.
        </p>

        <div className="landing-hero-actions">
          <Link to="/login" className="landing-btn-kakao">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#000000">
              <path d="M12 3C6.477 3 2 6.477 2 10.772c0 2.766 1.848 5.19 4.646 6.57-.205.77-.754 2.802-.865 3.235-.138.544.198.536.417.391.172-.114 2.748-1.874 3.864-2.637.625.092 1.272.141 1.938.141 5.523 0 10-3.477 10-7.7c0-4.295-4.477-7.772-10-7.772z"/>
            </svg>
            <span>카카오로 1초 만에 시작하기</span>
          </Link>
          <Link to="/groups" className="landing-btn-explore">
            <span>모임 둘러보기</span>
            <span className="landing-arrow">→</span>
          </Link>
        </div>
      </section>

      {/* Interactive Live Demo Card (Signature Element) */}
      <section className="landing-demo-section">
        <div className="landing-demo-header">
          <span className="demo-live-dot" />
          <span className="demo-caption">실제 Clover 모임 카드 체험 (직접 눌러보세요!)</span>
        </div>

        <div className="landing-demo-card">
          <div className="demo-card-top">
            <div className="demo-group-info">
              <div className="demo-avatar">⚽</div>
              <div>
                <div className="demo-group-name">FC 클로버 (풋살/축구 정기모임)</div>
                <div className="demo-event-title">5월 정기 매치 & 회식</div>
              </div>
            </div>
            <span className="demo-status-badge">투표 진행 중</span>
          </div>

          <div className="demo-event-details">
            <div className="demo-detail-item">
              <span className="demo-icon">📅</span>
              <span>이번 주 토요일 오후 4:00 ~ 6:00</span>
            </div>
            <div className="demo-detail-item">
              <span className="demo-icon">📍</span>
              <span>펜타시티 풋살파크 A구장</span>
            </div>
          </div>

          {/* Interactive Vote Row */}
          <div className="demo-vote-row">
            <button
              type="button"
              className={`demo-vote-btn demo-vote-btn--attend ${demoVote === 'ATTEND' ? 'is-active' : ''}`}
              onClick={() => setDemoVote(demoVote === 'ATTEND' ? null : 'ATTEND')}
            >
              <span className="demo-vote-label">참석</span>
              <span className="demo-vote-count">{attendCount}명</span>
            </button>
            <button
              type="button"
              className={`demo-vote-btn demo-vote-btn--late ${demoVote === 'LATE' ? 'is-active' : ''}`}
              onClick={() => setDemoVote(demoVote === 'LATE' ? null : 'LATE')}
            >
              <span className="demo-vote-label">늦참</span>
              <span className="demo-vote-count">{lateCount}명</span>
            </button>
            <button
              type="button"
              className={`demo-vote-btn demo-vote-btn--absent ${demoVote === 'ABSENT' ? 'is-active' : ''}`}
              onClick={() => setDemoVote(demoVote === 'ABSENT' ? null : 'ABSENT')}
            >
              <span className="demo-vote-label">불참</span>
              <span className="demo-vote-count">{absentCount}명</span>
            </button>
          </div>

          {/* Kakao Reminder Live Toast Simulation */}
          <div className="demo-kakao-alert">
            <div className="demo-kakao-icon">💬</div>
            <div className="demo-kakao-text">
              <strong>카카오톡 자동 알림:</strong> 투표 마감 24시간 전 미투표 회원 3명에게 리마인더가 발송되었습니다.
            </div>
          </div>
        </div>
      </section>

      {/* 3 Key Feature Cards */}
      <section className="landing-features-grid">
        <div className="landing-feature-card">
          <div className="feature-icon-wrap" style={{ background: 'rgba(34, 197, 94, 0.12)', color: '#16a34a' }}>⚡</div>
          <h3>원터치 투표 & 실시간 집계</h3>
          <p>카톡방 투표를 일일이 세지 마세요. 참석/늦참/불참 인원과 명단이 실시간으로 자동 정리됩니다.</p>
        </div>
        <div className="landing-feature-card">
          <div className="feature-icon-wrap" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#d97706' }}>💬</div>
          <h3>미투표자 카톡 핀포인트 알림</h3>
          <p>전체 단톡방 도배 없이, 마감 전 미투표한 회원에게만 카카오톡으로 친절하게 리마인더를 보냅니다.</p>
        </div>
        <div className="landing-feature-card">
          <div className="feature-icon-wrap" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#2563eb' }}>⚽</div>
          <h3>자동 조 편성 & 투명한 회비</h3>
          <p>참석 인원 기반 공정한 팀 자동 분배와 월별 회비 정산 이력을 한곳에서 깔끔하게 관리하세요.</p>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="landing-bottom-cta">
        <h2>지금 바로 모임의 일정을 더 스마트하게.</h2>
        <p>복잡한 가입 절차 없이 카카오 계정으로 1초 만에 시작하세요.</p>
        <Link to="/login" className="landing-btn-kakao" style={{ margin: '0 auto', maxWidth: '320px' }}>
          <span>🍀 무료로 모임 시작하기</span>
        </Link>
      </section>
    </div>
  );
}

type HomeTab = 'upcoming' | 'past';

function MiniCalendar({
  events,
  selectedDate,
  onSelectDate,
}: {
  events: CalendarEvent[];
  selectedDate: string | null;
  onSelectDate: (dateStr: string | null) => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDay = new Date(year, month, 1);
  const startDayOfWeek = firstDay.getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const days: (number | null)[] = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    days.push(null);
  }
  for (let d = 1; d <= totalDays; d++) {
    days.push(d);
  }

  const dateEventMap = new Map<string, { hasUpcoming: boolean; hasPast: boolean }>();
  events.forEach((e) => {
    const d = new Date(e.date);
    const yStr = d.getFullYear();
    const mStr = String(d.getMonth() + 1).padStart(2, '0');
    const dStr = String(d.getDate()).padStart(2, '0');
    const dateKey = `${yStr}-${mStr}-${dStr}`;
    
    const isEventUpcoming = !e.isPast;
    
    const existing = dateEventMap.get(dateKey) || { hasUpcoming: false, hasPast: false };
    if (isEventUpcoming) {
      existing.hasUpcoming = true;
    } else {
      existing.hasPast = true;
    }
    dateEventMap.set(dateKey, existing);
  });

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  return (
    <div className="mini-calendar">
      <div className="mini-calendar__header">
        <button type="button" onClick={handlePrevMonth} className="calendar-nav-btn">◀</button>
        <span className="mini-calendar__title">
          {year}년 {month + 1}월
        </span>
        <button type="button" onClick={handleNextMonth} className="calendar-nav-btn">▶</button>
      </div>

      <div className="mini-calendar__weekdays">
        {['일', '월', '화', '수', '목', '금', '토'].map((w) => (
          <span key={w} className="weekday-label">{w}</span>
        ))}
      </div>

      <div className="mini-calendar__days">
        {days.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="calendar-day-empty" />;
          }

          const yStr = year;
          const mStr = String(month + 1).padStart(2, '0');
          const dStr = String(day).padStart(2, '0');
          const targetDateStr = `${yStr}-${mStr}-${dStr}`;
          const eventStatus = dateEventMap.get(targetDateStr);
          const hasEvent = !!eventStatus;
          const isSelected = selectedDate === targetDateStr;
          
          return (
            <button
              key={`day-${day}`}
              type="button"
              className={`calendar-day-btn${hasEvent ? ' has-event' : ''}${isSelected ? ' is-selected' : ''}`}
              onClick={() => onSelectDate(isSelected ? null : targetDateStr)}
            >
              <span className="day-number">{day}</span>
              {hasEvent && (
                <div className="calendar-day-dots">
                  {eventStatus.hasUpcoming && <span className="event-dot event-dot--upcoming" />}
                  {eventStatus.hasPast && <span className="event-dot event-dot--past" />}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <div className="mini-calendar__filter-bar">
          <span>선택된 날짜: {selectedDate}</span>
          <button type="button" className="clear-filter-btn" onClick={() => onSelectDate(null)}>
            전체 보기
          </button>
        </div>
      )}
    </div>
  );
}

function HomeDashboard() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [duesSummary, setDuesSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<HomeTab>('upcoming');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [pastFilter, setPastFilter] = useState<'1w' | '1m'>('1m');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [showPastEventsPopup, setShowPastEventsPopup] = useState(false);
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [showGroupSelectModal, setShowGroupSelectModal] = useState(false);

  const officerGroups = groups.filter((g) => g.myRole && isStaffRole(g.myRole));
  const isOfficerInAnyGroup = officerGroups.length > 0;

  const handleCreateEventClick = () => {
    setIsFabOpen(false);
    if (officerGroups.length >= 1) {
      setShowGroupSelectModal(true);
    } else {
      navigate('/groups/new');
    }
  };

  const handleCreateGroupClick = () => {
    setIsFabOpen(false);
    navigate('/groups/new');
  };

  const load = () => {
    setLoading(true);
    Promise.all([
      api.getCalendar(),
      api.myGroups(),
      api.getMyDuesSummary ? api.getMyDuesSummary() : Promise.resolve([]),
    ])
      .then(([calendarEvents, myGroups, myDues]) => {
        setEvents(calendarEvents);
        setGroups(myGroups);
        if (myDues) setDuesSummary(myDues);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  // Filter events by calendar date selection only in calendar view mode
  const filteredEvents = (viewMode === 'calendar' && selectedDate)
    ? events.filter((e) => {
        const d = new Date(e.date);
        const yStr = d.getFullYear();
        const mStr = String(d.getMonth() + 1).padStart(2, '0');
        const dStr = String(d.getDate()).padStart(2, '0');
        return `${yStr}-${mStr}-${dStr}` === selectedDate;
      })
    : events;

  const upcoming = filteredEvents.filter(isUpcoming);
  const needsVote = upcoming.filter((e) => !e.myVote && !e.voteLocked);
  const voted = upcoming.filter((e) => e.myVote || e.voteLocked);

  // Next upcoming urgent event for the hero D-Day card (sorted by earliest date/time)
  const nextUrgentEvent = upcoming.length > 0 ? upcoming[0] : null;

  const getDDayInfo = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cleanDateStr = (dateStr || '').split('T')[0];
    const parts = cleanDateStr.split('-');
    if (parts.length < 3) return { label: 'D-Day', isUrgent: false };
    const target = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return { label: '🔥 오늘 D-Day', isUrgent: true };
    if (diffDays === 1) return { label: '⚡ 내일 D-1', isUrgent: true };
    if (diffDays === 2) return { label: '📅 D-2', isUrgent: false };
    if (diffDays > 2) return { label: `📅 D-${diffDays}`, isUrgent: false };
    return { label: '진행 중', isUrgent: true };
  };

  // Past events filtering
  const allPastEvents = filteredEvents
    .filter((e) => !isUpcoming(e))
    .sort((a, b) => eventEndAt(b).getTime() - eventEndAt(a).getTime());

  let past = allPastEvents;

  if (pastFilter === '1w') {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    past = past.filter((e) => new Date(e.date) >= oneWeekAgo);
  } else if (pastFilter === '1m') {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    past = past.filter((e) => new Date(e.date) >= oneMonthAgo);
  }

  const unpaidDuesCount = useMemo(() => {
    return duesSummary.filter(d => !d.isPaid && !d.isExempt).length;
  }, [duesSummary]);

  const actionItems = useMemo(() => {
    const items = [];
    if (needsVote.length > 0) {
      items.push({
        title: '참석 투표 필요',
        desc: `${needsVote.length}개의 모임 일정이 투표를 기다리고 있어요.`,
        iconClass: 'home-action-card__icon--vote',
        emoji: '🗳️',
        link: `/events/${needsVote[0].id}`,
      });
    }
    if (unpaidDuesCount > 0) {
      items.push({
        title: '이번 달 회비 미납',
        desc: `${unpaidDuesCount}개의 모임 회비가 아직 납부되지 않았어요.`,
        iconClass: 'home-action-card__icon--dues',
        emoji: '💰',
        link: '/my',
      });
    }
    return items;
  }, [needsVote, unpaidDuesCount]);
  return (
    <div className="home-dashboard">
      {/* 🌟 Next Upcoming Event D-Day Highlight Widget */}
      {nextUrgentEvent && (
        <div
          className="home-dday-hero"
          onClick={() => navigate(`/events/${nextUrgentEvent.id}`)}
          style={{
            margin: '0 0 20px 0',
            padding: '16px 18px',
            background: 'linear-gradient(135deg, #064e3b 0%, #065f46 60%, #047857 100%)',
            borderRadius: '18px',
            color: '#ffffff',
            boxShadow: '0 8px 24px rgba(6, 78, 59, 0.22)',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden',
            transition: 'transform 0.15s ease'
          }}
        >
          <div style={{
            position: 'absolute',
            right: '-20px',
            bottom: '-20px',
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(52, 211, 153, 0.25) 0%, rgba(52, 211, 153, 0) 70%)',
            pointerEvents: 'none'
          }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '4px 10px',
              background: getDDayInfo(nextUrgentEvent.date).isUrgent ? '#ef4444' : 'rgba(255, 255, 255, 0.2)',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 800,
              letterSpacing: '-0.2px'
            }}>
              {getDDayInfo(nextUrgentEvent.date).label}
            </span>
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#a7f3d0' }}>
              {nextUrgentEvent.group?.name || '모임'} 〉
            </span>
          </div>

          <h3 style={{
            fontSize: '17px',
            fontWeight: 800,
            margin: '0 0 8px 0',
            color: '#ffffff',
            letterSpacing: '-0.3px',
            lineHeight: 1.3
          }}>
            {nextUrgentEvent.title}
          </h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: '#d1fae5', flexWrap: 'wrap' }}>
            <span>📅 {formatEventDate(nextUrgentEvent.date, nextUrgentEvent.startTime, nextUrgentEvent.endTime)}</span>
            {nextUrgentEvent.location && <span>📍 {nextUrgentEvent.location}</span>}
          </div>

          <div style={{
            marginTop: '12px',
            paddingTop: '10px',
            borderTop: '1px solid rgba(255, 255, 255, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12.5px'
          }}>
            <span style={{
              fontWeight: 700,
              color: nextUrgentEvent.myVote ? '#6ee7b7' : '#fde047'
            }}>
              {nextUrgentEvent.myVote
                ? `내 투표: ${VOTE_LABELS[nextUrgentEvent.myVote] || nextUrgentEvent.myVote} ✅`
                : '⏳ 참석 투표가 필요합니다'}
            </span>
            <span style={{ fontWeight: 700, color: '#ffffff', opacity: 0.9 }}>
              상세 보기 →
            </span>
          </div>
        </div>
      )}

      {/* 지금 필요한 것 Action Cards */}
      <section style={{ marginBottom: '24px' }}>
        <h2 className="home-section__title" style={{ marginBottom: '12px', fontSize: '15px', color: 'var(--ink-dark)' }}>지금 필요한 것</h2>
        {actionItems.length > 0 ? (
          <div className="home-action-cards">
            {actionItems.map((item, i) => (
              <Link key={i} to={item.link} className="home-action-card">
                <div className={`home-action-card__icon ${item.iconClass}`}>
                  {item.emoji}
                </div>
                <div className="home-action-card__body">
                  <p className="home-action-card__title">{item.title}</p>
                  <p className="home-action-card__desc">{item.desc}</p>
                </div>
                <span className="home-action-card__arrow">›</span>
              </Link>
            ))}
          </div>
        ) : !loading && (
          <div className="home-action-complete">
            <span className="home-action-complete__emoji">✅</span>
            <p className="home-action-complete__text">모든 할 일을 완료했어요!</p>
          </div>
        )}
      </section>

      {/* Naver Band Style My Groups Grid */}
      <section className="home-groups-section">
        <div className="home-groups-header">
          <h2 className="home-section__title">내 모임</h2>
          <div className="home-groups-header-actions">
            <Link to="/groups" className="home-groups-action-link">모임 찾기</Link>
          </div>
        </div>
        <div className="home-groups-grid">
          {groups.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '24px 16px', textAlign: 'center', background: 'var(--surface-alt)', borderRadius: '16px', border: '1px dashed var(--border)' }}>
              <p style={{ margin: '0 0 10px 0', fontSize: '13.5px', color: 'var(--ink-muted)', fontWeight: 600 }}>
                가입된 모임이 없습니다. 새 모임을 만들거나 찾아보세요!
              </p>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                <Link
                  to="/groups/new"
                  style={{
                    padding: '8px 14px',
                    background: '#10b981',
                    color: '#ffffff',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 700,
                    textDecoration: 'none'
                  }}
                >
                  🌱 새 모임 만들기
                </Link>
                <Link
                  to="/groups"
                  style={{
                    padding: '8px 14px',
                    background: 'var(--grey-100)',
                    color: 'var(--ink)',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 600,
                    textDecoration: 'none',
                    border: '1px solid var(--border)'
                  }}
                >
                  🔍 모임 찾기
                </Link>
              </div>
            </div>
          ) : (
            groups.map((group) => (
              <Link key={group.id} to={`/groups/${group.id}`} className="grid-group-card">
                <GroupAvatar
                  src={group.profileImageUrl}
                  name={group.name}
                  size={76}
                  radius={22}
                  className="grid-group-avatar"
                />
                <span className="grid-group-name">{group.name}</span>
              </Link>
            ))
          )}
        </div>
      </section>

      {/* Unified Single-Row Schedule Control Bar */}
      <div className="home-schedule-bar">
        {viewMode === 'list' ? (
          <div className="home-schedule-subtabs">
            <button
              type="button"
              className={`home-schedule-tab-btn ${tab === 'upcoming' ? 'is-active' : ''}`}
              onClick={() => setTab('upcoming')}
            >
              진행 중 일정
            </button>
            <button
              type="button"
              className={`home-schedule-tab-btn ${tab === 'past' ? 'is-active' : ''}`}
              onClick={() => setTab('past')}
            >
              지난 일정{allPastEvents.length > 0 ? ` (${allPastEvents.length})` : ''}
            </button>
          </div>
        ) : (
          <div className="home-schedule-subtabs">
            <h2 className="home-section__title" style={{ margin: 0, fontSize: '14px', color: 'var(--ink-dark)' }}>
              일정 캘린더
            </h2>
          </div>
        )}

        <div className="home-view-toggle-group">
          <button
            type="button"
            className={`home-view-toggle-item ${viewMode === 'list' ? 'is-active' : ''}`}
            onClick={() => setViewMode('list')}
            title="리스트 보기"
          >
            📋 리스트
          </button>
          <button
            type="button"
            className={`home-view-toggle-item ${viewMode === 'calendar' ? 'is-active' : ''}`}
            onClick={() => setViewMode('calendar')}
            title="캘린더 보기"
          >
            📅 캘린더
          </button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        /* Calendar View Mode */
        <section className="home-calendar-section">
          <MiniCalendar
            events={events}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
          
          <div style={{ marginTop: '20px' }}>
            <h3 className="home-section__title" style={{ marginBottom: '12px' }}>
              {selectedDate ? `${selectedDate} 일정` : '전체 일정'}
            </h3>
            {loading ? (
              <p className="loading-text">불러오는 중…</p>
            ) : upcoming.length === 0 && past.length === 0 ? (
              <div className="home-empty">
                <p>선택한 날짜에는 일정이 없어요.</p>
              </div>
            ) : (
              <div>
                {upcoming.length > 0 && (
                  <section className="home-section" style={{ marginBottom: '24px' }}>
                    <h4 className="home-section__title" style={{ fontSize: '14px', color: 'var(--accent)', marginBottom: '8px' }}>
                      진행 중 일정
                      <span className="home-section__count" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', marginLeft: '6px' }}>
                        {upcoming.length}
                      </span>
                    </h4>
                    <div className="home-event-list">
                      {upcoming.map((ev) => (
                        <HomeEventCard key={ev.id} event={ev} votable={!ev.isPast} onVoted={load} />
                      ))}
                    </div>
                  </section>
                )}

                {past.length > 0 && (
                  <section className="home-section">
                    <h4 className="home-section__title" style={{ fontSize: '14px', color: 'var(--ink-muted)', marginBottom: '8px' }}>
                      지난 일정
                      <span className="home-section__count" style={{ background: 'var(--grey-100)', color: 'var(--ink-muted)', marginLeft: '6px' }}>
                        {past.length}
                      </span>
                    </h4>
                    <div className="home-event-list">
                      {past.map((ev) => (
                        <HomeEventCard key={ev.id} event={ev} votable={!ev.isPast} onVoted={load} />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        </section>
      ) : (
        /* Card List View Mode */
        <>
          {/* Schedule List Content */}


          {loading ? (
            <LoadingIndicator message="모임 일정을 불러오는 중입니다…" onRetry={load} />
          ) : filteredEvents.length === 0 ? (
            <div className="home-empty">
              <p>일정이 없어요.</p>
              <Link to="/groups" className="link-text">
                모임 찾아보기
              </Link>
            </div>
          ) : tab === 'upcoming' ? (
            needsVote.length === 0 && voted.length === 0 ? (
              <div className="home-empty" style={{ padding: '36px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <p style={{ margin: 0, fontSize: '14.5px', fontWeight: '700', color: 'var(--ink-dark)' }}>진행 중인 일정이 없어요.</p>
                {past.length > 0 && (
                  <button
                    type="button"
                    className="btn-view-past-events"
                    onClick={() => setTab('past')}
                  >
                    <span>📜 지난 일정 보기 ({past.length})</span>
                    <span style={{ fontSize: '12px' }}>→</span>
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
          ) : (
            <>
              {/* Past Filters */}
              <div className="past-filter-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    className={`filter-btn${pastFilter === '1w' ? ' is-active' : ''}`}
                    onClick={() => setPastFilter('1w')}
                  >
                    최근 1주일
                  </button>
                  <button
                    type="button"
                    className={`filter-btn${pastFilter === '1m' ? ' is-active' : ''}`}
                    onClick={() => setPastFilter('1m')}
                  >
                    최근 1개월
                  </button>
                </div>
                <button
                  type="button"
                  className="past-view-all-btn"
                  onClick={() => setShowPastEventsPopup(true)}
                  style={{
                    background: 'none',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--ink-muted)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  전체보기 ↗
                </button>
              </div>

              {past.length === 0 ? (
                <div className="home-empty">
                  <p>조건에 맞는 지난 일정이 없어요.</p>
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
            </>
          )}
        </>
      )}

      {showPastEventsPopup && (
        <div className="past-events-modal-overlay" onClick={() => setShowPastEventsPopup(false)}>
          <div className="past-events-modal" onClick={(e) => e.stopPropagation()}>
            <div className="past-events-modal__header">
              <h3>지난 일정 전체보기</h3>
              <button
                type="button"
                className="past-events-modal__close-btn"
                onClick={() => setShowPastEventsPopup(false)}
              >
                ✕
              </button>
            </div>
            <div className="past-events-modal__body">
              {allPastEvents.length === 0 ? (
                <p className="past-events-modal__empty">지난 일정이 없습니다.</p>
              ) : (
                <div className="past-events-modal__list">
                  {allPastEvents.map((ev) => (
                    <Link
                      key={ev.id}
                      to={`/events/${ev.id}`}
                      className="past-events-modal__item"
                      onClick={() => setShowPastEventsPopup(false)}
                    >
                      <div className="past-events-modal__item-group">{ev.group.name}</div>
                      <div className="past-events-modal__item-title">{ev.title}</div>
                      <div className="past-events-modal__item-time">
                        {formatEventDate(ev.date, ev.startTime, ev.endTime)}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Officer Floating Action Button (FAB) & Speed Dial */}
      {isOfficerInAnyGroup && (
        <div className="home-fab-container app-fab-fixed-container">
          {isFabOpen && (
            <div className="home-fab-backdrop" onClick={() => setIsFabOpen(false)} />
          )}

          <div className={`home-fab-speed-dial${isFabOpen ? ' is-open' : ''}`}>
            <button
              type="button"
              className="home-fab-action-item"
              onClick={handleCreateEventClick}
            >
              <span className="fab-item-icon">⚽</span>
              <span>새 일정 만들기</span>
            </button>
            <button
              type="button"
              className="home-fab-action-item"
              onClick={handleCreateGroupClick}
            >
              <span className="fab-item-icon">🌱</span>
              <span>새 모임 만들기</span>
            </button>
          </div>

          <button
            type="button"
            className={`home-fab-main-btn${isFabOpen ? ' is-open' : ''}`}
            onClick={() => setIsFabOpen((prev) => !prev)}
            aria-label="생성 메뉴 열기"
            title="새 일정 또는 모임 생성"
          >
            +
          </button>
        </div>
      )}

      {/* Group Selector Modal for Event Creation */}
      {showGroupSelectModal && (
        <div className="group-select-modal-overlay" onClick={() => setShowGroupSelectModal(false)}>
          <div className="group-select-modal" onClick={(e) => e.stopPropagation()}>
            <div className="group-select-modal__header">
              <h3>어느 모임의 일정을 만드시겠어요?</h3>
              <button
                type="button"
                className="group-select-modal__close-btn"
                onClick={() => setShowGroupSelectModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="group-select-modal__body">
              <div className="group-select-modal__list">
                {officerGroups.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    className="group-select-modal__item"
                    onClick={() => {
                      setShowGroupSelectModal(false);
                      navigate(`/groups/${g.id}/events/new`);
                    }}
                  >
                    <GroupAvatar src={g.profileImageUrl} name={g.name} size={40} radius={12} />
                    <div className="group-select-modal__item-info">
                      <span className="group-select-modal__item-name">{g.name}</span>
                      <span className="group-select-modal__item-role">운영진</span>
                    </div>
                    <span className="group-select-modal__arrow">→</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingIndicator message="사용자 정보를 확인하고 있습니다…" />;
  if (!user) return <GuestLanding />;
  if (!isProfileComplete(user)) {
    return <Navigate to="/profile/edit?required=true" replace />;
  }
  return <HomeDashboard />;
}
