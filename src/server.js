// file: src/server.js
// Chuc nang: Entry point — doc config + version, dung app qua buildApp, listen.

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

import { loadConfig, saveConfig } from './config.js';
import { buildApp } from './app.js';
import { ensureCert } from './tls.js';
import { startLoggerLoop } from './session-logger.js';

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

// Chuan bi tuy chon Fastify; bat HTTPS neu config.tls.enabled.
// Chay HTTPS => secure context => trinh duyet cho phep clipboard API (nut Paste).
const fastifyOptions = { logger: true };
let isHttps = false;
if (config.tls.enabled) {
  try {
    // Tu dam bao co cert: thieu thi tu sinh self-signed (IP may trong SAN).
    // Nguoi dung khong can chay lenh thu cong.
    const { keyPath, certPath, generated, san } = ensureCert(config.tls, PROJECT_ROOT);
    if (generated) {
      console.log(`Da tu sinh cert HTTPS self-signed: ${certPath}`);
      console.log(`SAN: ${san}`);
      // Tu ghi duong dan da giai vao config.json (nguoi dung khong phai sua tay)
      saveConfig({ tls: { ...config.tls, keyPath, certPath } });
    }
    fastifyOptions.https = {
      key: readFileSync(keyPath),
      cert: readFileSync(certPath)
    };
    isHttps = true;
  } catch (err) {
    // Sinh/doc cert that bai (vd thieu openssl) => bao loi ro rang roi thoat,
    // tranh chay nham HTTP khi nguoi dung muon HTTPS.
    console.error(`Loi chuan bi cert/key TLS: ${err.message}`);
    console.error('Kiem tra openssl da cai dat (sudo apt install openssl) va quyen ghi data/tls/.');
    process.exit(1);
  }
}

// Dung app (chua listen)
const app = await buildApp(config, { version: APP_VERSION, fastifyOptions });

// Khoi dong server
try {
  await app.listen({ host: config.host, port: config.port });

  const addr = `${isHttps ? 'https' : 'http'}://${config.host}:${config.port}`;
  app.log.info(`Terminal Control Center dang chay tai ${addr}`);

  // Khoi dong vong lap ghi log terminal (pump stream + don log cu dinh ky).
  // Chi chay khi server that su listen (khong chay trong test inject).
  startLoggerLoop();

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
