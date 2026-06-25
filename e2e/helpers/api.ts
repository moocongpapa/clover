const API_URL = process.env.API_URL ?? 'http://localhost:3000';

export interface AuthSession {
  accessToken: string;
  user: { id: string; displayName: string };
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      `${options.method ?? 'GET'} ${path} → ${res.status}: ${body.message ?? res.statusText}`,
    );
  }
  return res.json();
}

export async function devLogin(displayName: string): Promise<AuthSession> {
  return request<AuthSession>('/auth/dev-login', {
    method: 'POST',
    body: JSON.stringify({ displayName }),
  });
}

export async function createGroup(
  token: string,
  data: {
    name: string;
    description: string;
    category: string;
    isPublic: boolean;
    activitySido?: string;
    activitySigungu?: string;
    activityDistrict?: string;
    activityTown?: string;
  },
) {
  return request<{ id: string; inviteCode: string }>(
    '/groups',
    {
      method: 'POST',
      body: JSON.stringify({
        activitySido: '서울특별시',
        activitySigungu: '강남구',
        ...data,
      }),
    },
    token,
  );
}

export async function joinGroup(token: string, groupId: string) {
  return request(`/groups/${groupId}/join`, { method: 'POST' }, token);
}

export async function approveMember(
  token: string,
  groupId: string,
  userId: string,
) {
  return request(
    `/groups/${groupId}/members/${userId}`,
    { method: 'PATCH', body: JSON.stringify({ status: 'APPROVED' }) },
    token,
  );
}

export async function createEvent(
  token: string,
  groupId: string,
  data: {
    title: string;
    date: string;
    startTime: string;
    location: string;
    description: string;
  },
) {
  return request<{ id: string; title: string }>(
    `/groups/${groupId}/events`,
    { method: 'POST', body: JSON.stringify(data) },
    token,
  );
}

export async function updateEvent(
  token: string,
  eventId: string,
  data: {
    title: string;
    date: string;
    startTime: string;
    location: string;
    description: string;
  },
) {
  return request(
    `/events/${eventId}`,
    { method: 'PATCH', body: JSON.stringify(data) },
    token,
  );
}

export async function cancelEvent(token: string, eventId: string) {
  return request(`/events/${eventId}/cancel`, { method: 'POST' }, token);
}

export async function castVote(
  token: string,
  eventId: string,
  choice: 'ATTEND' | 'ABSENT' | 'LATE',
) {
  return request(
    `/events/${eventId}/votes`,
    { method: 'POST', body: JSON.stringify({ choice }) },
    token,
  );
}

export async function getVotes(token: string, eventId: string) {
  return request<{
    event: { voteLocked: boolean };
    counts: { ATTEND: number; ABSENT: number; LATE: number };
    myVote: { choice: string } | null;
  }>(`/events/${eventId}/votes`, {}, token);
}

export async function getNotifications(token: string) {
  return request<
    Array<{ type: string; event: { title: string }; sentAt: string }>
  >('/notifications', {}, token);
}

export async function triggerReminders() {
  return request<{ ok: boolean }>('/notifications/dev/trigger-reminders', {
    method: 'POST',
  });
}

export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return formatDate(d);
}

export function today(): string {
  return formatDate(new Date());
}

export function pastStartTime(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - 30);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function futureStartTime(): string {
  const d = new Date();
  d.setHours(d.getHours() + 2);
  return `${String(d.getHours()).padStart(2, '0')}:00`;
}
