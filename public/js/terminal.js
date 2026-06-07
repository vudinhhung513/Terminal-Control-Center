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

  /** Ap mau xterm theo theme da resolve ('dark'|'light'). */
  function applyXtermTheme(resolved) {
    if (resolved === 'light') {
      term.options.theme = { background: '#ffffff', foreground: '#1a1b2e', cursor: '#1a1b2e' };
    } else {
      term.options.theme = { background: '#000000', foreground: '#ffffff', cursor: '#ffffff' };
    }
  }

  // Theo doi thay doi theme (vd mode 'auto' khi he dieu hanh doi che do)
  document.addEventListener('tcc:theme-change', function (e) {
    if (e && e.detail) applyXtermTheme(e.detail.resolved);
  });

  // Lay config server de ap font terminal + ngon ngu + theme
  fetch('/api/config')
    .then(function (res) { return res.json(); })
    .then(function (cfg) {
      if (cfg.termFontFamily) term.options.fontFamily = cfg.termFontFamily;
      if (cfg.termFontSize) term.options.fontSize = cfg.termFontSize;
      // Ap ngon ngu cho text tinh (data-i18n) + tieu de
      window.I18N.setLang(cfg.language || 'en');
      window.I18N.apply();
      updateTitle();
      // Ap theme (qua module Theme dung chung, ho tro auto)
      var resolved = window.Theme.applyTheme(cfg.theme || 'dark');
      applyXtermTheme(resolved);
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

  // === Phim tat copy/paste (chuan terminal Ubuntu: Ctrl+Shift+C/V) ===
  // Tra ve false de xterm KHONG gui phim nay vao tmux (Ctrl+C van la ngat).
  term.attachCustomKeyEventHandler(function (e) {
    if (e.type !== 'keydown' || !e.ctrlKey || !e.shiftKey) return true;
    var k = e.key.toLowerCase();
    if (k === 'c') { copySelection(); return false; }
    // Paste: tra ve false de xterm KHONG gui \x16 vao tmux, nhung su kien
    // 'paste' goc cua trinh duyet van chay (doc clipboard CLIENT qua
    // clipboardData, ho tro ca HTTP). Khong tu doc clipboard o day de tranh
    // prompt thua tren HTTP va tranh paste 2 lan tren HTTPS.
    if (k === 'v') { return false; }
    return true;
  });

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

  // === Clipboard helpers (co fallback cho HTTP LAN) ===
  // Luu y: navigator.clipboard chi ton tai trong secure context (HTTPS hoac
  // localhost). Khi truy cap qua HTTP tren LAN/VPN thi no la undefined nen nut
  // copy/paste "khong lam gi". Cac ham duoi co fallback de van hoat dong.

  /** Hien thong bao ngan tren terminal (mau xam, khong gui vao tmux). */
  function notify(msg) {
    term.write('\r\n\x1b[2m' + msg + '\x1b[0m\r\n');
  }

  /**
   * Sao chep text vao clipboard. Thu navigator.clipboard truoc, neu khong co
   * thi fallback sang textarea + execCommand('copy').
   * @param {string} text
   * @returns {Promise<boolean>} true neu sao chep thanh cong
   */
  function copyToClipboard(text) {
    if (window.navigator.clipboard && window.navigator.clipboard.writeText) {
      return window.navigator.clipboard.writeText(text).then(function () { return true; })
        .catch(function () { return execCopy(text); });
    }
    return Promise.resolve(execCopy(text));
  }

  /** Fallback copy bang textarea an + execCommand. */
  function execCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }

  /**
   * Doc clipboard roi gui vao terminal. Thu navigator.clipboard truoc, neu
   * khong co thi fallback hoi nguoi dung qua prompt (ho tu Ctrl+Shift+V/dan).
   */
  function pasteFromClipboard() {
    if (window.navigator.clipboard && window.navigator.clipboard.readText) {
      window.navigator.clipboard.readText()
        .then(function (txt) { if (txt) sendInput(txt); })
        .catch(function () { promptPaste(); });
    } else {
      promptPaste();
    }
    term.focus();
  }

  /** Fallback paste: hop thoai cho nguoi dung dan text thu cong. */
  function promptPaste() {
    var txt = window.prompt(t('ctrl.pastePrompt'), '');
    if (txt) sendInput(txt);
  }

  /** Sao chep vung dang chon; bao trang thai len terminal. */
  function copySelection() {
    var sel = term.getSelection();
    if (!sel) { notify(t('ctrl.copyEmpty')); term.focus(); return; }
    copyToClipboard(sel).then(function (ok) {
      if (ok) notify(t('ctrl.copyOk'));
    });
    term.focus();
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

      // Nut copy/paste (co fallback cho HTTP LAN)
      var action = btn.dataset.action;
      if (action === 'copy') { copySelection(); return; }
      if (action === 'paste') { pasteFromClipboard(); return; }

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
