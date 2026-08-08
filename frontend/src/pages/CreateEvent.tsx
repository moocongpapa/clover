import { type FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { api, type Event } from '../api';
import '../pages/Groups.css';

function tomorrowDate() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
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
  const [date, setDate] = useState(tomorrowDate());
  const [startTime, setStartTime] = useState('19:00');
  const [endTime, setEndTime] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [description, setDescription] = useState('');

  // Reminder offsets checklist (defaults to 24 and 1)
  const [selectedOffsets, setSelectedOffsets] = useState<number[]>([24, 1]);

  const offsetOptions = [
    { label: '48시간 전', value: 48 },
    { label: '24시간 전', value: 24 },
    { label: '12시간 전', value: 12 },
    { label: '6시간 전', value: 6 },
    { label: '3시간 전', value: 3 },
    { label: '1시간 전', value: 1 },
  ];

  const handleOffsetToggle = (val: number) => {
    setSelectedOffsets((prev) =>
      prev.includes(val) ? prev.filter((o) => o !== val) : [...prev, val],
    );
  };

  useEffect(() => {
    if (!groupId) return;

    // Check if clone parameter is set
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
            setDate(''); // User must pick date
            setToastMessage('가져온 일정의 날짜(월/일)를 선택해주세요.');
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
    setDate('');

    setToastMessage('일자를 선택하세요');
    setShowPastDropdown(false);
    
    setTimeout(() => {
      setToastMessage('');
    }, 2500);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!groupId) return;

    if (!date) {
      setError('날짜를 입력해주세요.');
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
        title,
        date,
        startTime,
        ...(endTime ? { endTime } : {}),
        location: eventLocation,
        description,
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
    <div>
      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-group" style={{ position: 'relative' }}>
          <label htmlFor="title">제목 *</label>
          <input
            id="title"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onFocus={() => setShowPastDropdown(true)}
            onBlur={() => {
              setTimeout(() => setShowPastDropdown(false), 200);
            }}
            placeholder="예: 풋살, 독서 토론, React 스터디"
            required
            autoComplete="off"
          />
          
          {showPastDropdown && pastEvents.length > 0 && (
            <div className="past-events-dropdown">
              <div className="past-events-dropdown__header">최근 등록한 일정에서 가져오기 (최대 10개)</div>
              <ul className="past-events-dropdown__list">
                {pastEvents.slice(0, 10).map((event) => (
                  <li
                    key={event.id}
                    className="past-events-dropdown__item"
                    onMouseDown={() => handleSelectPastEvent(event)}
                  >
                    <div className="past-event-item__title">{event.title}</div>
                    <div className="past-event-item__meta">
                      {event.location} • {event.startTime}{event.endTime ? `~${event.endTime}` : ''}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="form-row form-row--triple">
          <div className="form-group form-group--date">
            <label htmlFor="date">시작 날짜 *</label>
            <input
              id="date"
              name="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div className="form-group form-group--time">
            <label htmlFor="startTime">시작 시간 *</label>
            <input
              id="startTime"
              name="startTime"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>
          <div className="form-group form-group--time">
            <label htmlFor="endTime">끝나는 시간</label>
            <input
              id="endTime"
              name="endTime"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="location">장소 *</label>
          <input
            id="location"
            name="location"
            value={eventLocation}
            onChange={(e) => setEventLocation(e.target.value)}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="description">설명 *</label>
          <textarea
            id="description"
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        {/* Customizable reminder offsets checkboxes */}
        <div className="form-group">
          <label>카카오톡 투표 독려 리마인더 시간 설정</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '6px' }}>
            {offsetOptions.map((opt) => {
              const checked = selectedOffsets.includes(opt.value);
              return (
                <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleOffsetToggle(opt.value)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <span>{opt.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        {error && <p className="form-error">{error}</p>}
        
        <div className="form-actions-centered" style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => navigate(-1)}
            style={{
              flex: 1,
              padding: '12px 18px',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: 700,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--ink-muted)',
              cursor: 'pointer'
            }}
          >
            취소
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{
              flex: 1,
              padding: '12px 18px',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: 700
            }}
          >
            {loading ? '등록 중…' : '등록'}
          </button>
        </div>
      </form>

      {toastMessage && (
        <div className="toast-popup">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
