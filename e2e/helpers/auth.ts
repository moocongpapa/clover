import { devLogin } from './api';

export async function loginViaUI(page: Page, displayName: string) {
  const session = await devLogin(displayName);
  await loginWithToken(page, session.accessToken, session.user);
}

export async function loginWithToken(
  page: Page,
  accessToken: string,
  user: { id: string; displayName: string; profileImageUrl?: string | null; kakaoId?: string },
) {
  await page.goto('/login');
  await page.evaluate(
    ({ token, u }) => {
      sessionStorage.setItem('clover_splash_shown', 'true');
      localStorage.setItem('token', token);
      localStorage.setItem(
        'user',
        JSON.stringify({
          id: u.id,
          displayName: u.displayName,
          profileImageUrl: u.profileImageUrl ?? null,
          kakaoId: u.kakaoId ?? `dev-${u.id}`,
          gender: (u as any).gender ?? 'MALE',
          birthYear: (u as any).birthYear ?? '1990',
          phoneNumber: (u as any).phoneNumber ?? '010-1234-5678',
        }),
      );
    },
    { token: accessToken, u: user },
  );
  await page.goto('/');
}
