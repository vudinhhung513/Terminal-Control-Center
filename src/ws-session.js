// file: src/ws-session.js
// Chuc nang: WebSocket route attach vao phien tmux qua node-pty.
// Route: GET /ws/session/:name (websocket upgrade)
//
// Encoding: xterm.js chi hieu UTF-8. Neu config.termEncoding khac utf-8, server
// transcode bang iconv-lite: output pty (bytes bang ma nguon) -> UTF-8 cho client,
// va input client (UTF-8) -> bytes bang ma nguon cho pty. Dung streaming decoder
// de giu trang thai khi ky tu da byte bi cat ngang giua hai chunk.

import * as pty from 'node-pty';
import iconv from 'iconv-lite';
import { isAuthed } from './auth.js';
import { validateName } from './tmux.js';

/**
 * Kiem tra encoding co phai UTF-8 khong (chuan hoa ten).
 * @param {string} enc
 * @returns {boolean}
 */
function isUtf8(enc) {
  const e = String(enc || '').toLowerCase().replace(/[-_]/g, '');
  return e === 'utf8' || e === '';
}

/**
 * Fastify plugin dang ky WebSocket route cho terminal session.
 * @param {object} fastify
 * @param {object} opts - opts.config
 */
async function wsSessionPlugin(fastify, opts) {
  const config = opts.config;

  fastify.get('/ws/session/:name', { websocket: true }, (socket, req) => {
    const { name } = req.params;

    // Kiem tra auth neu bat
    if (config.authEnabled && !isAuthed(req, config)) {
      socket.close(1008, 'unauthorized');
      return;
    }

    // Validate ten phien
    if (!validateName(name)) {
      socket.close(1008, 'invalid session name');
      return;
    }

    // Lay encoding hien tai; quyet dinh che do transcode
    const encoding = config.termEncoding || 'utf-8';
    const transcode = !isUtf8(encoding) && iconv.encodingExists(encoding);

    // Decoder streaming cho output (chi tao khi can transcode)
    const decoder = transcode ? iconv.getDecoder(encoding) : null;

    // Spawn pty attach vao phien tmux.
    // Neu transcode: encoding=null -> onData tra Buffer (bytes tho).
    // Neu UTF-8: encoding='utf8' -> onData tra string nhu cu.
    const term = pty.spawn('tmux', ['attach-session', '-t', name], {
      name: 'xterm-color',
      cols: 80,
      rows: 24,
      env: process.env,
      encoding: transcode ? null : 'utf8'
    });

    // Pty output → (transcode neu can) → gui ve client
    term.onData((data) => {
      if (socket.readyState !== 1) return;
      if (transcode) {
        // data la Buffer; decode streaming sang UTF-8
        const text = decoder.write(data);
        if (text) socket.send(text);
      } else {
        socket.send(data);
      }
    });

    // Pty exit → dong socket (khong kill tmux session)
    term.onExit(() => {
      if (socket.readyState === 1) {
        socket.close(1000, 'pty exited');
      }
    });

    // Client gui message → xu ly
    socket.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        if (msg.type === 'input' && typeof msg.data === 'string') {
          // Input tu client la UTF-8; neu transcode, encode ve bang ma nguon
          if (transcode) {
            term.write(iconv.encode(msg.data, encoding));
          } else {
            term.write(msg.data);
          }
        } else if (msg.type === 'resize' && msg.cols && msg.rows) {
          term.resize(Number(msg.cols), Number(msg.rows));
        }
      } catch {
        // JSON parse loi → bo qua
      }
    });

    // Client dong ket noi → kill pty process (khong kill tmux session)
    socket.on('close', () => {
      try {
        term.kill();
      } catch {
        // Pty da thoat truoc do
      }
    });
  });
}

export default wsSessionPlugin;
