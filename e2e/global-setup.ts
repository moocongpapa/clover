const API_URL = process.env.API_URL ?? 'http://localhost:3000';

async function waitForApi(maxMs = 180_000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch(`${API_URL}/auth/kakao/url`);
      if (res.ok) return;
    } catch {
      // server still starting
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`API not ready at ${API_URL}`);
}

export default async function globalSetup() {
  await waitForApi();
}
