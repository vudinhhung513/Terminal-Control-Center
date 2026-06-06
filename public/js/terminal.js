/**
 * file: terminal.js
 * Chuc nang: Khoi tao xterm.js terminal, ket noi WebSocket toi phien tmux,
 *            xu ly input/output, resize, font tu config, thanh nut dieu khien
 *            va tu dong ket noi lai (auto-reconnect co backoff).
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
  var controlBar = document.getElementById('control-bar');

  /** Shorthand dich i18n. */
  function t(key, vars) { return window.I18N.t(key, vars); }

  /** Cap nhat tieu de phien theo ngon ngu hien tai. */
  function updateTitle() {
    sessionTitle.textContent = sessionName ? t('term.title') + sessionName : t('term.titleDefault');
  }
  updateTitle();

  if (!sessionName) {
    container.innerHTML = '<p style="color:var(--danger);padding:16px;">' + t('term.missingName') + '</p>';
    return;
  }

  // === Khoi tao xterm (font ap sau khi lay config) ===
  var term = new Terminal({
    cursorBlink: true,
    fontFamily: 'monospace',
    fontSize: 14,
    scrollback: 5000
  });

  var fit = new FitAddon.FitAddon();
  term.loadAddon(fit);
  term.open(container);
  fit.fit();

  // Lay config server de ap font terminal + ngon ngu
  fetch('/api/config')
    .then(function (res) { return res.json(); })
    .then(function (cfg) {
      if (cfg.termFontFamily) term.options.fontFamily = cfg.termFontFamily;
      if (cfg.termFontSize) term.options.fontSize = cfg.termFontSize;
      // Ap ngon ngu cho text tinh (data-i18n) + tieu de
      window.I18N.setLang(cfg.language || 'en');
      window.I18N.apply();
      updateTitle();
      fit.fit();
      sendResize();
    })
    .catch(function () { /* giu font/ngon ngu mac dinh */ });

  // === WebSocket + auto-reconnect ===
  var ws = null;
  var reconnectAttempts = 0;
  var reconnectTimer = null;
  var manualClose = false;
  var MAX_RECONNECT_DELAY = 10000; // toi da 10s giua cac lan thu

  function buildWsUrl() {
    var protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    return protocol + window.location.host + '/ws/session/' + encodeURIComponent(sessionName);
  }

  function sendResize() {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
    }
  }

  /** Gui chuoi input tho len server. */
  function sendInput(data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'input', data: data }));
    }
  }

  /** Lich ket noi lai voi backoff luy tien. */
  function scheduleReconnect() {
    if (manualClose) return;
    reconnectAttempts += 1;
    var delay = Math.min(1000 * reconnectAttempts, MAX_RECONNECT_DELAY);
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connect, delay);
  }

  function connect() {
    reconnectOverlay.classList.add('hidden');
    manualClose = false;
    ws = new WebSocket(buildWsUrl());

    ws.onopen = function () {
      reconnectAttempts = 0; // reset backoff khi thanh cong
      fit.fit();
      sendResize();
    };

    ws.onmessage = function (ev) { term.write(ev.data); };

    ws.onclose = function () {
      if (!manualClose) {
        term.write('\r\n\x1b[1;31m' + t('term.disconnected') + '\x1b[0m\r\n');
        reconnectOverlay.classList.remove('hidden');
        scheduleReconnect();
      }
    };

    ws.onerror = function () { /* onclose se chay sau */ };
  }

  // === Terminal input → gui len server ===
  term.onData(function (data) { sendInput(data); });

  // === Resize ===
  function handleResize() { fit.fit(); sendResize(); }
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(handleResize).observe(container);
  } else {
    window.addEventListener('resize', handleResize);
  }

  // === Thanh nut dieu khien ===
  // Map phim → chuoi escape gui qua WebSocket
  var KEY_MAP = {
    enter: '\r',
    esc: '\x1b',
    ctrlc: '\x03',
    tab: '\t',
    left: '\x1b[D',
    right: '\x1b[C'
  };

  /** Doc CSRF token tu cookie (server tu cap). */
  function getCsrfToken() {
    var m = document.cookie.match(/(?:^|;\s*)tcc_csrf=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : '';
  }

  /**
   * Cuon noi dung phien qua server (tmux copy-mode). Cuon xterm client-side
   * khong dung duoc vi tmux chiem alternate-screen.
   * @param {'up'|'down'|'top'|'bottom'} action
   */
  function scrollSession(action) {
    fetch('/api/sessions/' + encodeURIComponent(sessionName) + '/scroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
      body: JSON.stringify({ action: action })
    }).catch(function () { /* bo qua loi mang tam thoi */ });
  }

  if (controlBar) {
    controlBar.addEventListener('click', function (e) {
      var btn = e.target.closest('.ctrl-btn');
      if (!btn) return;

      // Nut cuon → goi server (tmux copy-mode)
      var scroll = btn.dataset.scroll;
      if (scroll) {
        scrollSession(scroll);
        return;
      }

      // Nut gui phim
      var key = btn.dataset.key;
      if (key && KEY_MAP[key] !== undefined) {
        sendInput(KEY_MAP[key]);
        term.focus();
      }
    });
  }

  // === Nut ket noi lai (thu cong) ===
  btnReconnect.addEventListener('click', function () {
    reconnectAttempts = 0;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    connect();
  });

  // Dong ket noi sach khi roi trang (tranh reconnect thua)
  window.addEventListener('beforeunload', function () {
    manualClose = true;
    if (ws) ws.close();
  });

  connect();
})();
