// file: test/app.test.js
// Chuc nang: Test tich hop cho buildApp (Fastify inject, khong can tmux/listen).
// Kiem tra /api/config, /api/settings, CSRF, computeWarnings.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp, computeWarnings } from '../src/app.js';

// Config test mac dinh (khong ghi file, khong can tmux)
const BASE_CONFIG = {
  host: '127.0.0.1',
  port: 7171,
  authEnabled: false,
  password: '',
  sessionSecret: 'test-secret',
  shell: 'bash',
  shells: ['bash', 'zsh', 'sh'],
  theme: 'dark',
  tmuxPrefix: 'tcc',
  termFontFamily: 'monospace',
  termFontSize: 14,
  termEncoding: 'utf-8',
  language: 'en',
  loginRateLimit: { enabled: true, maxAttempts: 5, windowMs: 60000 }
};

/** Tao app test voi config tuy chinh (merge overrides len BASE_CONFIG). */
async function makeApp(overrides = {}) {
  const config = { ...BASE_CONFIG, ...overrides };
  return buildApp(config, { version: '9.9.9', fastifyOptions: { logger: false } });
}

/**
 * Helper lay CSRF token tu response set-cookie header.
 * Gui GET /api/config de nhan cookie tcc_csrf, tra ve { token, cookie }.
 */
async function getCsrf(app) {
  const res = await app.inject({ method: 'GET', url: '/api/config' });
  const setCookies = res.headers['set-cookie'];
  // set-cookie co the la string hoac mang
  const cookies = Array.isArray(setCookies) ? setCookies : [setCookies];
  let token = '';
  let cookieStr = '';
  for (const c of cookies) {
    if (c && c.startsWith('tcc_csrf=')) {
      token = c.split(';')[0].replace('tcc_csrf=', '');
      cookieStr = c.split(';')[0]; // tcc_csrf=<value>
      break;
    }
  }
  return { token, cookieStr };
}

describe('buildApp /api/config', () => {
  it('GET /api/config tra 200 voi version, theme, shells, warnings', async () => {
    const app = await makeApp();
    const res = await app.inject({ method: 'GET', url: '/api/config' });
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.version, '9.9.9');
    assert.strictEqual(body.theme, 'dark');
    assert.ok(Array.isArray(body.shells));
    assert.ok(Array.isArray(body.warnings));
    await app.close();
  });

  it('warnings chua defaultSecret khi sessionSecret la gia tri mac dinh', async () => {
    const app = await makeApp({ sessionSecret: 'REPLACE_WITH_RANDOM_SECRET' });
    const res = await app.inject({ method: 'GET', url: '/api/config' });
    const body = JSON.parse(res.body);
    assert.ok(body.warnings.includes('defaultSecret'));
    await app.close();
  });

  it('warnings chua exposedNoAuth khi host khac localhost va auth tat', async () => {
    const app = await makeApp({ host: '0.0.0.0', authEnabled: false });
    const res = await app.inject({ method: 'GET', url: '/api/config' });
    const body = JSON.parse(res.body);
    assert.ok(body.warnings.includes('exposedNoAuth'));
    await app.close();
  });
});

describe('computeWarnings', () => {
  it('tra mang rong khi host localhost, secret khong mac dinh, auth tat', () => {
    const warnings = computeWarnings({
      host: '127.0.0.1',
      sessionSecret: 'my-custom-secret',
      authEnabled: false
    });
    assert.deepStrictEqual(warnings, []);
  });
});

describe('buildApp /api/settings', () => {
  it('GET /api/settings tra 200 voi theme va shells (auth tat)', async () => {
    const app = await makeApp();
    const res = await app.inject({ method: 'GET', url: '/api/settings' });
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.theme, 'dark');
    assert.ok(Array.isArray(body.shells));
    await app.close();
  });

  it('PUT /api/settings khong co CSRF header bi tu choi 403', async () => {
    const app = await makeApp();
    const res = await app.inject({
      method: 'PUT',
      url: '/api/settings',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ theme: 'light' })
    });
    assert.strictEqual(res.statusCode, 403);
    await app.close();
  });

  it('PUT /api/settings voi CSRF hop le + theme khong hop le -> 400', async () => {
    const app = await makeApp();
    const { token, cookieStr } = await getCsrf(app);
    const res = await app.inject({
      method: 'PUT',
      url: '/api/settings',
      headers: {
        'content-type': 'application/json',
        'x-csrf-token': token,
        cookie: cookieStr
      },
      body: JSON.stringify({ theme: 'badvalue' })
    });
    assert.strictEqual(res.statusCode, 400);
    await app.close();
  });

  it('PUT /api/settings voi CSRF hop le + termFontSize khong hop le -> 400', async () => {
    const app = await makeApp();
    const { token, cookieStr } = await getCsrf(app);
    const res = await app.inject({
      method: 'PUT',
      url: '/api/settings',
      headers: {
        'content-type': 'application/json',
        'x-csrf-token': token,
        cookie: cookieStr
      },
      body: JSON.stringify({ termFontSize: 999 })
    });
    assert.strictEqual(res.statusCode, 400);
    await app.close();
  });

  it('PUT /api/settings voi CSRF hop le + language khong hop le -> 400', async () => {
    const app = await makeApp();
    const { token, cookieStr } = await getCsrf(app);
    const res = await app.inject({
      method: 'PUT',
      url: '/api/settings',
      headers: {
        'content-type': 'application/json',
        'x-csrf-token': token,
        cookie: cookieStr
      },
      body: JSON.stringify({ language: 'xx' })
    });
    assert.strictEqual(res.statusCode, 400);
    await app.close();
  });
});
