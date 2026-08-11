import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatEventTimeRange, VOTE_LABELS, type CalendarEvent } from '../api';
import './Calendar.css';

type ViewMode = 'list' | 'month';
type ListTab = 'upcoming' | 'past';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function eventEndAt(ev: CalendarEvent) {
  const d = new Date(ev.date);
  const [h, m] = (ev.endTime ?? ev.startTime).split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d;
}

function isUpcoming(ev: CalendarEvent) {
  return !ev.isPast;
}

function toDateKey(date: Date | string): string {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getMonthCells(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];

  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function Calendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [listTab, setListTab] = useState<ListTab>('upcoming');
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    api
      .getCalendar()
      .then(setEvents)
      .finally(() => setLoading(false));
  }, []);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const key = toDateKey(ev.date);
      const list = map.get(key) ?? [];
      list.push(ev);
      map.set(key, list);
    }
    return map;
  }, [events]);

  const threeMonthsAgo = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const upcoming = useMemo(
    () =>
      events
        .filter(isUpcoming)
        .sort((a, b) => eventEndAt(a).getTime() - eventEndAt(b).getTime()),
    [events],
  );

  const past = useMemo(
    () =>
      events
        .filter((e) => {
          if (isUpcoming(e)) return false;
          const eventDate = new Date(e.date);
          return eventDate.getTime() >= threeMonthsAgo.getTime();
        })
        .sort((a, b) => eventEndAt(b).getTime() - eventEndAt(a).getTime()),
    [events, threeMonthsAgo],
  );

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const cells = getMonthCells(year, month);

  const goPrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
    setSelectedDate(null);
  };

  const goNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
    setSelectedDate(null);
  };

  const goToday = () => {
    const today = new Date();
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(today);
  };

  const selectedEvents = selectedDate
    ? (eventsByDate.get(toDateKey(selectedDate)) ?? [])
    : [];

  const renderListItem = (ev: CalendarEvent) => {
    const d = new Date(ev.date);
    return (
      <Link key={ev.id} to={`/events/${ev.id}`} className="cal-list-item">
        <div className="cal-list-date">
          <span className="cal-list-day">{d.getDate()}</span>
          <span className="cal-list-month">{d.getMonth() + 1}월</span>
        </div>
        <div className="cal-list-body">
          <strong>{ev.title}</strong>
          <span className="cal-list-meta">
            {ev.group.name} · {formatEventTimeRange(ev.startTime, ev.endTime)} · {ev.location}
          </span>
          <div className="cal-list-tags">
            {ev.status === 'CANCELLED' && (
              <span className="badge badge--danger">취소됨</span>
            )}
            {ev.myVote ? (
              <span className={`badge badge--vote badge--${ev.myVote.toLowerCase()}`}>
                {VOTE_LABELS[ev.myVote]}
              </span>
            ) : ev.status !== 'CANCELLED' ? (
              <span className="badge badge--warn">미투표</span>
            ) : null}
          </div>
        </div>
      </Link>
    );
  };

  const renderMonthEventChip = (ev: CalendarEvent) => (
    <Link
      key={ev.id}
      to={`/events/${ev.id}`}
      className={`cal-month-event${ev.status === 'CANCELLED' ? ' is-cancelled' : ''}${!ev.myVote && ev.status !== 'CANCELLED' ? ' needs-vote' : ''}`}
      title={ev.title}
    >
      <span className="cal-month-event__dot" />
      <span className="cal-month-event__title">{ev.title}</span>
    </Link>
  );

  return (
    <div className="calendar-page">
      {/* Compact Unified Header Row: Sub Tabs + View Toggles */}
      <div className="cal-header-compact-row">
        {viewMode === 'list' ? (
          <div className="cal-compact-tabs">
            <button
              type="button"
              className={`cal-compact-tab-btn ${listTab === 'upcoming' ? 'is-active' : ''}`}
              onClick={() => setListTab('upcoming')}
            >
              예정 / 진행 <span className="cal-tab-count">({upcoming.length})</span>
            </button>
            <button
              type="button"
              className={`cal-compact-tab-btn ${listTab === 'past' ? 'is-active' : ''}`}
              onClick={() => setListTab('past')}
            >
              지난 일정 <span className="cal-tab-count">({past.length})</span>
            </button>
          </div>
        ) : (
          <div className="cal-compact-month-title">
            <span>{currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월</span>
          </div>
        )}

        <div className="cal-view-toggle" role="group" aria-label="캘린더 보기 방식">
          <button
            type="button"
            className={`cal-view-toggle__btn${viewMode === 'list' ? ' is-active' : ''}`}
            onClick={() => setViewMode('list')}
            aria-pressed={viewMode === 'list'}
            aria-label="목록 보기"
            title="목록 보기"
          >
            📋
          </button>
          <button
            type="button"
            className={`cal-view-toggle__btn${viewMode === 'month' ? ' is-active' : ''}`}
            onClick={() => setViewMode('month')}
            aria-pressed={viewMode === 'month'}
            aria-label="달력 보기"
            title="달력 보기"
          >
            📅
          </button>
        </div>
      </div>

      {loading ? (
        <p className="loading-text">불러오는 중…</p>
      ) : events.length === 0 ? (
        <div className="empty-state">
          <p>예정된 이벤트가 없어요.</p>
          <Link to="/my-groups" className="link-text">내 모임 보기</Link>
        </div>
      ) : viewMode === 'list' ? (
        <>
          {listTab === 'upcoming' ? (
            <section className="cal-section">
              <div className="cal-list">
                {upcoming.length === 0 ? (
                  <div className="empty-inline-block" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <p className="empty-inline">예정된 이벤트가 없어요.</p>
                    {past.length > 0 && (
                      <button
                        type="button"
                        className="btn-view-past-events"
                        onClick={() => setListTab('past')}
                      >
                        <span>📜 지난 일정 보기 ({past.length})</span>
                        <span style={{ fontSize: '12px' }}>→</span>
                      </button>
                    )}
                  </div>
                ) : (
                  upcoming.map(renderListItem)
                )}
              </div>
            </section>
          ) : (
            <section className="cal-section">
              <div className="cal-list">
                {past.length === 0 ? (
                  <p className="empty-inline">최근 3개월 내 지난 일정이 없어요.</p>
                ) : (
                  past.map(renderListItem)
                )}
              </div>
            </section>
          )}
        </>
      ) : (
        <div className="cal-month-wrap">
          <div className="cal-month-card">
            <div className="cal-month-nav">
              <button
                type="button"
                className="cal-month-nav__btn"
                onClick={goPrevMonth}
                aria-label="이전 달"
              >
                ‹
              </button>
              <h2 className="cal-month-nav__title">
                {year}년 {month + 1}월
              </h2>
              <button
                type="button"
                className="cal-month-nav__btn"
                onClick={goNextMonth}
                aria-label="다음 달"
              >
                ›
              </button>
            </div>

            <button type="button" className="cal-today-btn" onClick={goToday}>
              오늘
            </button>

            <div className="cal-month-grid" role="grid" aria-label="월간 캘린더">
              {WEEKDAYS.map((wd, i) => (
                <div
                  key={wd}
                  className={`cal-weekday${i === 0 ? ' is-sun' : ''}${i === 6 ? ' is-sat' : ''}`}
                  role="columnheader"
                >
                  {wd}
                </div>
              ))}

              {cells.map((day, idx) => {
                if (day === null) {
                  return (
                    <div
                      key={`empty-${idx}`}
                      className="cal-day cal-day--empty"
                      role="gridcell"
                    />
                  );
                }

                const cellDate = new Date(year, month, day);
                const key = toDateKey(cellDate);
                const dayEvents = eventsByDate.get(key) ?? [];
                const isToday = isSameDay(cellDate, new Date());
                const isSelected =
                  selectedDate !== null && isSameDay(cellDate, selectedDate);
                const hasUnvoted = dayEvents.some(
                  (e) => !e.myVote && e.status !== 'CANCELLED',
                );

                return (
                  <button
                    key={key}
                    type="button"
                    role="gridcell"
                    className={`cal-day${isToday ? ' is-today' : ''}${isSelected ? ' is-selected' : ''}${dayEvents.length > 0 ? ' has-events' : ''}`}
                    onClick={() => setSelectedDate(cellDate)}
                  >
                    <span className="cal-day__num">{day}</span>
                    {dayEvents.length > 0 && (
                      <div className="cal-day__dots">
                        {dayEvents.slice(0, 3).map((ev) => (
                          <span
                            key={ev.id}
                            className={`cal-dot${ev.status === 'CANCELLED' ? ' is-cancelled' : ''}${!ev.myVote ? ' needs-vote' : ''}`}
                          />
                        ))}
                        {dayEvents.length > 3 && (
                          <span className="cal-dot-more">
                            +{dayEvents.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                    {hasUnvoted && <span className="cal-day__vote-hint" />}
                  </button>
                );
              })}
            </div>
          </div>

          <section className="cal-day-panel">
            <h3 className="cal-day-panel__title">
              {selectedDate
                ? selectedDate.toLocaleDateString('ko-KR', {
                    month: 'long',
                    day: 'numeric',
                    weekday: 'short',
                  })
                : '날짜를 선택해 주세요'}
            </h3>

            {selectedDate && selectedEvents.length === 0 && (
              <p className="empty-inline">이 날짜에 이벤트가 없어요.</p>
            )}

            {selectedEvents.length > 0 && (
              <div className="cal-day-events">
                {selectedEvents.map(renderMonthEventChip)}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
