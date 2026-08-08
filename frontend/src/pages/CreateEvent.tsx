import { type FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { api, type Event } from '../api';
import BackButton from '../components/BackButton';
import '../pages/Groups.css';

function getTomorrowDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function getNextSaturdayDate() {
  const d = new Date();
  const day = d.getDay();
  const diff = (6 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

function getNextSundayDate() {
  const d = new Date();
  const day = d.getDay();
  const diff = (7 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

export default function CreateEvent() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pastEvents, setPastEvents] = useState<Event[]>([]);
  const [showPastDropdown, setShowPastDropdown] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(getTomorrowDate());
  const [startTime, setStartTime] = useState('19:00');
  const [endTime, setEndTime] = useState('21:00');
  const [eventLocation, setEventLocation] = useState('');
  const [description, setDescription] = useState('');

  // Reminder offsets checklist (defaults to 24 and 1)
  const [selectedOffsets, setSelectedOffsets] = useState<number[]>([24, 1]);

  const offsetOptions = [
    { label: '48시간 전', value: 48 },
    { label: '24시간 전 (추천)', value: 24 },
    { label: '12시간 전', value: 12 },
    { label: '6시간 전', value: 6 },
    { label: '3시간 전', value: 3 },
    { label: '1시간 전', value: 1 },
  ];

  const quickTitles = ['정기 운동/매치', '정기 모임', '회식/뒤풀이', '번개 모임'];

  const handleOffsetToggle = (val: number) => {
    setSelectedOffsets((prev) =>
      prev.includes(val) ? prev.filter((o) => o !== val) : [...prev, val],
    );
  };

  useEffect(() => {
    if (!groupId) return;

    const query = new URLSearchParams(location.search);
    const isClone = query.get('clone') === 'true';

    api
      .listEvents(groupId)
      .then((events) => {
        const sorted = [...events].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
        setPastEvents(sorted);
      })
      .catch(() => setPastEvents([]));

    if (isClone) {
      api.getLatestEventTemplate(groupId)
        .then((template) => {
          if (template) {
            setTitle(template.title);
            setStartTime(template.startTime);
            setEndTime(template.endTime || '');
            setEventLocation(template.location);
            setDescription(template.description);
            if (template.reminderOffsets) {
              setSelectedOffsets(template.reminderOffsets.split(',').map(Number));
            }
            setDate(getTomorrowDate());
            setToastMessage('이전 일정 내용을 불러왔습니다. 날짜를 확인해 주세요.');
            setTimeout(() => setToastMessage(''), 3000);
          }
        })
        .catch(() => {});
    }
  }, [groupId, location.search]);

  const handleSelectPastEvent = (event: Event) => {
    setTitle(event.title);
    setStartTime(event.startTime);
    setEndTime(event.endTime || '');
    setEventLocation(event.location);
    setDescription(event.description);
    if (event.reminderOffsets) {
      setSelectedOffsets(event.reminderOffsets.split(',').map(Number));
    }
    setDate(getTomorrowDate());
    setShowPastDropdown(false);
    setToastMessage(`'${event.title}' 일정을 불러왔습니다.`);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const handleSetStartTime = (newStart: string) => {
    setStartTime(newStart);
    // Automatically set end time to start + 2 hours
    const [h, m] = newStart.split(':').map(Number);
    const endH = (h + 2) % 24;
    setEndTime(`${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!groupId) return;

    if (!title.trim()) {
      setError('일정 제목을 입력해주세요.');
      return;
    }

    if (!date) {
      setError('날짜를 선택해주세요.');
      return;
    }

    if (endTime && endTime <= startTime) {
      setError('종료 시간은 시작 시간보다 뒤여야 합니다.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const event = await api.createEvent(groupId, {
        title: title.trim(),
        date,
        startTime,
        ...(endTime ? { endTime } : {}),
        location: eventLocation.trim() || '미정',
        description: description.trim() || '일정에 참석 여부를 투표해 주세요!',
        reminderOffsets: selectedOffsets.join(','),
      });
      navigate(`/events/${event.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '등록 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '12px 16px 40px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <BackButton />
        <h1 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--ink-dark)' }}>일정 등록</h1>
      </div>

      {toastMessage && (
        <div style={{
          marginBottom: '14px',
          padding: '12px 16px',
          background: '#e8f8f0',
          border: '1px solid #10b981',
          borderRadius: '12px',
          color: '#065f46',
          fontSize: '13px',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>🍀</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Past Event Quick Import Bar */}
      {pastEvents.length > 0 && (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '14px',
          padding: '12px 14px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--ink-dark)', fontWeight: '600' }}>
            <span>💡</span>
            <span>지난 일정을 그대로 불러올까요?</span>
          </div>
          <button
            type="button"
            onClick={() => setShowPastDropdown(!showPastDropdown)}
            style={{
              padding: '6px 12px',
              background: 'var(--grey-100)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '700',
              color: 'var(--brand-primary)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {showPastDropdown ? '닫기 ▲' : '불러오기 ▼'}
          </button>
        </div>
      )}

      {/* Past Events Dropdown Card */}
      {showPastDropdown && pastEvents.length > 0 && (
        <div style={{
          background: 'var(--surface)',
          border: '1.5px solid var(--brand-primary)',
          borderRadius: '14px',
          padding: '12px',
          marginBottom: '16px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.06)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--ink-muted)', marginBottom: '8px' }}>
            최근 일정 선택 (내용 자동 입력)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
            {pastEvents.slice(0, 5).map((ev) => (
              <button
                key={ev.id}
                type="button"
                onClick={() => handleSelectPastEvent(ev)}
                style={{
                  textAlign: 'left',
                  padding: '10px 12px',
                  background: 'var(--grey-50)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--ink-dark)' }}>{ev.title}</div>
                <div style={{ fontSize: '12px', color: 'var(--ink-muted)', marginTop: '2px' }}>
                  {ev.location} · {ev.startTime}{ev.endTime ? `~${ev.endTime}` : ''}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Card 1: Title & Date & Time */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '18px',
          padding: '20px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
        }}>
          {/* Title */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--ink-dark)', marginBottom: '6px' }}>
              일정 제목 <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 이번 주 정기 풋살 매치"
              required
              style={{
                width: '100%',
                height: '46px',
                padding: '0 14px',
                background: 'var(--grey-50)',
                border: '1.5px solid var(--border)',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: '600',
                color: 'var(--ink-dark)',
                outline: 'none'
              }}
            />
            {/* Quick title presets */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
              {quickTitles.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTitle(t)}
                  style={{
                    padding: '4px 10px',
                    background: 'var(--grey-100)',
                    border: 'none',
                    borderRadius: '999px',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: 'var(--ink-muted)',
                    cursor: 'pointer'
                  }}
                >
                  +{t}
                </button>
              ))}
            </div>
          </div>

          <div style={{ height: '1px', background: 'var(--border-subtle, #f1f5f9)' }} />

          {/* Date */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--ink-dark)' }}>
                날짜 <span style={{ color: '#ef4444' }}>*</span>
              </label>
              {/* Quick Date Presets */}
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => setDate(getTomorrowDate())}
                  style={{
                    padding: '3px 8px',
                    background: date === getTomorrowDate() ? 'rgba(16, 185, 129, 0.15)' : 'var(--grey-100)',
                    color: date === getTomorrowDate() ? '#10b981' : 'var(--ink-muted)',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  내일
                </button>
                <button
                  type="button"
                  onClick={() => setDate(getNextSaturdayDate())}
                  style={{
                    padding: '3px 8px',
                    background: date === getNextSaturdayDate() ? 'rgba(16, 185, 129, 0.15)' : 'var(--grey-100)',
                    color: date === getNextSaturdayDate() ? '#10b981' : 'var(--ink-muted)',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  이번 주 토
                </button>
                <button
                  type="button"
                  onClick={() => setDate(getNextSundayDate())}
                  style={{
                    padding: '3px 8px',
                    background: date === getNextSundayDate() ? 'rgba(16, 185, 129, 0.15)' : 'var(--grey-100)',
                    color: date === getNextSundayDate() ? '#10b981' : 'var(--ink-muted)',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  이번 주 일
                </button>
              </div>
            </div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              style={{
                width: '100%',
                height: '46px',
                padding: '0 14px',
                background: 'var(--grey-50)',
                border: '1.5px solid var(--border)',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: '600',
                color: 'var(--ink-dark)',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ height: '1px', background: 'var(--border-subtle, #f1f5f9)' }} />

          {/* Time (Start & End) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--ink-dark)', marginBottom: '6px' }}>
                시작 시간 <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => handleSetStartTime(e.target.value)}
                required
                style={{
                  width: '100%',
                  height: '46px',
                  padding: '0 10px',
                  background: 'var(--grey-50)',
                  border: '1.5px solid var(--border)',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: '600',
                  color: 'var(--ink-dark)',
                  outline: 'none'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--ink-dark)', marginBottom: '6px' }}>
                종료 시간
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                style={{
                  width: '100%',
                  height: '46px',
                  padding: '0 10px',
                  background: 'var(--grey-50)',
                  border: '1.5px solid var(--border)',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: '600',
                  color: 'var(--ink-dark)',
                  outline: 'none'
                }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Location & Description */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '18px',
          padding: '20px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
        }}>
          {/* Location */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--ink-dark)', marginBottom: '6px' }}>
              장소 <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              value={eventLocation}
              onChange={(e) => setEventLocation(e.target.value)}
              placeholder="예: 펜타시티 풋살파크 A구장"
              required
              style={{
                width: '100%',
                height: '46px',
                padding: '0 14px',
                background: 'var(--grey-50)',
                border: '1.5px solid var(--border)',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: '600',
                color: 'var(--ink-dark)',
                outline: 'none'
              }}
            />
            {/* Quick location presets */}
            <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setEventLocation('온라인 (Zoom / 디스코드)')}
                style={{
                  padding: '4px 10px',
                  background: 'var(--grey-100)',
                  border: 'none',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: 'var(--ink-muted)',
                  cursor: 'pointer'
                }}
              >
                +온라인 모임
              </button>
              <button
                type="button"
                onClick={() => setEventLocation('미정 (추후 공지)')}
                style={{
                  padding: '4px 10px',
                  background: 'var(--grey-100)',
                  border: 'none',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: 'var(--ink-muted)',
                  cursor: 'pointer'
                }}
              >
                +미정
              </button>
            </div>
          </div>

          <div style={{ height: '1px', background: 'var(--border-subtle, #f1f5f9)' }} />

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--ink-dark)', marginBottom: '6px' }}>
              상세 설명 및 준비물
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="준비물, 회비, 주차 안내 등 전달할 내용을 적어주세요."
              style={{
                width: '100%',
                padding: '12px 14px',
                background: 'var(--grey-50)',
                border: '1.5px solid var(--border)',
                borderRadius: '12px',
                fontSize: '14px',
                color: 'var(--ink-dark)',
                outline: 'none',
                resize: 'vertical',
                minHeight: '80px',
                lineHeight: '1.5',
                fontFamily: 'inherit'
              }}
            />
          </div>
        </div>

        {/* Card 3: Kakao Reminder Settings (Selectable Pill Chips) */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '18px',
          padding: '20px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '800', color: 'var(--ink-dark)' }}>
              <span>💬</span>
              <span>카카오톡 투표 독려 리마인더</span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--ink-muted)', margin: '4px 0 0 0' }}>
              미투표 회원에게만 선택한 시간에 자동으로 카카오톡 알림을 발송합니다.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '4px' }}>
            {offsetOptions.map((opt) => {
              const active = selectedOffsets.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleOffsetToggle(opt.value)}
                  style={{
                    height: '42px',
                    padding: '0 8px',
                    background: active ? 'rgba(16, 185, 129, 0.12)' : 'var(--grey-50)',
                    border: `1.5px solid ${active ? '#10b981' : 'var(--border)'}`,
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: active ? '800' : '600',
                    color: active ? '#10b981' : 'var(--ink-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {active && <span>✓</span>}
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div style={{
            padding: '12px 14px',
            background: '#fee2e2',
            border: '1px solid #ef4444',
            borderRadius: '12px',
            color: '#b91c1c',
            fontSize: '13px',
            fontWeight: '700'
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Bottom Actions */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              flex: 1,
              height: '52px',
              background: 'var(--surface)',
              border: '1.5px solid var(--border)',
              borderRadius: '14px',
              fontSize: '16px',
              fontWeight: '700',
              color: 'var(--ink-muted)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{
              flex: 2,
              height: '52px',
              backgroundColor: '#10b981',
              color: '#ffffff',
              border: 'none',
              borderRadius: '14px',
              fontSize: '17px',
              fontWeight: '800',
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)',
              transition: 'all 0.15s ease'
            }}
          >
            {loading ? '등록 중…' : '일정 등록하기 🍀'}
          </button>
        </div>
      </form>
    </div>
  );
}
