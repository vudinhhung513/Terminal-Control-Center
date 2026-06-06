// file: src/auth.js
// Chuc nang: Plugin xac thuc Fastify — dang ky cookie, route login/logout,
// middleware requireAuth va ham isAuthed.

const COOKIE_NAME = 'tcc_session';
const COOKIE_VALUE = 'authed';

/**
 * Kiem tra request co authed khong (cookie hop le).
 * @param {object} request - Fastify request
 * @param {object} config
 * @returns {boolean}
 */
export function isAuthed(request, config) {
  if (!config.authEnabled) return true;

  const cookieVal = request.cookies?.[COOKIE_NAME];
  if (!cookieVal) return false;

  const unsigned = request.unsignCookie(cookieVal);
  return unsigned.valid && unsigned.value === COOKIE_VALUE;
}

/**
 * Tra ve preHandler de bao ve route.
 * Neu authEnabled = false → cho qua.
 * Neu authEnabled = true → kiem tra cookie.
 * @param {object} config
 * @returns {function} preHandler
 */
export function requireAuth(config) {
  return async function authPreHandler(request, reply) {
    if (!config.authEnabled) return;

    if (!isAuthed(request, config)) {
      reply.code(401).send({ error: 'unauthorized' });
    }
  };
}

/**
 * Fastify plugin: dang ky cookie va route login/logout.
 * @param {object} fastify
 * @param {object} opts - phai co opts.config
 */
async function authPlugin(fastify, opts) {
  const config = opts.config;

  // Luu y: @fastify/cookie duoc dang ky o top-level (server.js) de cac
  // decorator (cookies, unsignCookie, setCookie) kha dung cho moi plugin.

  // POST /api/login
  fastify.post('/api/login', async (request, reply) => {
    // Neu auth tat → tra ok luon
    if (!config.authEnabled) {
      return { ok: true };
    }

    const { password } = request.body || {};

    if (password !== config.password) {
      reply.code(401).send({ error: 'invalid password' });
      return;
    }

    // Set signed cookie
    reply.setCookie(COOKIE_NAME, COOKIE_VALUE, {
      path: '/',
      signed: true,
      httpOnly: true,
      sameSite: 'strict'
    });

    return { ok: true };
  });

  // POST /api/logout
  fastify.post('/api/logout', async (request, reply) => {
    reply.clearCookie(COOKIE_NAME, { path: '/' });
    return { ok: true };
  });
}

export default authPlugin;
