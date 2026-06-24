const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export interface User {
  id: string;
  displayName: string;
  profileImageUrl: string | null;
  kakaoId: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
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
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `요청 실패 (${res.status})`);
  }

  return res.json();
}

export const api = {
  getKakaoUrl: () => request<{ url: string | null }>('/auth/kakao/url'),
  kakaoCallback: (code: string) =>
    request<AuthResponse>('/auth/kakao/callback', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
  devLogin: (displayName: string) =>
    request<AuthResponse>('/auth/dev-login', {
      method: 'POST',
      body: JSON.stringify({ displayName }),
    }),
  getMe: () => request<User>('/auth/me'),

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
  joinGroup: (id: string) =>
    request('/groups/' + id + '/join', { method: 'POST' }),
  cancelJoinGroup: (id: string) =>
    request(`/groups/${id}/join/cancel`, { method: 'POST' }),
  joinByInvite: (code: string) => request(`/groups/join/${code}`),
  leaveGroup: (id: string) =>
    request(`/groups/${id}/leave`, { method: 'POST' }),
  updateMember: (
    groupId: string,
    userId: string,
    data: { status?: string; role?: string },
  ) =>
    request(`/groups/${groupId}/members/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
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
  cancelEvent: (id: string) =>
    request(`/events/${id}/cancel`, { method: 'POST' }),

  castVote: (eventId: string, choice: VoteChoice) =>
    request(`/events/${eventId}/votes`, {
      method: 'POST',
      body: JSON.stringify({ choice }),
    }),
  getVotes: (eventId: string) =>
    request<VoteResults>(`/events/${eventId}/votes`),

  getCalendar: () => request<CalendarEvent[]>('/calendar'),
  getNotifications: () => request<NotificationItem[]>('/notifications'),
};

export type VoteChoice = 'ATTEND' | 'ABSENT' | 'LATE';

export interface Group {
  id: string;
  name: string;
  description: string;
  profileImageUrl: string | null;
  category: string;
  isPublic: boolean;
  inviteCode: string;
  _count?: { members: number };
  myMembership?: { status: string; role: string } | null;
}

export interface MyGroup extends Group {
  myRole: string;
  memberCount: number;
}

export interface GroupMember {
  id: string;
  role: string;
  status: string;
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
}

export interface UpdateGroupInput {
  name: string;
  description: string;
  profileImageUrl?: string | null;
  category: string;
  isPublic: boolean;
}

export interface Event {
  id: string;
  groupId: string;
  title: string;
  date: string;
  startTime: string;
  location: string;
  description: string;
  status: 'ACTIVE' | 'CANCELLED';
  createdBy: User;
  _count?: { votes: number };
}

export interface EventDetail extends Event {
  group: { id: string; name: string };
}

export interface CreateEventInput {
  title: string;
  date: string;
  startTime: string;
  location: string;
  description: string;
}

export interface VoteResults {
  event: {
    id: string;
    title: string;
    status: string;
    date: string;
    startTime: string;
    voteLocked: boolean;
  };
  counts: { ATTEND: number; ABSENT: number; LATE: number };
  votes: Array<{
    id: string;
    choice: VoteChoice;
    choiceLabel: string;
    user: User;
  }>;
  myVote: { choice: VoteChoice } | null;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  startTime: string;
  location: string;
  status: string;
  group: { id: string; name: string; category: string };
  myVote: VoteChoice | null;
  voteCount: number;
}

export interface NotificationItem {
  id: string;
  type: string;
  sentAt: string;
  event: { id: string; title: string; date: string; startTime: string };
}

export const VOTE_LABELS: Record<VoteChoice, string> = {
  ATTEND: '참석',
  ABSENT: '불참',
  LATE: '늦참',
};

export const ROLE_LABELS: Record<string, string> = {
  PRESIDENT: '회장',
  OFFICER: '운영진',
  MEMBER: '회원',
};

export const CATEGORIES = [
  '운동',
  '독서',
  '개발',
  '음악',
  '여행',
  '요리',
  '기타',
];
