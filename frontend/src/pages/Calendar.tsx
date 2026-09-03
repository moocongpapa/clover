import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type CalendarEvent } from '../api';
import EventCard from '../components/EventCard';
import './Home.css';
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

function getCategoryDotColor(category?: string): string {
  switch (category) {
    case '풋살/축구': return '#10b981';
    case '농구': return '#f97316';
    case '야구': return '#3b82f6';
    case '러닝': return '#06b6d4';
    case '테니스': return '#84cc16';
    case '탁구': return '#ec4899';
    case '배드민턴': return '#8b5cf6';
    case '볼링': return '#eab308';
    case '골프': return '#14b8a6';
    default: return '#10b981';
  }
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

  const loadEvents = useCallback(() => {
    api
      .getCalendar()
      .then(setEvents)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

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

  return (
    <div className="calendar-page">
      {/* Unified Single-Row Schedule Control Bar (Matching Home.tsx) */}
      <div className="home-schedule-bar" style={{ marginBottom: '16px' }}>
        {viewMode === 'list' ? (
          <div className="home-schedule-subtabs">
            <button
              type="button"
              className={`home-schedule-tab-btn ${listTab === 'upcoming' ? 'is-active' : ''}`}
              onClick={() => setListTab('upcoming')}
            >
              진행 중 일정{upcoming.length > 0 ? ` (${upcoming.length})` : ''}
            </button>
            <button
              type="button"
              className={`home-schedule-tab-btn ${listTab === 'past' ? 'is-active' : ''}`}
              onClick={() => setListTab('past')}
            >
              지난 일정{past.length > 0 ? ` (${past.length})` : ''}
            </button>
          </div>
        ) : (
          <div className="home-schedule-subtabs">
            <h2 className="home-section__title" style={{ margin: 0, fontSize: '14.5px', color: 'var(--ink-dark)' }}>
              {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
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
            className={`home-view-toggle-item ${viewMode === 'month' ? 'is-active' : ''}`}
            onClick={() => setViewMode('month')}
            title="캘린더 보기"
          >
            📅 캘린더
          </button>
        </div>
      </div>

      {loading ? (
        <div className="home-event-list" style={{ marginTop: '16px' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton-card" style={{ marginBottom: '10px' }}>
              <div className="skeleton-pulse skeleton-avatar" style={{ width: '48px', height: '48px', borderRadius: '12px' }} />
              <div className="skeleton-content">
                <div className="skeleton-pulse skeleton-line skeleton-line--title" style={{ width: '45%' }} />
                <div className="skeleton-pulse skeleton-line skeleton-line--desc" style={{ width: '75%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="empty-state">
          <p>예정된 이벤트가 없어요.</p>
          <Link to="/my-groups" className="link-text">내 모임 보기</Link>
        </div>
      ) : viewMode === 'list' ? (
        <>
          {listTab === 'upcoming' ? (
            <section className="cal-section">
              <div className="home-event-list">
                {upcoming.length === 0 ? (
                  <div className="empty-inline-block" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '36px 16px' }}>
                    <p className="empty-inline">예정된 이벤트가 없어요.</p>
                    {past.length > 0 && (
                      <button
                        type="button"
                        className="btn-view-past-events"
                        onClick={() => setListTab('past')}
                        style={{ marginTop: '10px' }}
                      >
                        <span>📜 지난 일정 보기 ({past.length})</span>
                        <span style={{ fontSize: '12px' }}>→</span>
                      </button>
                    )}
                  </div>
                ) : (
                  upcoming.map((ev) => (
                    <EventCard
                      key={ev.id}
                      event={ev}
                      votable={!ev.isPast}
                      onVoted={loadEvents}
                    />
                  ))
                )}
              </div>
            </section>
          ) : (
            <section className="cal-section">
              <div className="home-event-list">
                {past.length === 0 ? (
                  <div className="empty-inline-block" style={{ padding: '36px 16px', textAlign: 'center' }}>
                    <p className="empty-inline">최근 3개월 내 지난 일정이 없어요.</p>
                  </div>
                ) : (
                  past.map((ev) => (
                    <EventCard
                      key={ev.id}
                      event={ev}
                      votable={false}
                      onVoted={loadEvents}
                    />
                  ))
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
                            style={{
                              backgroundColor: ev.status === 'CANCELLED' ? '#94a3b8' : !ev.myVote ? '#f59e0b' : getCategoryDotColor(ev.group.category),
                            }}
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

          <section className="cal-day-panel" style={{ marginTop: '16px' }}>
            <h3 className="cal-day-panel__title" style={{ fontSize: '15px', fontWeight: '800', marginBottom: '12px' }}>
              {selectedDate
                ? selectedDate.toLocaleDateString('ko-KR', {
                    month: 'long',
                    day: 'numeric',
                    weekday: 'short',
                  }) + ' 일정'
                : '날짜를 선택해 주세요'}
            </h3>

            {selectedDate && selectedEvents.length === 0 && (
              <div className="empty-inline-block" style={{ padding: '24px 16px', textAlign: 'center' }}>
                <p className="empty-inline">이 날짜에 이벤트가 없어요.</p>
              </div>
            )}

            {selectedEvents.length > 0 && (
              <div className="home-event-list">
                {selectedEvents.map((ev) => (
                  <EventCard
                    key={ev.id}
                    event={ev}
                    votable={!ev.isPast}
                    onVoted={loadEvents}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
