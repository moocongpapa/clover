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
      localStorage.setItem('token', token);
      localStorage.setItem(
        'user',
        JSON.stringify({
          id: u.id,
          displayName: u.displayName,
          profileImageUrl: u.profileImageUrl ?? null,
          kakaoId: u.kakaoId ?? `dev-${u.id}`,
        }),
      );
    },
    { token: accessToken, u: user },
  );
  await page.goto('/');
}
