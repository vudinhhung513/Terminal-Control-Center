// file: src/server.js
// Chuc nang: Entry point — khoi tao Fastify server, dang ky plugin, listen.

import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import fastifyCookie from '@fastify/cookie';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadConfig } from './config.js';
import authPlugin, { isAuthed } from './auth.js';
import sessionsPlugin from './routes/sessions.js';
import wsSessionPlugin from './ws-session.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');

// Doc cau hinh
const config = loadConfig();

// Khoi tao Fastify
const app = Fastify({ logger: true });

// Dang ky WebSocket TRUOC route WS
await app.register(fastifyWebsocket);

// Dang ky cookie o top-level de moi plugin dung chung decorator
await app.register(fastifyCookie, { secret: config.sessionSecret });

// Dang ky auth plugin (login/logout)
await app.register(authPlugin, { config });

// Phuc vu file tinh (public/)
await app.register(fastifyStatic, {
  root: resolve(PROJECT_ROOT, 'public'),
  prefix: '/'
});

// GET /api/config — tra thong tin auth cho client
app.get('/api/config', async (request) => {
  return {
    authEnabled: config.authEnabled,
    authed: isAuthed(request, config)
  };
});

// Dang ky route sessions (REST)
await app.register(sessionsPlugin, { config });

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
