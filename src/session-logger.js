// file: src/session-logger.js
// Chuc nang: Ghi log noi dung terminal ra file theo tung phien tmux.
//
// Cach hoat dong: dung `tmux pipe-pane` (xem tmux.js) de chuyen huong toan bo
// output cua pane sang file raw data/logs/<phien>.stream. Mot vong lap toan cuc
// (pump) doc phan byte MOI cua tung .stream theo offset, strip ma ANSI, dung lai
// tung dong (xu ly \r va backspace) roi ghi ra data/logs/<phien>.log.
//
// Doc truc tiep tu luong CLI (pane) nen khong phu thuoc client WebSocket va
// khong log trung khi nhieu client cung mo. Day la nguon duy nhat moi pane.
//
// Che do (config.logging.mode):
//   - 'off'   : khong ghi.
//   - 'full'  : ghi MOI dong da strip ANSI (ca lenh lan output), kem timestamp.
//   - 'input' : best-effort chi ghi DONG LENH (heuristic theo dau prompt $ # % >).
//
// CANH BAO bao mat: che do 'input'/'full' co the ghi lai mat khau go o prompt
// (sudo/ssh...). Mac dinh tat trong config.

import { readSync, readFileSync, openSync, closeSync, fstatSync, appendFileSync, mkdirSync, existsSync, statSync, readdirSync, unlinkSync, renameSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getConfig } from './config.js';
import { listSessions, startPipePane, stopPipePane, validateName } from './tmux.js';
import { getAllMeta } from './meta-store.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');

// Regex strip ma escape ANSI (CSI, OSC, va cac escape don le) cho file de doc.
const ANSI_RE = /[\u001B\u009B][[\]()#;?]*(?:(?:[a-zA-Z0-9;]*)?\u0007|(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-PR-TZcf-ntqry=><~])/g;

// Heuristic nhan dien dong "prompt + lenh": co dau prompt ($ # % >) theo sau
// boi khoang trang va noi dung lenh. Dung de loc dong lenh o che do 'input'.
const PROMPT_RE = /[$#%>]\s+(\S.*)$/;

// Chu ky pump (ms): doc phan stream moi va ghi log.
const PUMP_INTERVAL_MS = 1000;

// Trang thai theo tung phien: { fd, offset, partial, lineBuf }.
const sessions = new Map();
// Interval pump toan cuc (chi tao 1 lan).
let pumpTimer = null;

/** Thu muc data goc (cho phep override qua env TCC_DATA_DIR). */
function dataDir() {
  return process.env.TCC_DATA_DIR ? resolve(process.env.TCC_DATA_DIR) : resolve(PROJECT_ROOT, 'data');
}

/** Thu muc chua log. */
function logsDir() {
  return resolve(dataDir(), 'logs');
}

/** Dam bao thu muc logs/ ton tai. */
function ensureLogsDir() {
  const dir = logsDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

/** Duong dan file raw (pipe-pane ghi vao). */
function streamPath(name) {
  return resolve(logsDir(), `${name}.stream`);
}

/** Duong dan file log da xu ly (con nguoi doc). */
function logPath(name) {
  return resolve(logsDir(), `${name}.log`);
}

/** Tao prefix timestamp ISO cho moi dong log. */
function ts() {
  return new Date().toISOString();
}

/**
 * Ap dung backspace va carriage-return de dung lai dong cuoi cung hien thi.
 * Tra ve { lines, rest }: cac dong da hoan tat va phan dong dang dang do.
 * @param {string} prev - phan dong dang do tu lan truoc
 * @param {string} chunk - van ban moi (da strip ANSI)
 */
function assembleLines(prev, chunk) {
  const lines = [];
  let cur = prev;
  let col = cur.length; // vi tri con tro trong dong hien tai

  for (const ch of chunk) {
    if (ch === '\n') {
      lines.push(cur);
      cur = '';
      col = 0;
    } else if (ch === '\r') {
      col = 0; // ve dau dong (overwrite)
    } else if (ch === '\b' || ch === '\u007f') {
      if (col > 0) {
        col -= 1;
        cur = cur.slice(0, col) + cur.slice(col + 1);
      }
    } else {
      // Ghi de tai vi tri con tro (mo phong overwrite sau \r)
      cur = cur.slice(0, col) + ch + cur.slice(col + 1);
      col += 1;
    }
  }
  return { lines, rest: cur };
}

/**
 * Ghi cac dong da hoan tat ra file log theo che do.
 * @param {string} name
 * @param {string[]} lines
 * @param {'input'|'full'} mode
 */
function writeLines(name, lines, mode) {
  if (lines.length === 0) return;
  const out = [];
  for (const line of lines) {
    if (mode === 'full') {
      out.push(`[${ts()}] ${line}`);
    } else {
      // input: chi ghi dong co dang prompt + lenh (best-effort)
      const m = PROMPT_RE.exec(line);
      if (m && m[1].trim()) {
        out.push(`[${ts()}] ${m[1].trim()}`);
      }
    }
  }
  if (out.length > 0) {
    appendFileSync(logPath(name), out.join('\n') + '\n', 'utf-8');
  }
}

/**
 * Doc phan byte moi cua .stream cho mot phien va xu ly ghi log.
 * @param {string} name
 * @param {'input'|'full'} mode
 */
function pumpSession(name, mode) {
  const st = sessions.get(name);
  if (!st) return;
  const path = streamPath(name);

  try {
    // Mo fd neu chua co (hoac file moi xuat hien sau khi bat pipe-pane)
    if (st.fd === null) {
      if (!existsSync(path)) return;
      st.fd = openSync(path, 'r');
      st.offset = 0;
    }

    const stat = fstatSync(st.fd);
    if (stat.size <= st.offset) return; // khong co byte moi

    const len = stat.size - st.offset;
    const buf = Buffer.allocUnsafe(len);
    const read = readSync(st.fd, buf, 0, len, st.offset);
    st.offset += read;

    // Gop voi phan byte da byte bi cat ngang lan truoc, decode UTF-8
    const text = Buffer.concat([st.partial, buf.subarray(0, read)]).toString('utf-8');
    st.partial = Buffer.alloc(0);

    const stripped = text.replace(ANSI_RE, '');
    const { lines, rest } = assembleLines(st.lineBuf, stripped);
    st.lineBuf = rest;
    writeLines(name, lines, mode);
  } catch {
    // Loi doc tam thoi (file bi xoay/xoa) -> reset de lan sau mo lai
    if (st.fd !== null) {
      try { closeSync(st.fd); } catch { /* da dong */ }
    }
    st.fd = null;
    st.offset = 0;
  }
}

/** Vong lap pump toan cuc: chay cho moi phien dang theo doi. */
function pumpAll() {
  const mode = getConfig().logging.mode;
  if (mode === 'off') return;
  for (const name of sessions.keys()) {
    pumpSession(name, mode);
  }
}

/**
 * Dam bao mot phien dang duoc ghi log (bat pipe-pane + dang ky theo doi).
 * Khong lam gi neu logging tat. An toan khi goi lai nhieu lan.
 * @param {string} name
 */
export async function ensureLogging(name) {
  const mode = getConfig().logging.mode;
  if (mode === 'off') return;
  ensureLogsDir();
  if (!sessions.has(name)) {
    sessions.set(name, { fd: null, offset: 0, partial: Buffer.alloc(0), lineBuf: '' });
  }
  try {
    await startPipePane(name, streamPath(name));
  } catch {
    // Phien khong ton tai/loi tmux -> bo theo doi
    sessions.delete(name);
  }
}

/**
 * Dung ghi log cho mot phien (tat pipe-pane + huy theo doi).
 * @param {string} name
 */
export async function stopLogging(name) {
  const st = sessions.get(name);
  if (st && st.fd !== null) {
    try { closeSync(st.fd); } catch { /* da dong */ }
  }
  sessions.delete(name);
  try {
    await stopPipePane(name);
  } catch {
    // Phien co the da bi kill
  }
}

/**
 * Doi ten file log khi phien tmux duoc rename, de log khop voi ten phien moi.
 * Dung ghi log ten cu (dong fd + tat pipe-pane), di chuyen file .log sang ten
 * moi (giu lich su), xoa .stream cu (se duoc tao lai theo ten moi), roi bat lai
 * ghi log cho ten moi neu logging dang bat. An toan khi log tat hoac chua co file.
 * @param {string} oldName
 * @param {string} newName
 */
export async function renameLog(oldName, newName) {
  if (!validateName(oldName) || !validateName(newName) || oldName === newName) return;

  // Dung theo doi ten cu (dong fd, tat pipe-pane cu)
  await stopLogging(oldName);

  // Di chuyen file log da xu ly sang ten moi (giu lich su)
  try {
    if (existsSync(logPath(oldName))) {
      renameSync(logPath(oldName), logPath(newName));
    }
  } catch {
    // Khong di chuyen duoc -> bo qua, tranh chan luong rename phien
  }

  // Xoa stream raw cu (pipe-pane cho ten moi se tao lai file moi)
  try {
    if (existsSync(streamPath(oldName))) unlinkSync(streamPath(oldName));
  } catch {
    // Bo qua
  }

  // Bat lai ghi log cho ten moi neu logging dang bat
  if (getConfig().logging.mode !== 'off') {
    await ensureLogging(newName);
  }
}

/**
 * Ap dung che do logging hien tai cho tat ca phien dang chay.
 * Goi sau khi nguoi dung doi config.logging.mode trong Settings.
 */
export async function applyLoggingToAll() {
  const mode = getConfig().logging.mode;
  const all = await listSessions();
  if (mode === 'off') {
    // Tat het pipe-pane dang bat
    for (const s of all) {
      await stopLogging(s.name);
    }
    return;
  }
  for (const s of all) {
    await ensureLogging(s.name);
  }
}

/**
 * Xoa file log cua cac phien qua han retention (tinh tu lan active cuoi).
 * lastAccess lay tu meta-store; phien khong co meta dung mtime file.
 */
export function cleanupOldLogs() {
  const cfg = getConfig();
  const dir = logsDir();
  if (!existsSync(dir)) return;

  const retentionMs = cfg.logging.retentionDays * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const allMeta = getAllMeta();

  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.log') && !file.endsWith('.stream')) continue;
    const name = file.replace(/\.(log|stream)$/, '');
    const full = resolve(dir, name + (file.endsWith('.log') ? '.log' : '.stream'));

    // Moc thoi gian active: uu tien lastAccess trong meta, neu khong dung mtime
    let lastActive = allMeta[name] && allMeta[name].lastAccess ? allMeta[name].lastAccess : 0;
    if (!lastActive) {
      try { lastActive = statSync(full).mtimeMs; } catch { continue; }
    }

    if (now - lastActive > retentionMs) {
      // Khong xoa log cua phien dang theo doi de tranh mat du lieu dang ghi
      if (file.endsWith('.stream') && sessions.has(name)) continue;
      try { unlinkSync(full); } catch { /* bo qua */ }
    }
  }
}

/**
 * Liet ke cac file log da xu ly (.log) trong thu muc logs.
 * Tra ve mang { name, size, mtime } sap xep theo mtime giam dan.
 * Chi tinh file .log (bo qua .stream raw noi bo).
 * @returns {Array<{name:string, size:number, mtime:number}>}
 */
export function listLogs() {
  const dir = logsDir();
  if (!existsSync(dir)) return [];
  const out = [];
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.log')) continue;
    const name = file.replace(/\.log$/, '');
    // Bo qua ten khong hop le (an toan, tranh hien file la)
    if (!validateName(name)) continue;
    try {
      const st = statSync(resolve(dir, file));
      out.push({ name, size: st.size, mtime: st.mtimeMs });
    } catch {
      // File vua bi xoa giua chung -> bo qua
    }
  }
  out.sort((a, b) => b.mtime - a.mtime);
  return out;
}

/**
 * Doc noi dung file log da xu ly cua mot phien (read-only).
 * Validate ten chong path traversal. Tra ve null neu khong ton tai.
 * @param {string} name - ten phien
 * @returns {string|null} noi dung log (UTF-8) hoac null
 */
export function readLog(name) {
  if (!validateName(name)) return null;
  const path = logPath(name);
  if (!existsSync(path)) return null;
  try {
    return readFileSync(path, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Xoa file log da xu ly cua mot phien. KHONG dung ghi log dang chay (chi xoa
 * file .log; neu phien dang theo doi, pump se tao lai dong moi vao file moi).
 * Validate ten chong path traversal.
 * @param {string} name - ten phien
 * @returns {boolean} true neu da xoa (hoac file von khong ton tai)
 */
export function deleteLog(name) {
  if (!validateName(name)) return false;
  const path = logPath(name);
  if (!existsSync(path)) return false;
  try {
    unlinkSync(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Khoi dong vong lap logging: bat pipe-pane cho phien dang chay (neu can),
 * chay pump dinh ky va don log cu dinh ky. Goi mot lan luc khoi dong app.
 * Tra ve ham dung (clear interval) — huu ich cho test.
 */
export function startLoggerLoop() {
  if (pumpTimer) return () => {};

  // Bat pipe-pane cho cac phien dang chay neu logging dang bat
  applyLoggingToAll().catch(() => { /* bo qua loi tmux luc khoi dong */ });

  // Pump doc stream moi giay
  pumpTimer = setInterval(pumpAll, PUMP_INTERVAL_MS);
  // Khong giu tien trinh song chi vi timer nay
  if (pumpTimer.unref) pumpTimer.unref();

  // Don log cu ngay luc khoi dong + moi 6 gio
  cleanupOldLogs();
  const cleanupTimer = setInterval(cleanupOldLogs, 6 * 60 * 60 * 1000);
  if (cleanupTimer.unref) cleanupTimer.unref();

  return () => {
    clearInterval(pumpTimer);
    clearInterval(cleanupTimer);
    pumpTimer = null;
  };
}

// Export noi bo phuc vu test
export const _internal = { assembleLines, ANSI_RE, PROMPT_RE, streamPath, logPath };
