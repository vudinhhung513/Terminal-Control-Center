// file: src/config.js
// Chuc nang: Doc va merge cau hinh tu config.json len gia tri mac dinh.
// Tra ve object config dung cho toan bo ung dung.

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');

// Gia tri mac dinh khi khong co config.json
export const DEFAULTS = {
  host: '0.0.0.0',
  port: 7070,
  authEnabled: false,
  password: '',
  sessionSecret: 'REPLACE_WITH_RANDOM_SECRET',
  shell: 'bash',
  tmuxPrefix: 'tcc'
};

/**
 * Doc config.json (neu ton tai) va merge len DEFAULTS.
 * Validate co ban: port phai la so.
 * @returns {object} config object
 */
export function loadConfig() {
  const configPath = resolve(PROJECT_ROOT, 'config.json');
  let userConfig = {};

  try {
    const raw = readFileSync(configPath, 'utf-8');
    userConfig = JSON.parse(raw);
  } catch {
    // Khong co file hoac parse loi → dung defaults
  }

  const config = { ...DEFAULTS, ...userConfig };

  // Validate port la so
  if (typeof config.port !== 'number' || Number.isNaN(config.port)) {
    config.port = DEFAULTS.port;
  }

  return config;
}
