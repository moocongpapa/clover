import { type FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api, formatEventDate } from '../api';
import '../pages/Groups.css';

export default function EditEvent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('19:00');
  const [endTime, setEndTime] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [description, setDescription] = useState('');

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
    if (!id) return;
    api
      .getEvent(id)
      .then((ev) => {
        setTitle(ev.title);
        setDate(formatEventDate(ev.date));
        setStartTime(ev.startTime);
        setEndTime(ev.endTime || '');
        setEventLocation(ev.location);
        setDescription(ev.description);
        if (ev.reminderOffsets) {
          const parsed = ev.reminderOffsets
            .split(',')
            .map(Number)
            .filter((n) => !isNaN(n));
          setSelectedOffsets(parsed);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : '일정을 불러올 수 없습니다.');
      })
      .finally(() => {
        setFetching(false);
      });
  }, [id]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!id) return;

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
      await api.updateEvent(id, {
        title,
        date,
        startTime,
        ...(endTime ? { endTime } : {}),
        location: eventLocation,
        description,
        reminderOffsets: selectedOffsets.join(','),
      });
      navigate(`/events/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '수정 실패');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <p className="loading-text">일정 정보를 불러오는 중…</p>;
  }

  return (
    <div>
      <div className="event-detail-group-nav" style={{ marginBottom: '16px' }}>
        <Link to={`/events/${id}`} className="group-nav-link">
          <span className="group-nav-arrow">‹</span>
          <span className="group-nav-name">일정 상세로 돌아가기</span>
        </Link>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>
          일정 수정
        </h2>

        <div className="form-group">
          <label htmlFor="title">제목 *</label>
          <input
            id="title"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 풋살, 독서 토론, React 스터디"
            required
            autoComplete="off"
          />
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

        <div className="form-group">
          <label>카카오톡 투표 독려 리마인더 시간 설정</label>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
              marginTop: '6px',
            }}
          >
            {offsetOptions.map((opt) => {
              const checked = selectedOffsets.includes(opt.value);
              return (
                <label
                  key={opt.value}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
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

        <div className="form-actions-centered">
          <button
            type="submit"
            className="btn-primary btn-submit-centered"
            disabled={loading}
          >
            {loading ? '수정 중…' : '일정 수정 저장'}
          </button>
        </div>
      </form>
    </div>
  );
}
