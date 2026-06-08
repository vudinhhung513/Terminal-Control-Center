// file: src/routes/meta.js
// Chuc nang: REST API quan ly metadata phien (ghi chu, thu tu, lan truy cap
// cuoi) va doi ten phien tmux.
// Routes:
//   POST   /api/sessions/:name/touch   -> cap nhat lastAccess = now
//   PUT    /api/sessions/:name/note    -> luu ghi chu
//   PUT    /api/sessions/:name/rename  -> doi ten phien tmux + metadata
//   PUT    /api/sessions/order         -> luu thu tu sap xep (keo-tha)

import { renameSession, hasSession, validateName, scrollSession } from '../tmux.js';
import * as meta from '../meta-store.js';
import { renameLog } from '../session-logger.js';
import { requireAuth, requireCsrf } from '../auth.js';

/**
 * Fastify plugin route metadata phien.
 * @param {object} fastify
 * @param {object} opts - opts.config
 */
async function metaPlugin(fastify, opts) {
  const config = opts.config;
  const authHook = requireAuth(config);
  const csrfHook = requireCsrf();

  // POST /api/sessions/:name/touch — danh dau vua truy cap
  fastify.post('/api/sessions/:name/touch', { preHandler: [authHook, csrfHook] }, async (request, reply) => {
    const { name } = request.params;
    if (!validateName(name)) {
      reply.code(400).send({ error: `Invalid session name: ${name}` });
      return;
    }
    const rec = meta.touch(name);
    return { ok: true, lastAccess: rec.lastAccess };
  });

  // PUT /api/sessions/:name/note — luu ghi chu
  fastify.put('/api/sessions/:name/note', { preHandler: [authHook, csrfHook] }, async (request, reply) => {
    const { name } = request.params;
    if (!validateName(name)) {
      reply.code(400).send({ error: `Invalid session name: ${name}` });
      return;
    }
    const note = String((request.body || {}).note || '');
    if (note.length > 500) {
      reply.code(400).send({ error: 'note too long (max 500)' });
      return;
    }
    const rec = meta.setNote(name, note);
    return { ok: true, note: rec.note };
  });

  // PUT /api/sessions/:name/rename — doi ten phien tmux that + metadata
  fastify.put('/api/sessions/:name/rename', { preHandler: [authHook, csrfHook] }, async (request, reply) => {
    const { name } = request.params;
    const newName = (request.body || {}).newName;

    if (!validateName(name)) {
      reply.code(400).send({ error: `Invalid session name: ${name}` });
      return;
    }
    if (!validateName(newName)) {
      reply.code(400).send({ error: `Invalid new name: ${newName}` });
      return;
    }
    if (name === newName) {
      return { ok: true, name };
    }

    // Phien moi khong duoc trung
    if (await hasSession(newName)) {
      reply.code(409).send({ error: `Session already exists: ${newName}` });
      return;
    }
    // Phien cu phai ton tai
    if (!(await hasSession(name))) {
      reply.code(404).send({ error: `Session not found: ${name}` });
      return;
    }

    try {
      await renameSession(name, newName);
      meta.rename(name, newName); // di chuyen metadata theo
      // Doi ten file log theo phien (loi rename log khong lam hong response)
      try {
        await renameLog(name, newName);
      } catch { /* bo qua loi rename log */ }
      return { ok: true, name: newName };
    } catch (err) {
      reply.code(500).send({ error: err.message });
    }
  });

  // PUT /api/sessions/order — luu thu tu sap xep tu keo-tha
  fastify.put('/api/sessions/order', { preHandler: [authHook, csrfHook] }, async (request, reply) => {
    const order = (request.body || {}).order;
    if (!Array.isArray(order) || !order.every((n) => validateName(n))) {
      reply.code(400).send({ error: 'order must be an array of valid names' });
      return;
    }
    meta.setOrder(order);
    return { ok: true };
  });

  // POST /api/sessions/:name/scroll — cuon noi dung phien qua tmux copy-mode
  fastify.post('/api/sessions/:name/scroll', { preHandler: [authHook, csrfHook] }, async (request, reply) => {
    const { name } = request.params;
    const action = (request.body || {}).action;

    if (!validateName(name)) {
      reply.code(400).send({ error: `Invalid session name: ${name}` });
      return;
    }
    if (['up', 'down', 'top', 'bottom'].indexOf(action) === -1) {
      reply.code(400).send({ error: 'action must be up|down|top|bottom' });
      return;
    }
    if (!(await hasSession(name))) {
      reply.code(404).send({ error: `Session not found: ${name}` });
      return;
    }

    try {
      await scrollSession(name, action);
      return { ok: true };
    } catch (err) {
      reply.code(500).send({ error: err.message });
    }
  });
}

export default metaPlugin;
