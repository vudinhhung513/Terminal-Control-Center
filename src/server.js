// file: src/server.js
// Chuc nang: Entry point — doc config + version, dung app qua buildApp, listen.

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

import { loadConfig } from './config.js';
import { buildApp } from './app.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');

// Doc version tu package.json (hien thi tren UI)
let APP_VERSION = '0.0.0';
try {
  APP_VERSION = JSON.parse(readFileSync(resolve(PROJECT_ROOT, 'package.json'), 'utf-8')).version;
} catch {
  // Giu mac dinh neu khong doc duoc
}

// Doc cau hinh
const config = loadConfig();

// Dung app (chua listen)
const app = await buildApp(config, { version: APP_VERSION });

// Khoi dong server
try {
  await app.listen({ host: config.host, port: config.port });

  const addr = `http://${config.host}:${config.port}`;
  app.log.info(`Terminal Control Center dang chay tai ${addr}`);

  // Canh bao bao mat
  if (!config.authEnabled) {
    app.log.warn('Auth DISABLED - ai truy cap duoc IP/port deu dung duoc');
  }
  if (config.host === '0.0.0.0') {
    app.log.warn('Server expose ra LAN (host=0.0.0.0). Dam bao mang an toan.');
  }
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
