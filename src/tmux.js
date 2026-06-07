// file: src/tmux.js
// Chuc nang: Quan ly phien tmux — list, create, kill, has-session.
// Dung execFile voi mang tham so de chong command injection.

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { loadConfig } from './config.js';

const execFileAsync = promisify(execFile);

/**
 * Kiem tra ten phien hop le: chi cho phep A-Za-z0-9_- , do dai 1..64
 * @param {string} name
 * @returns {boolean}
 */
export function validateName(name) {
  if (typeof name !== 'string') return false;
  if (name.length < 1 || name.length > 64) return false;
  return /^[A-Za-z0-9_-]+$/.test(name);
}

/**
 * Lay danh sach tat ca phien tmux hien co (ke ca phien mo thu cong).
 * @returns {Promise<Array<{name:string, created:number, windows:number, attached:boolean}>>}
 */
export async function listSessions() {
  try {
    const { stdout } = await execFileAsync('tmux', [
      'list-sessions',
      '-F',
      '#{session_name}|#{session_created}|#{session_windows}|#{session_attached}'
    ]);

    const lines = stdout.trim().split('\n').filter(Boolean);
    return lines.map((line) => {
      const [name, created, windows, attached] = line.split('|');
      return {
        name,
        created: Number(created),
        windows: Number(windows),
        attached: attached === '1'
      };
    });
  } catch (err) {
    // Khong co tmux server hoac loi khac → tra mang rong
    if (
      err.stderr?.includes('no server running') ||
      err.stderr?.includes('no current client') ||
      err.code !== undefined
    ) {
      return [];
    }
    return [];
  }
}

/**
 * Tao phien tmux moi.
 * @param {string} [name] - Ten phien (tu sinh neu rong/undefined)
 * @param {object} [config] - Config object (mac dinh loadConfig())
 * @param {string} [shell] - Shell chon khi tao (phai nam trong config.shells)
 * @returns {Promise<string>} Ten phien da tao
 */
export async function createSession(name, config, shell) {
  if (!config) config = loadConfig();

  // Tu sinh ten neu khong truyen
  if (!name) {
    name = `${config.tmuxPrefix}-${Date.now().toString(36)}`;
  }

  // Validate
  if (!validateName(name)) {
    throw new Error(`Invalid session name: ${name}`);
  }

  // Chon shell: chi chap nhan shell nam trong allowlist; nguoc lai dung mac dinh.
  // Allowlist la ranh gioi an toan, chong truyen lenh tuy y vao tmux.
  let chosenShell = config.shell;
  if (shell !== undefined && shell !== null && shell !== '') {
    if (!Array.isArray(config.shells) || !config.shells.includes(shell)) {
      throw new Error(`Shell not allowed: ${shell}`);
    }
    chosenShell = shell;
  }

  const args = ['new-session', '-d', '-s', name, chosenShell];
  await execFileAsync('tmux', args);
  return name;
}

/**
 * Kill phien tmux theo ten.
 * @param {string} name
 */
export async function killSession(name) {
  if (!validateName(name)) {
    throw new Error(`Invalid session name: ${name}`);
  }
  await execFileAsync('tmux', ['kill-session', '-t', name]);
}

/**
 * Doi ten phien tmux.
 * @param {string} oldName
 * @param {string} newName
 */
export async function renameSession(oldName, newName) {
  if (!validateName(oldName) || !validateName(newName)) {
    throw new Error('Invalid session name');
  }
  await execFileAsync('tmux', ['rename-session', '-t', oldName, newName]);
}

// So dong cuon moi lan bam nut (cuon tung phan cho de kiem soat)
const SCROLL_LINES = '5';

/**
 * Cuon noi dung phien tmux qua copy-mode (cuon xterm client-side khong dung
 * duoc vi tmux chiem alternate-screen). Hanh dong tac dong len pane, client
 * dang attach se thay thay doi truc tiep.
 * @param {string} name
 * @param {'up'|'down'|'top'|'bottom'} action
 */
export async function scrollSession(name, action) {
  if (!validateName(name)) {
    throw new Error(`Invalid session name: ${name}`);
  }

  switch (action) {
    case 'up':
      // Vao copy-mode (no-op neu da o trong) roi cuon len
      await execFileAsync('tmux', ['copy-mode', '-t', name]);
      await execFileAsync('tmux', ['send-keys', '-t', name, '-X', '-N', SCROLL_LINES, 'scroll-up']);
      break;
    case 'down':
      await execFileAsync('tmux', ['copy-mode', '-t', name]);
      await execFileAsync('tmux', ['send-keys', '-t', name, '-X', '-N', SCROLL_LINES, 'scroll-down']);
      break;
    case 'top':
      // Len dau lich su
      await execFileAsync('tmux', ['copy-mode', '-t', name]);
      await execFileAsync('tmux', ['send-keys', '-t', name, '-X', 'history-top']);
      break;
    case 'bottom':
      // Thoat copy-mode -> ve live view (cuoi cung). Bo qua loi neu chua o trong mode.
      try {
        await execFileAsync('tmux', ['send-keys', '-t', name, '-X', 'cancel']);
      } catch {
        // Khong o trong copy-mode -> da o cuoi roi
      }
      break;
    default:
      throw new Error(`Invalid scroll action: ${action}`);
  }
}

/**
 * Kiem tra phien tmux co ton tai khong.
 * @param {string} name
 * @returns {Promise<boolean>}
 */
export async function hasSession(name) {
  if (!validateName(name)) {
    throw new Error(`Invalid session name: ${name}`);
  }
  try {
    await execFileAsync('tmux', ['has-session', '-t', name]);
    return true;
  } catch {
    return false;
  }
}
