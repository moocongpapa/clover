import { uploadToFirebaseStorage } from './firebase';

function resolveApiBase(): string {
  const fromEnv = import.meta.env.VITE_API_URL;
  if (fromEnv) return fromEnv;
  if (typeof window !== 'undefined') {
    if (window.location.hostname.endsWith('vercel.app')) {
      return 'https://clover-backend-vm9k.onrender.com';
    }
    return `${window.location.protocol}//${window.location.hostname}:3000`;
  }
  return 'https://clover-backend-vm9k.onrender.com';
}

export const API_BASE = resolveApiBase();

export interface User {
  id: string;
  displayName: string;
  profileImageUrl: string | null;
  kakaoId?: string;
  gender?: 'MALE' | 'FEMALE' | null;
  birthYear?: number | null;
  birthDate?: string | null;
  isEarlyYear?: boolean;
  phoneNumber?: string | null;
  bio?: string | null;
  role?: string;
  kakaoNotifyEnabled?: boolean;
  pushNotifyEnabled?: boolean;
}

export function isProfileComplete(user?: User | null): boolean {
  if (!user) return false;
  const hasName = Boolean(user.displayName && user.displayName.trim().length > 0);
  const hasBirth = Boolean(user.birthDate || user.birthYear);
  const hasGender = Boolean(user.gender === 'MALE' || user.gender === 'FEMALE');
  const hasPhone = Boolean(user.phoneNumber && user.phoneNumber.trim().length >= 8);
  return hasName && hasBirth && hasGender && hasPhone;
}

export function safeImageUrl(url?: string | null): string | null {
  if (!url) return null;
  return url.replace(/^http:\/\//i, 'https://');
}

export interface UserProfileCard {
  id: string;
  userId: string;
  nickname: string;
  profileImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  memberships: Array<{
    id: string;
    groupId: string;
    group: {
      id: string;
      name: string;
      profileImageUrl: string | null;
    };
  }>;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  authorId: string;
  author: User;
  groupId?: string | null;
  group?: {
    id: string;
    name: string;
    profileImageUrl: string | null;
  } | null;
}

function getToken(): string | null {
  return localStorage.getItem('token');
}

export function setToken(token: string) {
  localStorage.setItem('token', token);
}

export function clearToken() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}

export function setStoredUser(user: User) {
  localStorage.setItem('user', JSON.stringify(user));
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    if (res.status === 401) {
      clearToken();
    }
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `요청 실패 (${res.status})`);
  }

  return res.json();
}

export const api = {
  getKakaoUrl: () => request<{ url: string | null }>('/auth/kakao/url'),
  kakaoCallback: (code: string, redirectUri?: string) =>
    request<AuthResponse>('/auth/kakao/callback', {
      method: 'POST',
      body: JSON.stringify({
        code,
        redirectUri: redirectUri || (typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined),
      }),
    }),
  devLogin: (displayName: string) =>
    request<AuthResponse>('/auth/dev-login', {
      method: 'POST',
      body: JSON.stringify({ displayName }),
    }),
  getMe: () => request<User>('/auth/me'),
  getProfileCards: () => request<UserProfileCard[]>('/auth/me/profile-cards'),
  createProfileCard: (data: { nickname: string; profileImageUrl?: string | null }) =>
    request<UserProfileCard>('/auth/me/profile-cards', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateProfileCard: (id: string, data: { nickname?: string; profileImageUrl?: string | null }) =>
    request<UserProfileCard>(`/auth/me/profile-cards/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteProfileCard: (id: string) =>
    request<{ ok: boolean }>(`/auth/me/profile-cards/${id}`, {
      method: 'DELETE',
    }),
  linkProfileCard: (groupId: string, profileCardId: string | null) =>
    request<any>(`/groups/${groupId}/members/link-profile`, {
      method: 'POST',
      body: JSON.stringify({ profileCardId }),
    }),
  getUser: (id: string) => request<User>(`/auth/users/${id}`),
  listAnnouncements: (groupId?: string) => request<Announcement[]>(groupId ? `/announcements?groupId=${groupId}` : '/announcements'),
  getAnnouncement: (id: string) => request<Announcement>(`/announcements/${id}`),
  createAnnouncement: (data: { title: string; content: string; groupId?: string }) =>
    request<Announcement>('/announcements', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateProfile: (data: {
    displayName?: string;
    profileImageUrl?: string | null;
    bio?: string | null;
    birthYear?: number | null;
    birthDate?: string | null;
    isEarlyYear?: boolean | null;
    phoneNumber?: string | null;
    gender?: 'MALE' | 'FEMALE' | null;
    kakaoNotifyEnabled?: boolean | null;
    pushNotifyEnabled?: boolean | null;
  }) =>
    request<User>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  listGroups: (search?: string, category?: string) => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (category) params.set('category', category);
    const q = params.toString();
    return request<Group[]>(`/groups${q ? `?${q}` : ''}`);
  },
  myGroups: () => request<MyGroup[]>('/groups/mine'),
  getGroup: (id: string) => request<GroupDetail>(`/groups/${id}`),
  createGroup: (data: CreateGroupInput) =>
    request<Group>('/groups', { method: 'POST', body: JSON.stringify(data) }),
  updateGroup: (id: string, data: UpdateGroupInput) =>
    request<Group>(`/groups/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  uploadGroupImage: async (file: File) => {
    // 1. Try Firebase Storage for permanent cloud CDN URL (prevents ephemeral file loss)
    const cloudUrl = await uploadToFirebaseStorage(file, 'groups');
    if (cloudUrl) {
      return { url: cloudUrl, filename: file.name };
    }

    // 2. Fallback to server local upload if offline/mock
    const token = getToken();
    const form = new FormData();
    form.append('image', file);
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/uploads/group-image`, {
      method: 'POST',
      headers,
      body: form,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message ?? `업로드 실패 (${res.status})`);
    }
    return res.json() as Promise<{ url: string; filename: string }>;
  },
  uploadProfileImage: async (file: File) => {
    // 1. Try Firebase Storage for permanent cloud CDN URL (prevents ephemeral file loss)
    const cloudUrl = await uploadToFirebaseStorage(file, 'profiles');
    if (cloudUrl) {
      return { url: cloudUrl, filename: file.name };
    }

    // 2. Fallback to server local upload if offline/mock
    const token = getToken();
    const form = new FormData();
    form.append('image', file);
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/uploads/profile-image`, {
      method: 'POST',
      headers,
      body: form,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message ?? `업로드 실패 (${res.status})`);
    }
    return res.json() as Promise<{ url: string; filename: string }>;
  },
  uploadGalleryFile: async (file: File) => {
    // 1. Try Firebase Storage for permanent cloud CDN URL
    const isVideo = file.type.startsWith('video/');
    const cloudUrl = await uploadToFirebaseStorage(file, 'gallery');
    if (cloudUrl) {
      return { url: cloudUrl, filename: file.name, fileType: isVideo ? 'VIDEO' : 'IMAGE' };
    }

    // 2. Fallback to server local upload if offline/mock
    const token = getToken();
    const form = new FormData();
    form.append('file', file);
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/uploads/gallery`, {
      method: 'POST',
      headers,
      body: form,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message ?? `업로드 실패 (${res.status})`);
    }
    return res.json() as Promise<{ url: string; filename: string; fileType: 'IMAGE' | 'VIDEO' }>;
  },
  uploadMultipleGalleryFiles: async (files: File[]) => {
    const token = getToken();
    const form = new FormData();
    for (const file of files) {
      form.append('files', file);
    }
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/uploads/gallery/multiple`, {
      method: 'POST',
      headers,
      body: form,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message ?? `업로드 실패 (${res.status})`);
    }
    return res.json() as Promise<Array<{ url: string; filename: string; fileType: 'IMAGE' | 'VIDEO' }>>;
  },
  joinGroup: (id: string) =>
    request('/groups/' + id + '/join', { method: 'POST' }),
  cancelJoinGroup: (id: string) =>
    request(`/groups/${id}/join/cancel`, { method: 'POST' }),
  getGroupByInviteCode: (code: string) => request(`/groups/preview/${code}`),
  joinByInvite: (code: string) => request(`/groups/join/${code}`),
  leaveGroup: (id: string) =>
    request(`/groups/${id}/leave`, { method: 'POST' }),
  deleteGroup: (id: string) =>
    request(`/groups/${id}`, { method: 'DELETE' }),
  updateMember: (
    groupId: string,
    userId: string,
    data: { status?: string; role?: string },
  ) =>
    request(`/groups/${groupId}/members/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  kickMember: (groupId: string, userId: string) =>
    request(`/groups/${groupId}/members/${userId}`, { method: 'DELETE' }),
  transferPresident: (groupId: string, newPresidentUserId: string) =>
    request(`/groups/${groupId}/transfer-president`, {
      method: 'POST',
      body: JSON.stringify({ newPresidentUserId }),
    }),

  listEvents: (groupId: string) =>
    request<Event[]>(`/groups/${groupId}/events`),
  getEvent: (id: string) => request<EventDetail>(`/events/${id}`),
  createEvent: (groupId: string, data: CreateEventInput) =>
    request<Event>(`/groups/${groupId}/events`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateEvent: (id: string, data: CreateEventInput) =>
    request<Event>(`/events/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  cancelEvent: (id: string, reason?: string) =>
    request(`/events/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  getEventTeams: (eventId: string) =>
    request<EventTeamsResult>(`/events/${eventId}/teams`),
  splitEventTeams: (
    eventId: string,
    teamCount: number,
    members?: Array<{ userId: string; choice: VoteChoice }>,
  ) =>
    request<EventTeamsResult>(`/events/${eventId}/teams/split`, {
      method: 'POST',
      body: JSON.stringify({ teamCount, members }),
    }),

  castVote: (eventId: string, choice: VoteChoice) =>
    request(`/events/${eventId}/votes`, {
      method: 'POST',
      body: JSON.stringify({ choice }),
    }),
  cancelVote: (eventId: string) =>
    request(`/events/${eventId}/votes`, {
      method: 'DELETE',
    }),
  getVotes: (eventId: string) =>
    request<VoteResults>(`/events/${eventId}/votes`),

  getCalendar: () => request<CalendarEvent[]>('/calendar'),
  getNotifications: () => request<NotificationItem[]>('/notifications'),
  getNotificationUnreadCount: () =>
    request<number>('/notifications/unread-count'),
  markNotificationsRead: () =>
    request<{ ok: boolean }>('/notifications/read', { method: 'PATCH' }),
  deleteAllNotifications: () =>
    request<{ ok: boolean }>('/notifications/all', { method: 'DELETE' }),
  deleteSelectedNotifications: (ids: string[]) =>
    request<{ count: number }>('/notifications/selected', {
      method: 'DELETE',
      body: JSON.stringify({ ids }),
    }),
  deleteNotification: (id: string) =>
    request<{ count: number }>(`/notifications/${id}`, { method: 'DELETE' }),
  getRegions: () => request<RegionsData>('/regions'),

  getLatestEventTemplate: (groupId: string) =>
    request<any>(`/groups/${groupId}/events/latest`),

  updateMyStatus: (groupId: string, userStatus: string) =>
    request<any>(`/groups/${groupId}/members/my-status`, {
      method: 'PATCH',
      body: JSON.stringify({ userStatus }),
    }),

  getPayments: (groupId: string, year: number, month: number) =>
    request<any>(`/groups/${groupId}/payments?year=${year}&month=${month}`),

  togglePayment: (groupId: string, userId: string, year: number, month: number) =>
    request<any>(`/groups/${groupId}/payments/${userId}/toggle?year=${year}&month=${month}`, {
      method: 'POST',
    }),

  getMyDuesSummary: () => request<any[]>('/groups/my-dues/summary'),

  remindUnpaidMembers: (groupId: string, year: number, month: number) =>
    request<{ remindedCount: number }>(`/groups/${groupId}/payments/remind?year=${year}&month=${month}`, {
      method: 'POST',
    }),
  getGroupMedia: (groupId: string) =>
    request<any[]>(`/groups/${groupId}/media`),
  createGroupMedia: (groupId: string, data: { url: string; fileType: string }) =>
    request<any>(`/groups/${groupId}/media`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteGroupMedia: (groupId: string, mediaId: string) =>
    request<{ ok: boolean }>(`/groups/${groupId}/media/${mediaId}`, {
      method: 'DELETE',
    }),

  getComments: (eventId: string) =>
    request<any[]>(`/events/${eventId}/comments`),

  addComment: (eventId: string, content: string) =>
    request<any>(`/events/${eventId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  deleteComment: (eventId: string, commentId: string) =>
    request<any>(`/events/${eventId}/comments/${commentId}`, {
      method: 'DELETE',
    }),

  getChatHistory: (groupId: string, limit = 50) =>
    request<any[]>(`/groups/${groupId}/chats?limit=${limit}`),
  updateFcmToken: (fcmToken: string) =>
    request<any>('/auth/me/fcm-token', {
      method: 'PATCH',
      body: JSON.stringify({ fcmToken }),
    }),
  sendFeedback: (content: string) =>
    request<any>('/feedback', {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
  getFeedbacks: () => request<any[]>('/feedback'),
};

export type VoteChoice = 'ATTEND' | 'ABSENT' | 'LATE';

export interface Group {
  id: string;
  name: string;
  description: string;
  profileImageUrl: string | null;
  category: string;
  activitySido?: string | null;
  activitySigungu?: string | null;
  activityDistrict?: string | null;
  activityTown?: string | null;
  activityRegion?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankAccountHolder?: string | null;
  isPublic: boolean;
  inviteCode: string;
  _count?: { members: number };
  myMembership?: { status: string; role: string; profileCardId?: string | null } | null;
  customSportName?: string | null;
  maxMembers?: number | null;
  dueDay?: number | null;
  officerFeeExempt?: boolean | null;
  arenas?: any[] | null;
}

export interface MyGroup extends Group {
  myRole: string;
  memberCount: number;
}

export interface GroupMember {
  id: string;
  role: string;
  status: string;
  profileCardId?: string | null;
  user: User;
}

export interface GroupDetail extends Group {
  members: GroupMember[];
  myMembership: GroupMember | null;
  pendingRequests: GroupMember[];
  _count: { members: number; events: number };
}

export interface CreateGroupInput {
  name: string;
  description: string;
  profileImageUrl?: string;
  category: string;
  isPublic: boolean;
  activitySido: string;
  activitySigungu: string;
  activityDistrict?: string;
  activityTown?: string;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankAccountHolder?: string | null;
  customSportName?: string | null;
  maxMembers?: number;
  dueDay?: number | null;
  officerFeeExempt?: boolean;
  arenas?: any[];
}

export interface UpdateGroupInput {
  name: string;
  description: string;
  profileImageUrl?: string | null;
  category: string;
  isPublic: boolean;
  activitySido: string;
  activitySigungu: string;
  activityDistrict?: string;
  activityTown?: string;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankAccountHolder?: string | null;
  customSportName?: string | null;
  maxMembers?: number;
  dueDay?: number | null;
  officerFeeExempt?: boolean;
  arenas?: any[];
}

export interface RegionDistrict {
  name: string;
  towns: string[];
}

export interface RegionSigungu {
  name: string;
  districts: RegionDistrict[];
  towns: string[];
}

export interface RegionSido {
  name: string;
  sigungu: RegionSigungu[];
}

export interface RegionsData {
  meta: { updatedAt: string; source: string; version: number };
  tree: RegionSido[];
}

export interface Event {
  id: string;
  groupId: string;
  title: string;
  date: string;
  startTime: string;
  endTime?: string | null;
  location: string;
  description: string;
  status: 'ACTIVE' | 'CANCELLED';
  cancelReason?: string | null;
  createdBy: User;
  _count?: { votes: number };
  reminderOffsets?: string | null;
}

export interface EventDetail extends Event {
  group: { id: string; name: string; profileImageUrl?: string | null };
}

export interface CreateEventInput {
  title: string;
  date: string;
  startTime: string;
  endTime?: string | null;
  location: string;
  description: string;
  reminderOffsets?: string;
}

export interface VoteResults {
  event: {
    id: string;
    title: string;
    status: string;
    date: string;
    startTime: string;
    voteLocked: boolean;
    hasTeamSplit?: boolean;
  };
  counts: { ATTEND: number; ABSENT: number; LATE: number };
  votes: Array<{
    id: string;
    choice: VoteChoice;
    choiceLabel: string;
    user: User;
  }>;
  nonVoters: User[];
  myVote: { choice: VoteChoice } | null;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime?: string | null;
  location: string;
  status: string;
  group: {
    id: string;
    name: string;
    category: string;
    profileImageUrl?: string | null;
  };
  createdBy?: User;
  myVote: VoteChoice | null;
  voteCount: number;
  voteCounts: { ATTEND: number; ABSENT: number; LATE: number };
  myTeam: string | null;
  voteLocked: boolean;
  isPast: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TeamSplitInfo {
  id: string;
  round: number;
  teamCount: number;
  createdAt: string;
  createdBy: User;
}

export interface EventTeamsResult {
  splits?: Array<{
    split: TeamSplitInfo;
    teams: Array<{
      label: string;
      members: User[];
    }>;
    myTeam: string | null;
    canManage: boolean;
  }>;
  split: TeamSplitInfo | null;
  teams: Array<{
    label: string;
    members: User[];
  }>;
  myTeam: string | null;
  canManage: boolean;
  canSplit: boolean;
}

export const TEAM_COUNT_OPTIONS = [2, 3, 4] as const;

export function formatTeamLabel(label: string) {
  return `${label}조`;
}

export interface NotificationItem {
  id: string;
  type: string;
  message: string;
  sentAt: string;
  readAt: string | null;
  event?: { id: string; title: string; date: string; startTime: string } | null;
  group?: { id: string; name: string; profileImageUrl?: string | null } | null;
  actor?: {
    id: string;
    displayName: string;
    profileImageUrl: string | null;
  } | null;
}

export function notificationLink(item: NotificationItem): string {
  if (item.event?.id) return `/events/${item.event.id}`;
  if (item.group?.id) return `/groups/${item.group.id}`;
  return '/';
}

export function notificationIcon(type: string): string {
  switch (type) {
    case 'JOIN_REQUEST':
      return '👋';
    case 'JOIN_APPROVED':
      return '🎉';
    case 'CREATED':
      return '📅';
    case 'CHANGED':
      return '✏️';
    case 'CANCELLED':
      return '🚫';
    case 'REMINDER':
      return '⏰';
    default:
      return '📢';
  }
}

export interface NotificationBadgeInfo {
  label: string;
  category: '일정' | '가입/승인' | '알림';
  emoji: string;
  color: string;
  bg: string;
  border: string;
}

export function getNotificationBadge(type: string): NotificationBadgeInfo {
  switch (type) {
    case 'CREATED':
      return {
        label: '새 일정',
        category: '일정',
        emoji: '📅',
        color: '#10b981',
        bg: 'rgba(16, 185, 129, 0.1)',
        border: 'rgba(16, 185, 129, 0.25)',
      };
    case 'CHANGED':
      return {
        label: '일정 변경',
        category: '일정',
        emoji: '✏️',
        color: '#f59e0b',
        bg: 'rgba(245, 158, 11, 0.1)',
        border: 'rgba(245, 158, 11, 0.25)',
      };
    case 'CANCELLED':
      return {
        label: '일정 취소',
        category: '일정',
        emoji: '🚫',
        color: '#ef4444',
        bg: 'rgba(239, 68, 68, 0.1)',
        border: 'rgba(239, 68, 68, 0.25)',
      };
    case 'REMINDER':
      return {
        label: '투표 리마인더',
        category: '일정',
        emoji: '⏰',
        color: '#8b5cf6',
        bg: 'rgba(139, 92, 246, 0.1)',
        border: 'rgba(139, 92, 246, 0.25)',
      };
    case 'JOIN_REQUEST':
      return {
        label: '가입 신청',
        category: '가입/승인',
        emoji: '👋',
        color: '#3b82f6',
        bg: 'rgba(59, 130, 246, 0.1)',
        border: 'rgba(59, 130, 246, 0.25)',
      };
    case 'JOIN_APPROVED':
      return {
        label: '가입 승인',
        category: '가입/승인',
        emoji: '🎉',
        color: '#10b981',
        bg: 'rgba(16, 185, 129, 0.1)',
        border: 'rgba(16, 185, 129, 0.25)',
      };
    default:
      return {
        label: '공지/소식',
        category: '알림',
        emoji: '📢',
        color: '#64748b',
        bg: 'rgba(100, 116, 139, 0.1)',
        border: 'rgba(100, 116, 139, 0.25)',
      };
  }
}

export function parseNotificationMessage(rawMessage: string): { title: string; detail: string | null } {
  if (!rawMessage) return { title: '알림 소식', detail: null };
  const colonIdx = rawMessage.indexOf(':');
  if (colonIdx !== -1) {
    const title = rawMessage.slice(0, colonIdx).trim();
    const detail = rawMessage.slice(colonIdx + 1).trim();
    return { title, detail: detail || null };
  }
  return { title: rawMessage, detail: null };
}

export const VOTE_LABELS: Record<VoteChoice, string> = {
  ATTEND: '참석',
  LATE: '늦참',
  ABSENT: '불참',
};

export const VOTE_CHOICES: VoteChoice[] = ['ATTEND', 'LATE', 'ABSENT'];

export function groupVotesByChoice(votes: VoteResults['votes']) {
  return VOTE_CHOICES.map((choice) => ({
    choice,
    label: VOTE_LABELS[choice],
    voters: votes.filter((v) => v.choice === choice),
  }));
}

export function formatEventTimeRange(
  startTime: string,
  endTime?: string | null,
) {
  return endTime ? `${startTime} - ${endTime}` : startTime;
}

export function formatEventDate(date: string | Date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatEventSchedule(
  date: string | Date,
  startTime: string,
  endTime?: string | null,
) {
  const d = new Date(date);
  const weekday = d.toLocaleDateString('ko-KR', { weekday: 'short' });
  return `${formatEventDate(date)} (${weekday}) ${formatEventTimeRange(startTime, endTime)}`;
}

export function formatDateTime(date: string | Date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export const ROLE_LABELS: Record<string, string> = {
  PRESIDENT: '회장',
  VICE_PRESIDENT: '부회장',
  SECRETARY: '총무',
  OFFICER: '일반',
  MEMBER: '회원',
};

export function formatMemberDisplayName(user: {
  displayName: string;
  gender?: 'MALE' | 'FEMALE' | null;
  birthYear?: number | null;
  isEarlyYear?: boolean | null;
}) {
  const parts: string[] = [];

  if (user.isEarlyYear) {
    parts.push('빠른');
    if (user.birthYear) {
      parts.push(String(user.birthYear % 100).padStart(2, '0'));
    }
    if (user.gender === 'MALE') parts.push('👨');
    else if (user.gender === 'FEMALE') parts.push('👩');
  } else {
    if (user.gender === 'MALE') parts.push('👨');
    else if (user.gender === 'FEMALE') parts.push('👩');
    if (user.birthYear) {
      parts.push(String(user.birthYear % 100).padStart(2, '0'));
    }
  }

  parts.push(user.displayName);
  return parts.join(' ');
}

export function formatPhoneNumber(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

export function formatUserBirthDate(
  birthDate?: string | Date | null,
  birthYear?: number | null,
) {
  if (birthDate) {
    return formatEventDate(birthDate);
  }
  if (birthYear) {
    return `${birthYear}-01-01`;
  }
  return '-';
}

export const OFFICER_ROLES = [
  'VICE_PRESIDENT',
  'SECRETARY',
  'OFFICER',
] as const;

export const ROLE_SORT_ORDER: Record<string, number> = {
  PRESIDENT: 0,
  VICE_PRESIDENT: 1,
  SECRETARY: 2,
  OFFICER: 3,
  MEMBER: 4,
};

export function isStaffRole(role: string) {
  return (
    role === 'PRESIDENT' ||
    OFFICER_ROLES.includes(role as (typeof OFFICER_ROLES)[number])
  );
}

export function isOfficerRole(role: string) {
  return isStaffRole(role) && role !== 'PRESIDENT';
}

export const ASSIGNABLE_ROLES = [
  { value: 'MEMBER', label: '일반 회원' },
  { value: 'VICE_PRESIDENT', label: '부회장' },
  { value: 'SECRETARY', label: '총무' },
  { value: 'OFFICER', label: '일반' },
] as const;

export const CATEGORY_OPTIONS = [
  { value: '풋살/축구', emoji: '⚽' },
  { value: '농구', emoji: '🏀' },
  { value: '야구', emoji: '⚾' },
  { value: '러닝', emoji: '🏃' },
  { value: '테니스', emoji: '🎾' },
  { value: '탁구', emoji: '🏓' },
  { value: '배드민턴', emoji: '🏸' },
  { value: '볼링', emoji: '🎳' },
  { value: '골프', emoji: '⛳' },
  { value: '기타', emoji: '✨' },
] as const;

export const CATEGORIES = CATEGORY_OPTIONS.map((c) => c.value);

const LEGACY_CATEGORY_MAP: Record<string, string> = {
  운동: '기타',
  풋살: '풋살/축구',
  축구: '풋살/축구',
  야구: '야구',
  농구: '농구',
  테니스: '테니스',
  탁구: '탁구',
  수영: '기타',
  배드민턴: '배드민턴',
  러닝: '러닝',
  볼링: '볼링',
  골프: '골프',
};

export function normalizeCategory(category?: string | null): string {
  if (!category) return '풋살/축구';
  const trimmed = category.trim();
  if (CATEGORIES.includes(trimmed as (typeof CATEGORIES)[number])) {
    return trimmed;
  }
  if (LEGACY_CATEGORY_MAP[trimmed]) {
    return LEGACY_CATEGORY_MAP[trimmed];
  }
  const lower = trimmed.toLowerCase();
  if (lower.includes('풋살') || lower.includes('축구') || lower.includes('futsal') || lower.includes('soccer')) return '풋살/축구';
  if (lower.includes('농구') || lower.includes('basket')) return '농구';
  if (lower.includes('야구') || lower.includes('base')) return '야구';
  if (lower.includes('러닝') || lower.includes('달리기') || lower.includes('run')) return '러닝';
  if (lower.includes('테니스') || lower.includes('tennis')) return '테니스';
  if (lower.includes('탁구') || lower.includes('ping') || lower.includes('table')) return '탁구';
  if (lower.includes('배드민턴') || lower.includes('badminton')) return '배드민턴';
  if (lower.includes('볼링') || lower.includes('bowl')) return '볼링';
  if (lower.includes('골프') || lower.includes('golf')) return '골프';
  return '기타';
}

export function formatCategoryEmoji(category: string): string {
  const normalized = normalizeCategory(category);
  return (
    CATEGORY_OPTIONS.find((c) => c.value === normalized)?.emoji ?? '✨'
  );
}

export const BANK_OPTIONS = [
  'KB국민은행',
  '신한은행',
  '우리은행',
  '하나은행',
  'NH농협은행',
  'IBK기업은행',
  '카카오뱅크',
  '토스뱅크',
  '케이뱅크',
  'SC제일은행',
  '대구은행',
  '부산은행',
  '경남은행',
  '광주은행',
  '전북은행',
  '제주은행',
  '수협은행',
  '신협',
  '새마을금고',
  '우체국',
] as const;
