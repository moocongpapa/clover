import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, CATEGORIES } from '../api';
import '../pages/Groups.css';

export default function CreateGroup() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    setError('');
    try {
      const group = await api.createGroup({
        name: fd.get('name') as string,
        description: fd.get('description') as string,
        category: fd.get('category') as string,
        isPublic: fd.get('isPublic') === 'on',
        profileImageUrl: (fd.get('profileImageUrl') as string) || undefined,
      });
      navigate(`/groups/${group.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '생성 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>모임 만들기</h1>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">모임 이름 *</label>
          <input id="name" name="name" required />
        </div>
        <div className="form-group">
          <label htmlFor="description">소개 *</label>
          <textarea id="description" name="description" required />
        </div>
        <div className="form-group">
          <label htmlFor="category">카테고리 *</label>
          <select id="category" name="category" required>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="profileImageUrl">대표 이미지 URL</label>
          <input id="profileImageUrl" name="profileImageUrl" type="url" />
        </div>
        <div className="form-group checkbox-row">
          <input id="isPublic" name="isPublic" type="checkbox" defaultChecked />
          <label htmlFor="isPublic">검색·목록에 공개</label>
        </div>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? '생성 중…' : '모임 만들기'}
        </button>
      </form>
    </div>
  );
}
