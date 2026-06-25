import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, type Event } from '../api';
import { getEventTitleSuggestions } from '../utils/eventTitleSuggestions';
import '../pages/Groups.css';

function tomorrowDate() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

function formatPastEventLabel(event: Event) {
  const date = new Date(event.date).toLocaleDateString('ko-KR');
  return `${event.title} (${date})`;
}

export default function CreateEvent() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pastEvents, setPastEvents] = useState<Event[]>([]);
  const [copySourceId, setCopySourceId] = useState('');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(tomorrowDate());
  const [startTime, setStartTime] = useState('19:00');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [groupCategory, setGroupCategory] = useState('기타');

  useEffect(() => {
    if (!groupId) return;
    api
      .getGroup(groupId)
      .then((group) => setGroupCategory(group.category))
      .catch(() => setGroupCategory('기타'));
    api
      .listEvents(groupId)
      .then((events) => {
        const sorted = [...events].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
        setPastEvents(sorted);
      })
      .catch(() => setPastEvents([]));
  }, [groupId]);

  const handleCopyFromPast = () => {
    const source = pastEvents.find((event) => event.id === copySourceId);
    if (!source) return;
    setTitle(source.title);
    setLocation(source.location);
    setDescription(source.description);
    setError('');
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!groupId) return;

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
        location,
        description,
      });
      navigate(`/events/${event.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '등록 실패');
    } finally {
      setLoading(false);
    }
  };

  const hasPastEvents = pastEvents.length > 0;
  const copyHint = useMemo(() => {
    if (!hasPastEvents) return '이 모임에 등록된 이전 일정이 없습니다.';
    return '제목, 장소, 설명만 가져옵니다. 날짜와 시간은 직접 입력해 주세요.';
  }, [hasPastEvents]);

  const titleSuggestions = useMemo(
    () => getEventTitleSuggestions(groupCategory, title),
    [groupCategory, title],
  );

  return (
    <div>
      <form className="form-card" onSubmit={handleSubmit}>
        <section className="form-copy-box">
          <div className="form-copy-box__header">
            <strong>이전 일정에서 불러오기</strong>
            <span className="form-copy-box__hint">{copyHint}</span>
          </div>
          <div className="form-copy-box__row">
            <select
              className="role-select form-copy-box__select"
              value={copySourceId}
              onChange={(e) => setCopySourceId(e.target.value)}
              disabled={!hasPastEvents}
            >
              <option value="">일정 선택</option>
              {pastEvents.map((event) => (
                <option key={event.id} value={event.id}>
                  {formatPastEventLabel(event)}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn-sm btn-outline"
              disabled={!copySourceId}
              onClick={handleCopyFromPast}
            >
              불러오기
            </button>
          </div>
        </section>

        <div className="form-group">
          <label htmlFor="title">제목 *</label>
          <input
            id="title"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 풋살, 독서 토론, React 스터디"
            required
          />
          {titleSuggestions.length > 0 && (
            <div className="title-suggestions" role="listbox" aria-label="제목 추천">
              <span className="title-suggestions__label">추천 제목</span>
              <div className="title-suggestions__list">
                {titleSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="title-suggestions__item"
                    onClick={() => setTitle(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
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
            value={location}
            onChange={(e) => setLocation(e.target.value)}
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
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? '등록 중…' : '이벤트 등록'}
        </button>
      </form>
    </div>
  );
}
