// file: src/ws-session.js
// Chuc nang: WebSocket route attach vao phien tmux qua node-pty.
// Route: GET /ws/session/:name (websocket upgrade)

import * as pty from 'node-pty';
import { isAuthed } from './auth.js';
import { validateName } from './tmux.js';

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

    // Spawn pty attach vao phien tmux
    const term = pty.spawn('tmux', ['attach-session', '-t', name], {
      name: 'xterm-color',
      cols: 80,
      rows: 24,
      env: process.env
    });

    // Pty output → gui ve client
    term.onData((data) => {
      if (socket.readyState === 1) {
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
          term.write(msg.data);
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
