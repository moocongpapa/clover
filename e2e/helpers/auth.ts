import type { Page } from '@playwright/test';

export async function loginViaUI(page: Page, displayName: string) {
  await page.goto('/login');
  await page.getByLabel('이름으로 빠른 로그인').fill(displayName);
  await page.getByRole('button', { name: '개발 로그인' }).click();
  await page.waitForURL('/');
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
