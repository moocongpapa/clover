import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import './CreateAnnouncement.css';

export default function CreateAnnouncement() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('제목과 내용을 모두 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.createAnnouncement({ title: title.trim(), content: content.trim() });
      navigate('/announcements');
    } catch (err) {
      setError(err instanceof Error ? err.message : '공지사항 등록 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-announcement-page">
      <h1 className="page-title">📢 공지사항 등록</h1>
      
      <form onSubmit={handleSubmit} className="announcement-form form-card">
        <div className="form-group">
          <label htmlFor="announcement-title">제목</label>
          <input
            id="announcement-title"
            type="text"
            placeholder="공지사항 제목을 입력하세요"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="announcement-content">내용</label>
          <textarea
            id="announcement-content"
            placeholder="공지사항 내용을 상세히 작성해주세요"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={10}
            required
          />
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="form-actions">
          <button
            type="button"
            className="btn-ghost"
            onClick={() => navigate(-1)}
            disabled={loading}
          >
            취소
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            {loading ? '등록 중…' : '등록'}
          </button>
        </div>
      </form>
    </div>
  );
}
