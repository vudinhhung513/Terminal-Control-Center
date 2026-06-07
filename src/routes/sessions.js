// file: src/routes/sessions.js
// Chuc nang: Plugin Fastify cung cap REST API quan ly phien tmux.
// Routes: GET/POST /api/sessions, DELETE /api/sessions/:name

import { listSessions, createSession, killSession, hasSession, validateName } from '../tmux.js';
import { requireAuth, requireCsrf } from '../auth.js';
import * as meta from '../meta-store.js';

/**
 * Fastify plugin dang ky cac route sessions.
 * @param {object} fastify
 * @param {object} opts - opts.config
 */
async function sessionsPlugin(fastify, opts) {
  const config = opts.config;
  const authHook = requireAuth(config);
  const csrfHook = requireCsrf();

  // GET /api/sessions — lay danh sach phien (kem metadata, da sap xep)
  fastify.get('/api/sessions', { preHandler: authHook }, async () => {
    const sessions = await listSessions();

    // Gan metadata (note, order, lastAccess) cho tung phien
    const enriched = sessions.map((s) => {
      const m = meta.getMeta(s.name);
      return { ...s, note: m.note, order: m.order, lastAccess: m.lastAccess };
    });

    // Sap xep theo order (tang dan); cung order thi theo ten
    enriched.sort((a, b) => (a.order - b.order) || a.name.localeCompare(b.name));

    return { sessions: enriched };
  });

  // POST /api/sessions — tao phien moi
  fastify.post('/api/sessions', { preHandler: [authHook, csrfHook] }, async (request, reply) => {
    const { name, shell } = request.body || {};

    // Validate ten neu truyen vao
    if (name !== undefined && name !== null && name !== '') {
      if (!validateName(name)) {
        reply.code(400).send({ error: `Invalid session name: ${name}` });
        return;
      }

      // Kiem tra da ton tai chua
      const exists = await hasSession(name);
      if (exists) {
        reply.code(409).send({ error: `Session already exists: ${name}` });
        return;
      }
    }

    // Validate shell neu truyen vao (phai nam trong allowlist config.shells)
    if (shell !== undefined && shell !== null && shell !== '') {
      if (!config.shells.includes(shell)) {
        reply.code(400).send({ error: `Shell not allowed: ${shell}` });
        return;
      }
    }

    try {
      const createdName = await createSession(name || undefined, config, shell || undefined);
      reply.code(201).send({ name: createdName });
    } catch (err) {
      // Truong hop loi tu tmux (vd: phien da ton tai do race condition)
      if (err.message?.includes('duplicate session')) {
        reply.code(409).send({ error: err.message });
        return;
      }
      reply.code(500).send({ error: err.message });
    }
  });

  // DELETE /api/sessions/:name — xoa phien
  fastify.delete('/api/sessions/:name', { preHandler: [authHook, csrfHook] }, async (request, reply) => {
    const { name } = request.params;

    if (!validateName(name)) {
      reply.code(400).send({ error: `Invalid session name: ${name}` });
      return;
    }

    // Kiem tra ton tai
    const exists = await hasSession(name);
    if (!exists) {
      reply.code(404).send({ error: `Session not found: ${name}` });
      return;
    }

    try {
      await killSession(name);
      meta.remove(name); // don dep metadata kem theo
      return { ok: true };
    } catch (err) {
      reply.code(500).send({ error: err.message });
    }
  });
}

export default sessionsPlugin;
