import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { api, API_BASE } from '../api';
import { useAuth } from '../context/AuthContext';
import GroupAvatar from '../components/GroupAvatar';
import './Chat.css';

import { useSearchParams } from 'react-router-dom';

interface MessagePayload {
  id: string;
  groupId: string;
  userId: string;
  message: string;
  sentAt: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  user: {
    id: string;
    displayName: string;
    profileImageUrl: string | null;
  };
}

export default function Chat() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const queryGroupId = searchParams.get('groupId');
  const [groups, setGroups] = useState<any[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(queryGroupId);

  useEffect(() => {
    if (queryGroupId) {
      setActiveGroupId(queryGroupId);
    }
  }, [queryGroupId]);
  const [messages, setMessages] = useState<MessagePayload[]>([]);
  const [inputText, setInputText] = useState('');
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingChats, setLoadingChats] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Load my groups
  useEffect(() => {
    api.myGroups()
      .then((res) => {
        setGroups(res);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoadingRooms(false));
  }, []);

  const activeGroup = groups.find(g => g.id === activeGroupId);

  // 2. Load history & establish Socket connection when room changes
  useEffect(() => {
    if (!activeGroupId || !user) {
      setMessages([]);
      return;
    }

    setLoadingChats(true);
    // Load existing messages via REST API
    api.getChatHistory(activeGroupId, 100)
      .then((res) => {
        setMessages(res.reverse()); // old messages first
        scrollToBottom();
      })
      .catch((err) => console.error(err))
      .finally(() => setLoadingChats(false));

    // Connect socket
    const token = localStorage.getItem('token') || '';
    const socket = io(API_BASE, {
      query: { token },
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('joinRoom', { groupId: activeGroupId });
    });

    socket.on('newMessage', (msg: MessagePayload) => {
      if (msg.groupId === activeGroupId) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    return () => {
      if (socket) {
        socket.emit('leaveRoom', { groupId: activeGroupId });
        socket.disconnect();
      }
      socketRef.current = null;
    };
  }, [activeGroupId, user]);

  // 3. Scroll to bottom whenever messages update
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  };

  // 4. Send Message via Socket
  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || !activeGroupId || !socketRef.current) return;

    socketRef.current.emit('sendMessage', {
      groupId: activeGroupId,
      message: text,
    });
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) {
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeGroupId || !socketRef.current) return;

    setUploading(true);
    try {
      const res = await api.uploadGalleryFile(file);
      if (res.fileType === 'IMAGE') {
        socketRef.current.emit('sendMessage', {
          groupId: activeGroupId,
          message: '',
          imageUrl: res.url,
        });
      } else if (res.fileType === 'VIDEO') {
        socketRef.current.emit('sendMessage', {
          groupId: activeGroupId,
          message: '',
          videoUrl: res.url,
        });
      }
    } catch (err) {
      console.error(err);
      alert('파일 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleAddEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  const formatMessageTime = (isoString: string) => {
    const d = new Date(isoString);
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? '오후' : '오전';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${ampm} ${hours}:${minutes}`;
  };

  if (loadingRooms) {
    return <div className="chat-loading">채팅방 목록을 불러오는 중…</div>;
  }

  return (
    <div className="chat-container">
      {!activeGroupId ? (
        // Room List View
        <div className="chat-rooms-list">
          <h1 className="chat-rooms-header">채팅</h1>
          <div className="chat-ad-banner">
            <span className="chat-ad-badge">AD</span>
            <span className="chat-ad-text">🎾 테니스 라켓 특별 기획전! 초특가 30% 할인 중 🛍️</span>
          </div>
          {groups.length === 0 ? (
            <div className="chat-empty">
              <p>가입한 모임이 없습니다.</p>
            </div>
          ) : (
            <div className="chat-rooms-grid">
              {groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => setActiveGroupId(group.id)}
                  className="chat-room-card"
                >
                  <GroupAvatar
                    src={group.profileImageUrl}
                    name={group.name}
                    size={48}
                    radius={14}
                  />
                  <div className="chat-room-card__info">
                    <span className="chat-room-card__title">{group.name}</span>
                    <span className="chat-room-card__desc">
                      {group.description || '대화를 시작해 보세요!'}
                    </span>
                  </div>
                  <span className="chat-room-card__arrow">▶</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        // Chat Window View
        <div className="chat-room-window">
          <header className="chat-room-header">
            <button
              onClick={() => setActiveGroupId(null)}
              className="chat-back-btn"
              type="button"
            >
              ◀
            </button>
            {activeGroup && (
              <GroupAvatar
                src={activeGroup.profileImageUrl}
                name={activeGroup.name}
                size={36}
                radius={10}
              />
            )}
            <div className="chat-room-title-info">
              <span className="chat-room-name">{activeGroup?.name}</span>
              <span className="chat-room-members">멤버 {activeGroup?.memberCount}명</span>
            </div>
          </header>

          <div className="chat-room-notice-banner">
            <span className="chat-room-notice-badge">공지</span>
            <span className="chat-room-notice-text">모임 내 상호존중을 지키며 매너있는 대화를 나누어 주세요.</span>
          </div>

          <div className="chat-messages-scroller" ref={scrollerRef}>
            {loadingChats && <p className="chat-loading">채팅 내역을 불러오는 중…</p>}
            {!loadingChats && messages.length === 0 && (
              <p className="chat-empty">아직 메시지가 없습니다. 첫 대화를 나누어 보세요!</p>
            )}
            {messages.map((msg) => {
              const isSelf = msg.userId === user?.id;
              return (
                <div
                  key={msg.id}
                  className={`chat-message-bubble${isSelf ? ' chat-message-bubble--self' : ''}`}
                >
                  {!isSelf && (
                    msg.user.profileImageUrl ? (
                      <img
                        src={msg.user.profileImageUrl}
                        alt=""
                        className="chat-bubble-avatar"
                        style={{ borderRadius: '8px' }}
                      />
                    ) : (
                      <div className="chat-bubble-fallback" style={{ borderRadius: '8px' }}>
                        {msg.user.displayName[0]}
                      </div>
                    )
                  )}

                  <div className="chat-message-content">
                    {!isSelf && (
                      <span className="chat-sender-name">{msg.user.displayName}</span>
                    )}
                    <div className="chat-text-wrapper">
                      <div className="chat-text-box">
                        {msg.imageUrl && (
                          <div className="chat-media-preview">
                            <img
                              src={msg.imageUrl}
                              alt="Uploaded media"
                              className="chat-bubble-media"
                              onClick={() => window.open(msg.imageUrl || '', '_blank')}
                            />
                          </div>
                        )}
                        {msg.videoUrl && (
                          <div className="chat-media-preview">
                            <video
                              src={msg.videoUrl}
                              controls
                              className="chat-bubble-media"
                            />
                          </div>
                        )}
                        {msg.message && <div className="chat-bubble-text">{msg.message}</div>}
                      </div>
                      <span className="chat-message-time">
                        {formatMessageTime(msg.sentAt)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {uploading && (
            <div className="chat-uploading-banner">
              <span>파일을 업로드하는 중입니다…</span>
            </div>
          )}

          <div className="chat-input-row-container" style={{ position: 'relative' }}>
            {showEmojiPicker && (
              <div className="chat-emoji-picker-container">
                {['😊', '😂', '😍', '👍', '🙌', '👏', '🎉', '🔥', '👀', '🤔', '😢', '😮', '😡', '💖', '💔', '💩', '🌟', '💡', '💯', '📌', '🌈', '🎂', '😭', '🙏'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="chat-emoji-picker-btn"
                    onClick={() => handleAddEmoji(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept="image/*,video/*"
              onChange={handleFileUpload}
            />
            <div className="chat-input-left-tools">
              <button type="button" className="chat-tool-icon-btn" title="추가" onClick={() => fileInputRef.current?.click()}>➕</button>
              <button type="button" className="chat-tool-icon-btn" title="카메라" onClick={() => fileInputRef.current?.click()}>📷</button>
              <button type="button" className="chat-tool-icon-btn" title="사진첩" onClick={() => fileInputRef.current?.click()}>🖼️</button>
            </div>
            <form onSubmit={handleSend} className="chat-input-bar-inner">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="메시지를 입력하세요…"
                className="chat-input-field"
                rows={1}
              />
              <div className="chat-input-right-tools">
                <button
                  type="button"
                  className="chat-tool-icon-btn"
                  title="이모티콘"
                  onClick={() => setShowEmojiPicker((prev) => !prev)}
                >
                  😊
                </button>
                <button type="button" className="chat-tool-icon-btn" title="음성">🎤</button>
              </div>
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="chat-send-btn"
              >
                전송
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
