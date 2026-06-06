// file: src/server.js
// Chuc nang: Entry point — khoi tao Fastify server, dang ky plugin, listen.

import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import fastifyCookie from '@fastify/cookie';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

import { loadConfig } from './config.js';
import authPlugin, { isAuthed, registerCsrfCookie } from './auth.js';
import sessionsPlugin from './routes/sessions.js';
import metaPlugin from './routes/meta.js';
import settingsPlugin from './routes/settings.js';
import wsSessionPlugin from './ws-session.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');

// Doc version tu package.json (hien thi tren UI)
let APP_VERSION = '0.0.0';
try {
  APP_VERSION = JSON.parse(readFileSync(resolve(PROJECT_ROOT, 'package.json'), 'utf-8')).version;
} catch {
  // Giu mac dinh neu khong doc duoc
}

// Doc cau hinh
const config = loadConfig();

// Khoi tao Fastify
const app = Fastify({ logger: true });

// Override parser JSON: coi body rong la {} thay vi tra loi 400
// (cac request POST/PUT khong body nhu /touch, /logout van gui header JSON).
app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
  if (body === '' || body == null) {
    done(null, {});
    return;
  }
  try {
    done(null, JSON.parse(body));
  } catch (err) {
    err.statusCode = 400;
    done(err, undefined);
  }
});

// Dang ky WebSocket TRUOC route WS
await app.register(fastifyWebsocket);

// Dang ky cookie o top-level de moi plugin dung chung decorator
await app.register(fastifyCookie, { secret: config.sessionSecret });

// Gan CSRF token cho moi request (top-level de ap dung ca file tinh)
registerCsrfCookie(app);

// Dang ky auth plugin (login/logout, rate-limit)
await app.register(authPlugin, { config });

// Phuc vu file tinh (public/)
await app.register(fastifyStatic, {
  root: resolve(PROJECT_ROOT, 'public'),
  prefix: '/'
});

// GET /api/config — tra thong tin auth + font + version + ngon ngu cho client
app.get('/api/config', async (request) => {
  return {
    authEnabled: config.authEnabled,
    authed: isAuthed(request, config),
    version: APP_VERSION,
    termFontFamily: config.termFontFamily,
    termFontSize: config.termFontSize,
    language: config.language
  };
});

// Dang ky route sessions (REST)
await app.register(sessionsPlugin, { config });

// Dang ky route metadata phien
await app.register(metaPlugin, { config });

// Dang ky route settings
await app.register(settingsPlugin, { config });

// Dang ky route WebSocket
await app.register(wsSessionPlugin, { config });

// Khoi dong server
try {
  await app.listen({ host: config.host, port: config.port });

  const addr = `http://${config.host}:${config.port}`;
  app.log.info(`Terminal Control Center dang chay tai ${addr}`);

  // Canh bao bao mat
  if (!config.authEnabled) {
    app.log.warn('Auth DISABLED - ai truy cap duoc IP/port deu dung duoc');
  }
  if (config.host === '0.0.0.0') {
    app.log.warn('Server expose ra LAN (host=0.0.0.0). Dam bao mang an toan.');
  }
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
