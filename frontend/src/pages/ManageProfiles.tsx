import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import { api, type UserProfileCard, type MyGroup } from '../api';
import './ManageProfiles.css';

export default function ManageProfiles() {
  const navigate = useNavigate();
  const [profileCards, setProfileCards] = useState<UserProfileCard[]>([]);
  const [myGroups, setMyGroups] = useState<MyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [newProfileUrl, setNewProfileUrl] = useState('');

  const [isChangeOpen, setIsChangeOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState<{ id: string; name: string } | null>(null);

  // Load cards and groups
  const loadData = async () => {
    try {
      setLoading(true);
      const [cards, groups] = await Promise.all([
        api.getProfileCards(),
        api.myGroups(),
      ]);
      setProfileCards(cards);
      setMyGroups(groups);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터 로드 실패');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Find default card (usually the oldest one)
  const defaultCard = profileCards[0];

  // Group mappings: cardId -> list of group memberships
  const getGroupsForCard = (cardId: string) => {
    return myGroups.filter((g) => {
      // Find membership profileCardId
      const isLinkedToThis = g.myMembership?.profileCardId === cardId;
      // If it's the default card, also include groups with no card link
      const isDefault = cardId === defaultCard?.id;
      const isUnlinked = !g.myMembership?.profileCardId;
      return isLinkedToThis || (isDefault && isUnlinked);
    });
  };

  // Create profile card
  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNickname.trim()) return;
    try {
      setLoading(true);
      await api.createProfileCard({
        nickname: newNickname.trim(),
        profileImageUrl: newProfileUrl.trim() || null,
      });
      setIsCreateOpen(false);
      setNewNickname('');
      setNewProfileUrl('');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '프로필 생성 실패');
    } finally {
      setLoading(false);
    }
  };

  // Open profile change bottom sheet modal
  const openChangeModal = (groupId: string, groupName: string) => {
    setActiveGroup({ id: groupId, name: groupName });
    setIsChangeOpen(true);
  };

  // Link group to card
  const handleLinkCard = async (cardId: string) => {
    if (!activeGroup) return;
    try {
      setLoading(true);
      await api.linkProfileCard(activeGroup.id, cardId);
      setIsChangeOpen(false);
      setActiveGroup(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '프로필 연동 변경 실패');
    } finally {
      setLoading(false);
    }
  };

  if (loading && profileCards.length === 0) {
    return <div className="loading-text">불러오는 중…</div>;
  }

  return (
    <div className="manage-profiles-page">
      {/* Header */}
      <div className="manage-profiles-header">
        <BackButton onClick={() => navigate(-1)} />
        <span className="header-title">프로필 관리</span>
      </div>

      {/* Info Banner Box */}
      <div className="info-banner-box">
        <h3 className="banner-title">같은 프로필을 사용할 밴드를 묶어주세요.</h3>
        <ul className="banner-bullets">
          <li>
            실명으로 활동해야 하는 밴드, 닉네임으로 활동하는 밴드가 있다면 각각 프로필을 만들고
            활동할 밴드를 연결해보세요.
          </li>
          <li>
            같은 프로필을 사용하는 밴드에는 프로필 사진, 이름, 스토리 업데이트가 함께 반영돼요.
          </li>
          <li>각 밴드 우측 버튼을 누르면 밴드에서 사용할 프로필을 변경할 수 있어요.</li>
        </ul>
      </div>

      {/* Action Button */}
      <button className="add-profile-btn" onClick={() => setIsCreateOpen(true)}>
        <span className="plus-icon">+</span> 새 프로필 만들기
      </button>

      {error && <p className="error-message">{error}</p>}

      {/* Profile Cards & Connected Bands List */}
      <div className="profile-cards-list">
        {profileCards.map((card, idx) => {
          const connectedGroups = getGroupsForCard(card.id);
          const isDefault = idx === 0;
          return (
            <div key={card.id} className="profile-card-group">
              {/* Card Title Card */}
              <div className="profile-card-summary">
                {card.profileImageUrl ? (
                  <img src={card.profileImageUrl} alt="" className="summary-avatar" />
                ) : (
                  <div className="summary-avatar-fallback">{card.nickname[0]}</div>
                )}
                <div className="summary-info">
                  <div className="summary-nickname-row">
                    <span className="summary-nickname">{card.nickname}</span>
                    {isDefault && <span className="default-badge">기본 프로필</span>}
                  </div>
                  <div className="summary-meta">
                    프로필 사진 {card.profileImageUrl ? 1 : 0} · 연결된 모임 {connectedGroups.length}
                  </div>
                </div>
              </div>

              {/* Connected Groups List */}
              {connectedGroups.length > 0 ? (
                <div className="connected-groups-list">
                  {connectedGroups.map((g) => (
                    <div key={g.id} className="connected-group-item">
                      {g.profileImageUrl ? (
                        <img src={g.profileImageUrl} alt="" className="group-logo" />
                      ) : (
                        <div className="group-logo-fallback">{g.name[0]}</div>
                      )}
                      <span className="group-name">{g.name}</span>
                      <button
                        className="change-connection-btn"
                        onClick={() => openChangeModal(g.id, g.name)}
                      >
                        변경
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-groups-hint">연결된 모임이 없습니다.</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal 1: Create Profile Card */}
      {isCreateOpen && (
        <div className="profile-modal-overlay" onClick={() => setIsCreateOpen(false)}>
          <div className="profile-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">새 프로필 만들기</h3>
            <form onSubmit={handleCreateCard}>
              <div className="form-group">
                <label>프로필 이름 (닉네임)</label>
                <input
                  type="text"
                  required
                  placeholder="예: 91/김완석, 듀기"
                  value={newNickname}
                  onChange={(e) => setNewNickname(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>프로필 이미지 URL (선택)</label>
                <input
                  type="url"
                  placeholder="https://example.com/avatar.jpg"
                  value={newProfileUrl}
                  onChange={(e) => setNewProfileUrl(e.target.value)}
                />
              </div>
              <div className="modal-actions-row">
                <button
                  type="button"
                  className="modal-cancel-btn"
                  onClick={() => setIsCreateOpen(false)}
                >
                  취소
                </button>
                <button type="submit" className="modal-submit-btn">
                  만들기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Change Profile Connection (Bottom Sheet / Modal) */}
      {isChangeOpen && activeGroup && (
        <div className="profile-modal-overlay" onClick={() => setIsChangeOpen(false)}>
          <div className="profile-modal-content bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">
              <span className="highlight">"{activeGroup.name}"</span>에서 사용할 프로필을
              선택해주세요.
            </h3>
            <div className="profile-picker-list">
              {profileCards.map((card) => (
                <div
                  key={card.id}
                  className="profile-picker-item"
                  onClick={() => handleLinkCard(card.id)}
                >
                  {card.profileImageUrl ? (
                    <img src={card.profileImageUrl} alt="" className="picker-avatar" />
                  ) : (
                    <div className="picker-avatar-fallback">{card.nickname[0]}</div>
                  )}
                  <span className="picker-nickname">{card.nickname}</span>
                </div>
              ))}
            </div>
            <button className="bottom-sheet-close-btn" onClick={() => setIsChangeOpen(false)}>
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
