// Simple smoke test for key auth endpoints
(async () => {
  const base = process.env.BASE_URL || 'http://localhost:3000';
  const email = `smoke+${Date.now()}@example.com`;
  const password = 'Test1234!';

  console.log('Base URL:', base);

  try {
    console.log('\n1) Registering user:', email);
    let res = await fetch(`${base}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Smoke Test', email, password }),
    });
    console.log('   status:', res.status);
    console.log('   body:', await res.text());

    const setCookie = res.headers.get('set-cookie') || '';
    const cookie = setCookie.split(';')[0] || '';
    console.log('   received cookie:', Boolean(cookie));

    console.log('\n2) Requesting TOTP setup (requires session cookie)');
    res = await fetch(`${base}/api/auth/2fa/setup`, { method: 'GET', headers: { cookie } });
    console.log('   status:', res.status);
    const setupBody = await res.text();
    console.log('   body:', setupBody);

    console.log('\n3) Verifying TOTP with invalid code (expect 401)');
    res = await fetch(`${base}/api/auth/2fa/setup/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie },
      body: JSON.stringify({ code: '000000' }),
    });
    console.log('   status:', res.status);
    console.log('   body:', await res.text());

    console.log('\n4) Logging out');
    res = await fetch(`${base}/api/auth/logout`, { method: 'POST', headers: { cookie } });
    console.log('   status:', res.status);
    console.log('   body:', await res.text());
  } catch (err) {
    console.error('Smoke test failed:', err);
    process.exit(1);
  }
})();
