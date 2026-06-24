import { type FormEvent, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import '../pages/Groups.css';

export default function CreateEvent() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!groupId) return;
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    setError('');
    try {
      const event = await api.createEvent(groupId, {
        title: fd.get('title') as string,
        date: fd.get('date') as string,
        startTime: fd.get('startTime') as string,
        location: fd.get('location') as string,
        description: fd.get('description') as string,
      });
      navigate(`/events/${event.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '등록 실패');
    } finally {
      setLoading(false);
    }
  };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toISOString().split('T')[0];

  return (
    <div>
      <div className="page-header">
        <h1>이벤트 등록</h1>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">제목 *</label>
          <input id="title" name="title" required />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="date">날짜 *</label>
            <input
              id="date"
              name="date"
              type="date"
              defaultValue={defaultDate}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="startTime">시간 *</label>
            <input
              id="startTime"
              name="startTime"
              type="time"
              defaultValue="19:00"
              required
            />
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="location">장소 *</label>
          <input id="location" name="location" required />
        </div>
        <div className="form-group">
          <label htmlFor="description">설명 *</label>
          <textarea id="description" name="description" required />
        </div>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? '등록 중…' : '이벤트 등록'}
        </button>
      </form>
    </div>
  );
}
