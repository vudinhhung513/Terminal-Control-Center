// file: src/routes/settings.js
// Chuc nang: REST API doc/ghi cau hinh ung dung qua giao dien Settings.
// Routes: GET /api/settings, PUT /api/settings
//
// Bao mat: PUT yeu cau auth (neu bat) + CSRF. Khi doi mat khau hoac
// thiet lap nhay cam ma auth dang bat, yeu cau xac nhan mat khau hien tai.
//
// Port/Host doi → can restart server. Neu chay duoi systemd (phat hien qua
// bien moi truong INVOCATION_ID) se tu thoat de systemd khoi dong lai;
// neu chay thu cong thi bao nguoi dung tu restart.

import { saveConfig, getConfig } from '../config.js';
import { hashPassword, verifyPassword } from '../password.js';
import { requireAuth, requireCsrf } from '../auth.js';
import { expandHome } from '../tmux.js';
import { statSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import iconv from 'iconv-lite';

/** Phat hien tien trinh dang chay duoi systemd. */
function isUnderSystemd() {
  return Boolean(process.env.INVOCATION_ID);
}

/**
 * Tra ve cau hinh "public" (loai bo secret/mat khau) cho client.
 * @param {object} cfg
 */
function publicSettings(cfg) {
  return {
    host: cfg.host,
    port: cfg.port,
    authEnabled: cfg.authEnabled,
    // Khong tra password/sessionSecret; chi bao da dat mat khau hay chua
    hasPassword: Boolean(cfg.password),
    shell: cfg.shell,
    shells: cfg.shells,
    theme: cfg.theme,
    defaultPath: cfg.defaultPath,
    tmuxPrefix: cfg.tmuxPrefix,
    termFontFamily: cfg.termFontFamily,
    termFontSize: cfg.termFontSize,
    termFontSizeMobile: cfg.termFontSizeMobile,
    mobileKeyboardMode: cfg.mobileKeyboardMode,
    termEncoding: cfg.termEncoding,
    language: cfg.language,
    loginRateLimit: cfg.loginRateLimit
  };
}

/**
 * Fastify plugin route settings.
 * @param {object} fastify
 * @param {object} opts - opts.config
 */
async function settingsPlugin(fastify, opts) {
  const config = opts.config;
  const authHook = requireAuth(config);
  const csrfHook = requireCsrf();

  // GET /api/settings — lay cau hinh public
  fastify.get('/api/settings', { preHandler: authHook }, async () => {
    return publicSettings(getConfig());
  });

  // PUT /api/settings — cap nhat cau hinh
  fastify.put('/api/settings', { preHandler: [authHook, csrfHook] }, async (request, reply) => {
    const body = request.body || {};
    const cfg = getConfig();
    const patch = {};

    // Neu auth dang bat, doi thiet lap nhay cam phai xac nhan mat khau hien tai
    const sensitive = body.password !== undefined ||
      body.authEnabled !== undefined ||
      body.host !== undefined ||
      body.port !== undefined;
    if (cfg.authEnabled && cfg.password && sensitive) {
      if (!verifyPassword(body.currentPassword || '', cfg.password)) {
        reply.code(401).send({ error: 'current password incorrect' });
        return;
      }
    }

    // === Validate va gom patch ===

    // Host
    if (typeof body.host === 'string' && body.host.trim()) {
      patch.host = body.host.trim();
    }

    // Port (1..65535)
    if (body.port !== undefined) {
      const p = Number(body.port);
      if (!Number.isInteger(p) || p < 1 || p > 65535) {
        reply.code(400).send({ error: 'port must be an integer in 1..65535' });
        return;
      }
      patch.port = p;
    }

    // Bat/tat auth
    if (typeof body.authEnabled === 'boolean') {
      patch.authEnabled = body.authEnabled;
    }

    // Doi mat khau (hash truoc khi luu)
    if (typeof body.password === 'string' && body.password !== '') {
      patch.password = hashPassword(body.password);
    }

    // Shell
    if (typeof body.shell === 'string' && body.shell.trim()) {
      patch.shell = body.shell.trim();
    }

    // Font terminal
    if (typeof body.termFontFamily === 'string' && body.termFontFamily.trim()) {
      patch.termFontFamily = body.termFontFamily.trim();
    }
    if (body.termFontSize !== undefined) {
      const fs = Number(body.termFontSize);
      if (!Number.isFinite(fs) || fs < 8 || fs > 40) {
        reply.code(400).send({ error: 'termFontSize must be 8..40' });
        return;
      }
      patch.termFontSize = fs;
    }
    if (body.termFontSizeMobile !== undefined) {
      const fsm = Number(body.termFontSizeMobile);
      if (!Number.isFinite(fsm) || fsm < 8 || fsm > 40) {
        reply.code(400).send({ error: 'termFontSizeMobile must be 8..40' });
        return;
      }
      patch.termFontSizeMobile = fsm;
    }

    // Che do ban phim mobile (resize|input)
    if (body.mobileKeyboardMode !== undefined) {
      if (body.mobileKeyboardMode !== 'resize' && body.mobileKeyboardMode !== 'input') {
        reply.code(400).send({ error: 'mobileKeyboardMode must be resize or input' });
        return;
      }
      patch.mobileKeyboardMode = body.mobileKeyboardMode;
    }

    // Bang ma terminal (phai duoc iconv-lite ho tro)
    if (typeof body.termEncoding === 'string' && body.termEncoding.trim()) {
      const enc = body.termEncoding.trim();
      if (!iconv.encodingExists(enc)) {
        reply.code(400).send({ error: `unsupported encoding: ${enc}` });
        return;
      }
      patch.termEncoding = enc;
    }

    // Ngon ngu giao dien (en|vi)
    if (body.language !== undefined) {
      if (body.language !== 'en' && body.language !== 'vi') {
        reply.code(400).send({ error: 'language must be en or vi' });
        return;
      }
      patch.language = body.language;
    }

    // Theme giao dien (dark|light|auto)
    if (body.theme !== undefined) {
      if (body.theme !== 'dark' && body.theme !== 'light' && body.theme !== 'auto') {
        reply.code(400).send({ error: 'theme must be dark, light or auto' });
        return;
      }
      patch.theme = body.theme;
    }

    // Thu muc lam viec mac dinh cho phien moi.
    // Rong = xoa default. Khac rong = phai la duong dan tuyet doi, ton tai,
    // va la thu muc tren server (validate nghiem ngat khi luu).
    if (body.defaultPath !== undefined) {
      if (typeof body.defaultPath !== 'string') {
        reply.code(400).send({ error: 'defaultPath must be a string' });
        return;
      }
      const raw = body.defaultPath.trim();
      if (raw === '') {
        patch.defaultPath = '';
      } else {
        const dir = expandHome(raw);
        if (!isAbsolute(dir)) {
          reply.code(400).send({ error: 'defaultPath must be an absolute path' });
          return;
        }
        let ok = false;
        try {
          ok = statSync(dir).isDirectory();
        } catch {
          ok = false;
        }
        if (!ok) {
          reply.code(400).send({ error: 'defaultPath must be an existing directory' });
          return;
        }
        patch.defaultPath = raw;
      }
    }

    // Rate-limit dang nhap
    if (body.loginRateLimit && typeof body.loginRateLimit === 'object') {
      patch.loginRateLimit = {
        enabled: Boolean(body.loginRateLimit.enabled),
        maxAttempts: Number(body.loginRateLimit.maxAttempts),
        windowMs: Number(body.loginRateLimit.windowMs)
      };
    }

    // Phat hien co doi port/host (can restart)
    const needsRestart =
      (patch.port !== undefined && patch.port !== cfg.port) ||
      (patch.host !== undefined && patch.host !== cfg.host);

    // Ghi config (hieu luc ngay cho cac field khong can restart)
    saveConfig(patch);

    const underSystemd = isUnderSystemd();

    // Tra ket qua truoc khi (co the) thoat tien trinh
    reply.send({
      ok: true,
      needsRestart,
      systemd: underSystemd,
      message: needsRestart
        ? (underSystemd
          ? 'Da luu. Service se tu khoi dong lai de ap dung port/host moi.'
          : 'Da luu. Vui long khoi dong lai server thu cong de ap dung port/host moi.')
        : 'Da luu va ap dung.'
    });

    // Neu doi port/host va dang chay duoi systemd → thoat de duoc restart.
    if (needsRestart && underSystemd) {
      setTimeout(() => process.exit(0), 500);
    }
  });
}

export default settingsPlugin;
