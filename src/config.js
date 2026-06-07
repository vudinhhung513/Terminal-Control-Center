// file: src/config.js
// Chuc nang: Doc, validate, merge va GHI cau hinh config.json.
// Cung cap config object dung chung (in-memory) cho toan bo ung dung,
// cho phep cap nhat luc runtime (settings) va ghi atomic xuong dia.

import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import iconv from 'iconv-lite';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const CONFIG_PATH = resolve(PROJECT_ROOT, 'config.json');

// Gia tri mac dinh khi khong co config.json
export const DEFAULTS = {
  host: '0.0.0.0',
  port: 7171,
  authEnabled: false,
  password: '',
  sessionSecret: 'REPLACE_WITH_RANDOM_SECRET',
  shell: 'bash',
  // Danh sach shell cho phep chon khi tao phien (allowlist). La ranh gioi an
  // toan: chi cac gia tri trong day moi duoc truyen vao tmux new-session.
  shells: ['bash', 'zsh', 'sh', 'fish'],
  // Theme giao dien: 'dark' (mac dinh), 'light' hoac 'auto' (theo he dieu hanh).
  theme: 'dark',
  // Thu muc lam viec mac dinh cho phien tmux moi (rong = dung mac dinh cua tmux).
  // Ho tro '~' (home). Khi tao phien se truyen qua 'tmux new-session -c'.
  defaultPath: '',
  tmuxPrefix: 'tcc',
  // Cau hinh font terminal (ap dung phia client xterm.js)
  termFontFamily: 'monospace',
  termFontSize: 14,
  // Bang ma ky tu cua terminal. xterm.js chi hieu UTF-8 nen server se
  // transcode tu bang ma nay sang UTF-8 (va nguoc lai) qua iconv-lite.
  // Vi du: 'utf-8', 'gbk', 'big5', 'euc-kr', 'tis-620', 'shift_jis'.
  termEncoding: 'utf-8',
  // Ngon ngu giao dien: 'en' (mac dinh) hoac 'vi'.
  language: 'en',
  // Cau hinh chong brute-force dang nhap (rate-limit)
  loginRateLimit: {
    enabled: true,
    maxAttempts: 5, // so lan thu toi da
    windowMs: 60000 // trong khoang thoi gian (ms)
  },
  // Cau hinh HTTPS/TLS. Mac dinh BAT de chay secure context => trinh duyet cho
  // phep clipboard API (nut Paste tu doc clipboard) ke ca khi truy cap qua IP.
  // Dat 'enabled: false' trong config.json de tat (chay HTTP).
  // keyPath/certPath la duong dan toi private key va certificate (PEM); de rong
  // thi dung path mac dinh ben duoi va server tu sinh cert self-signed neu chua co.
  // Co the dung tuyet doi hoac tuong doi so voi thu muc goc du an.
  tls: {
    enabled: true,
    keyPath: 'data/tls/key.pem',
    certPath: 'data/tls/cert.pem'
  }
};

// Object config in-memory dung chung toan ung dung (singleton).
let current = null;

/**
 * Validate va chuan hoa mot config object (sua gia tri sai ve mac dinh).
 * @param {object} cfg
 * @returns {object} config da chuan hoa
 */
function normalize(cfg) {
  const c = { ...DEFAULTS, ...cfg };

  // Port phai la so nguyen trong [1, 65535]
  if (!Number.isInteger(c.port) || c.port < 1 || c.port > 65535) {
    c.port = DEFAULTS.port;
  }

  // Co font size hop le
  if (!Number.isFinite(c.termFontSize) || c.termFontSize < 8 || c.termFontSize > 40) {
    c.termFontSize = DEFAULTS.termFontSize;
  }

  // Bang ma phai duoc iconv-lite ho tro, nguoc lai dung mac dinh
  if (typeof c.termEncoding !== 'string' || !iconv.encodingExists(c.termEncoding)) {
    c.termEncoding = DEFAULTS.termEncoding;
  }

  // Ngon ngu chi cho phep 'en' hoac 'vi'
  if (c.language !== 'en' && c.language !== 'vi') {
    c.language = DEFAULTS.language;
  }

  // Theme chi cho phep 'dark', 'light' hoac 'auto'
  if (c.theme !== 'dark' && c.theme !== 'light' && c.theme !== 'auto') {
    c.theme = DEFAULTS.theme;
  }

  // defaultPath phai la string; nguoc lai ve rong
  if (typeof c.defaultPath !== 'string') {
    c.defaultPath = DEFAULTS.defaultPath;
  }

  // shells phai la mang cac chuoi khong rong; loc rong, ve mac dinh neu trong
  if (!Array.isArray(c.shells)) {
    c.shells = [...DEFAULTS.shells];
  } else {
    c.shells = c.shells
      .filter((s) => typeof s === 'string' && s.trim())
      .map((s) => s.trim());
    if (c.shells.length === 0) c.shells = [...DEFAULTS.shells];
  }

  // shell mac dinh phai nam trong allowlist; nguoc lai dung phan tu dau
  if (typeof c.shell !== 'string' || !c.shells.includes(c.shell)) {
    c.shell = c.shells[0];
  }

  // Merge sau cho loginRateLimit (tranh thieu field)
  c.loginRateLimit = { ...DEFAULTS.loginRateLimit, ...(cfg.loginRateLimit || {}) };
  if (!Number.isInteger(c.loginRateLimit.maxAttempts) || c.loginRateLimit.maxAttempts < 1) {
    c.loginRateLimit.maxAttempts = DEFAULTS.loginRateLimit.maxAttempts;
  }
  if (!Number.isInteger(c.loginRateLimit.windowMs) || c.loginRateLimit.windowMs < 1000) {
    c.loginRateLimit.windowMs = DEFAULTS.loginRateLimit.windowMs;
  }

  // Merge sau cho tls; chuan hoa kieu du lieu
  c.tls = { ...DEFAULTS.tls, ...(cfg.tls || {}) };
  c.tls.enabled = c.tls.enabled === true;
  // Path rong/sai kieu => dung path mac dinh (server tu sinh cert tai do)
  if (typeof c.tls.keyPath !== 'string' || !c.tls.keyPath.trim()) {
    c.tls.keyPath = DEFAULTS.tls.keyPath;
  }
  if (typeof c.tls.certPath !== 'string' || !c.tls.certPath.trim()) {
    c.tls.certPath = DEFAULTS.tls.certPath;
  }

  return c;
}

/**
 * Doc raw config.json tu dia (khong merge defaults).
 * @returns {object} userConfig (rong neu khong co file)
 */
function readRaw() {
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

/**
 * Doc config.json, merge len DEFAULTS, validate. Cache lai in-memory.
 * @returns {object} config object dung chung
 */
export function loadConfig() {
  if (current) return current;
  current = normalize(readRaw());
  return current;
}

/**
 * Lay config in-memory hien tai (load neu chua co).
 * @returns {object}
 */
export function getConfig() {
  return current || loadConfig();
}

/**
 * Ghi atomic config object xuong config.json (ghi file tam roi rename).
 * @param {object} cfg
 */
function writeConfigFile(cfg) {
  const tmpPath = `${CONFIG_PATH}.tmp`;
  writeFileSync(tmpPath, JSON.stringify(cfg, null, 2) + '\n', 'utf-8');
  renameSync(tmpPath, CONFIG_PATH); // rename atomic tren cung filesystem
}

/**
 * Cap nhat config: merge patch len config hien tai, validate, ghi file,
 * va cap nhat in-memory (cac field khong can restart se hieu luc ngay).
 * @param {object} patch - cac field can thay doi
 * @returns {object} config moi da chuan hoa
 */
export function saveConfig(patch) {
  const merged = normalize({ ...getConfig(), ...patch });
  writeConfigFile(merged);

  // Cap nhat in-memory tai cho de auth/font hieu luc ngay
  Object.keys(merged).forEach((k) => { current[k] = merged[k]; });
  return current;
}
