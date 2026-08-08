import { type FormEvent, useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import BackButton from '../components/BackButton';
import '../pages/Groups.css';

// 30-minute interval time options from 00:00 to 23:30
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const min = i % 2 === 0 ? '00' : '30';
  const val = `${String(hour).padStart(2, '0')}:${min}`;
  const period = hour < 12 ? '오전' : '오후';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const label = `${period} ${String(displayHour).padStart(2, '0')}:${min}`;
  return { val, label };
});

function formatDateWithDay(dateStr: string) {
  if (!dateStr) return '날짜를 선택해 주세요';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return `${parts[0]}년 ${parts[1]}월 ${parts[2]}일 (${days[d.getDay()]})`;
  }
  return dateStr;
}

export default function EditEvent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dateInputRef = useRef<HTMLInputElement>(null);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('19:00');
  const [endTime, setEndTime] = useState('21:00');
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

  const quickTimePresets = [
    { label: '저녁 7:30 ~ 10:00 (추천)', start: '19:30', end: '22:00' },
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

  const handleStartTimeChange = (newStart: string) => {
    setStartTime(newStart);
  };

  const handleAddHours = (hoursToAdd: number) => {
    if (!startTime) return;
    const [h, m] = startTime.split(':').map(Number);
    const endH = (h + hoursToAdd) % 24;
    setEndTime(`${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  };

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
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--ink-dark)', marginBottom: '8px' }}>
              일자 (날짜) <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div
              onClick={() => dateInputRef.current?.showPicker?.()}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                height: '48px',
                padding: '0 14px',
                background: 'var(--grey-50)',
                border: '1.5px solid var(--border)',
                borderRadius: '12px',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--ink-dark)' }}>
                {formatDateWithDay(date)}
              </span>
              <span style={{ fontSize: '18px' }}>📅</span>
              <input
                ref={dateInputRef}
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
              />
            </div>
          </div>

          <div style={{ height: '1px', background: 'var(--border-subtle, #f1f5f9)' }} />

          {/* Time (30-Minute Step Selector & Quick Presets) */}
          <div>
            <div style={{ marginBottom: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--ink-dark)' }}>
                시간 (30분 단위) <span style={{ color: '#ef4444' }}>*</span>
              </label>
            </div>

            {/* Quick Time Presets */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
              {quickTimePresets.map((p) => {
                const isSelected = startTime === p.start && endTime === p.end;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setStartTime(p.start);
                      setEndTime(p.end);
                    }}
                    style={{
                      padding: '4px 10px',
                      background: isSelected ? 'rgba(16, 185, 129, 0.15)' : 'var(--grey-100)',
                      color: isSelected ? '#10b981' : 'var(--ink-muted)',
                      border: `1px solid ${isSelected ? '#10b981' : 'transparent'}`,
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* 30-Minute Dropdown Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '8px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--ink-muted)', display: 'block', marginBottom: '4px' }}>
                  시작 시간
                </span>
                <select
                  value={startTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    height: '48px',
                    padding: '0 10px',
                    background: 'var(--grey-50)',
                    border: '1.5px solid var(--border)',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: '700',
                    color: 'var(--ink-dark)',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {TIME_OPTIONS.map((opt) => (
                    <option key={opt.val} value={opt.val}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <span style={{ fontSize: '16px', color: 'var(--ink-muted)', fontWeight: 'bold', paddingTop: '16px' }}>
                ~
              </span>

              <div>
                <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--ink-muted)', display: 'block', marginBottom: '4px' }}>
                  종료 시간
                </span>
                <select
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  style={{
                    width: '100%',
                    height: '48px',
                    padding: '0 10px',
                    background: 'var(--grey-50)',
                    border: '1.5px solid var(--border)',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: '700',
                    color: 'var(--ink-dark)',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">미정 (종료 시간 없음)</option>
                  {TIME_OPTIONS.map((opt) => (
                    <option key={opt.val} value={opt.val}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Duration Add Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px' }}>
              <span style={{ fontSize: '11px', color: 'var(--ink-muted)', fontWeight: '600' }}>빠른 종료시간 설정:</span>
              {[1, 2, 3, 4].map((hours) => (
                <button
                  key={hours}
                  type="button"
                  onClick={() => handleAddHours(hours)}
                  style={{
                    padding: '3px 8px',
                    background: 'var(--grey-100)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: '700',
                    color: 'var(--ink-muted)',
                    cursor: 'pointer'
                  }}
                >
                  +{hours}시간
                </button>
              ))}
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
