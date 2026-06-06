/**
 * file: terminal.js
 * Chuc nang: Khoi tao xterm.js terminal, ket noi WebSocket toi phien tmux,
 *            xu ly input/output va resize.
 */

(function () {
  'use strict';

  // === Lay ten phien tu query string ===
  var params = new URLSearchParams(window.location.search);
  var sessionName = params.get('name');

  // Tham chieu DOM
  var sessionTitle = document.getElementById('session-title');
  var container = document.getElementById('terminal-container');
  var reconnectOverlay = document.getElementById('reconnect-overlay');
  var btnReconnect = document.getElementById('btn-reconnect');

  // Hien ten phien tren header
  sessionTitle.textContent = sessionName ? 'Terminal: ' + sessionName : 'Terminal';

  // Kiem tra ten phien hop le
  if (!sessionName) {
    container.innerHTML = '<p style="color:var(--danger);padding:16px;">Thiếu tham số ?name=. Vui lòng quay lại dashboard.</p>';
    return;
  }

  // === Khoi tao xterm ===
  var term = new Terminal({
    cursorBlink: true,
    fontFamily: 'monospace',
    fontSize: 14
  });

  var fit = new FitAddon.FitAddon();
  term.loadAddon(fit);
  term.open(container);
  fit.fit();

  // === WebSocket ===
  var ws = null;

  /** Tao URL WebSocket tu location hien tai */
  function buildWsUrl() {
    var protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    var host = window.location.host;
    return protocol + host + '/ws/session/' + encodeURIComponent(sessionName);
  }

  /** Gui message resize ve server */
  function sendResize() {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'resize',
        cols: term.cols,
        rows: term.rows
      }));
    }
  }

  /** Ket noi WebSocket */
  function connect() {
    // An overlay ket noi lai
    reconnectOverlay.classList.add('hidden');

    ws = new WebSocket(buildWsUrl());

    // Khi ket noi thanh cong
    ws.onopen = function () {
      fit.fit();
      sendResize();
    };

    // Khi nhan du lieu tu server → ghi vao terminal
    ws.onmessage = function (ev) {
      term.write(ev.data);
    };

    // Khi mat ket noi
    ws.onclose = function () {
      term.write('\r\n\x1b[1;31m** Đã ngắt kết nối **\x1b[0m\r\n');
      reconnectOverlay.classList.remove('hidden');
    };

    // Khi co loi
    ws.onerror = function () {
      // onclose se duoc goi sau do
    };
  }

  // === Terminal input → gui len server ===
  term.onData(function (data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'input', data: data }));
    }
  });

  // === Xu ly resize terminal khi cua so thay doi ===
  function handleResize() {
    fit.fit();
    sendResize();
  }

  // Dung ResizeObserver neu co, fallback window.onresize
  if (typeof ResizeObserver !== 'undefined') {
    var observer = new ResizeObserver(function () {
      handleResize();
    });
    observer.observe(container);
  } else {
    window.addEventListener('resize', handleResize);
  }

  // === Nut ket noi lai ===
  btnReconnect.addEventListener('click', function () {
    connect();
  });

  // === Bat dau ket noi ===
  connect();
})();
