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
import { validateName, isAttached } from './tmux.js';
import { ensureLogging } from './session-logger.js';

// Registry client web dang giu moi phien: Map<ten phien, socket>. Dung de
// phat hien va cuop quyen khi mo cung phien o thiet bi khac (che do takeover).
const activeClients = new Map();

// Close code rieng cho che do da thiet bi (4000-4999 la vung danh cho ung dung):
const CLOSE_TAKEN_OVER = 4001; // bi thiet bi khac cuop quyen
const CLOSE_LOCKED = 4002;     // phien dang khoa o thiet bi khac

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

  fastify.get('/ws/session/:name', { websocket: true }, async (socket, req) => {
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

    // Xu ly khi phien dang duoc dung o thiet bi khac (che do da thiet bi):
    // - 'lock': chan thiet bi moi neu phien dang attached (web hoac terminal that).
    // - 'takeover': cuop quyen — dong client web cu (neu co) truoc khi attach,
    //   va dung co '-d' de tmux detach not client terminal that.
    const mode = config.multiDeviceMode || 'takeover';
    if (mode === 'lock') {
      let attached = false;
      try {
        attached = await isAttached(name);
      } catch {
        attached = false;
      }
      if (attached || activeClients.has(name)) {
        socket.close(CLOSE_LOCKED, 'session locked');
        return;
      }
    } else {
      const old = activeClients.get(name);
      if (old && old !== socket && old.readyState === 1) {
        // Bao client cu bi cuop quyen; close handler cua no se kill pty + go khoi registry
        old.close(CLOSE_TAKEN_OVER, 'taken over');
      }
    }

    // Lay encoding hien tai; quyet dinh che do transcode
    const encoding = config.termEncoding || 'utf-8';
    const transcode = !isUtf8(encoding) && iconv.encodingExists(encoding);

    // Decoder streaming cho output (chi tao khi can transcode)
    const decoder = transcode ? iconv.getDecoder(encoding) : null;

    // Spawn pty attach vao phien tmux.
    // Che do takeover them '-d' de detach moi client khac dang giu phien.
    // Neu transcode: encoding=null -> onData tra Buffer (bytes tho).
    // Neu UTF-8: encoding='utf8' -> onData tra string nhu cu.
    const attachArgs = mode === 'takeover'
      ? ['attach-session', '-d', '-t', name]
      : ['attach-session', '-t', name];
    const term = pty.spawn('tmux', attachArgs, {
      name: 'xterm-color',
      cols: 80,
      rows: 24,
      env: process.env,
      encoding: transcode ? null : 'utf8'
    });

    // Ghi nhan socket nay dang giu phien (de phat hien/cuop quyen lan sau)
    activeClients.set(name, socket);

    // Bat ghi log cho phien neu config.logging bat (bat ca phien tao thu cong).
    // Doc truc tiep luong pane qua tmux pipe-pane, doc lap voi socket nay.
    ensureLogging(name).catch(() => { /* loi tmux/log -> bo qua, khong chan terminal */ });

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
      // Chi go khoi registry neu socket nay van la socket dang giu phien
      // (tranh xoa nham khi da bi mot client moi cuop quyen thay the).
      if (activeClients.get(name) === socket) {
        activeClients.delete(name);
      }
      try {
        term.kill();
      } catch {
        // Pty da thoat truoc do
      }
    });
  });
}

export default wsSessionPlugin;
