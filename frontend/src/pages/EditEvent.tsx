import { type FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import BackButton from '../components/BackButton';
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
    { label: '24시간 전 (추천)', value: 24 },
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
        // format ISO date string to YYYY-MM-DD for input[type="date"]
        const d = new Date(ev.date);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        setDate(`${y}-${m}-${day}`);
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

    if (!title.trim()) {
      setError('제목을 입력해주세요.');
      return;
    }

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
        title: title.trim(),
        date,
        startTime,
        ...(endTime ? { endTime } : {}),
        location: eventLocation.trim() || '미정',
        description: description.trim(),
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
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '12px 16px 40px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <BackButton />
        <h1 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--ink-dark)' }}>일정 수정</h1>
      </div>

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
          </div>

          <div style={{ height: '1px', background: 'var(--border-subtle, #f1f5f9)' }} />

          {/* Date */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--ink-dark)', marginBottom: '6px' }}>
              날짜 <span style={{ color: '#ef4444' }}>*</span>
            </label>
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
                onChange={(e) => setStartTime(e.target.value)}
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

        {/* Card 3: Kakao Reminder Settings */}
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
            {loading ? '저장 중…' : '수정 완료 ✓'}
          </button>
        </div>
      </form>
    </div>
  );
}
