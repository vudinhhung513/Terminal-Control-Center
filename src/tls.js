// file: src/tls.js
// Chuc nang: Tu dong dam bao co chung chi HTTPS self-signed cho server.
//   - Do cac IPv4 cua may de dua vao truong SAN (Subject Alternative Name)
//     => trinh duyet chap nhan cert khi truy cap qua IP.
//   - Neu chua co file key/cert thi tu sinh bang openssl (khong them dependency).
//   - Tra ve duong dan tuyet doi de server.js nap vao Fastify.
// Muc dich: nguoi dung chi can bat tls.enabled, khong phai chay lenh thu cong.

import { networkInterfaces } from 'node:os';
import { existsSync, mkdirSync, chmodSync } from 'node:fs';
import { resolve, dirname, isAbsolute } from 'node:path';
import { execFileSync } from 'node:child_process';

// Thoi han cert (ngay). 825 la gioi han nhieu trinh duyet chap nhan cho cert tu ky.
const CERT_DAYS = 825;

/**
 * Lay danh sach dia chi IPv4 (khong loopback) cua may, de dua vao SAN.
 * @returns {string[]} vd: ['192.168.1.50', '10.0.0.3']
 */
export function getLocalIPv4s() {
  const result = [];
  const ifaces = networkInterfaces();
  // Duyet tung interface mang, gom cac dia chi IPv4 noi bo
  for (const name of Object.keys(ifaces)) {
    for (const net of ifaces[name] || []) {
      // Node >=18 dung net.family === 'IPv4'; bo loopback (da co 127.0.0.1 rieng)
      if (net.family === 'IPv4' && !net.internal) {
        result.push(net.address);
      }
    }
  }
  return result;
}

/**
 * Dung chuoi SAN cho openssl. Luon co localhost + 127.0.0.1, cong them cac IPv4
 * cua may va cac ten (IP/hostname) nguoi dung khai bao them.
 * @param {string[]} [extraNames] - IP/hostname bo sung
 * @returns {string} vd: 'DNS:localhost,IP:127.0.0.1,IP:192.168.1.50'
 */
export function buildSanString(extraNames = []) {
  const entries = ['DNS:localhost', 'IP:127.0.0.1'];
  const ipRegex = /^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/;
  // Gop IP cua may + ten nguoi dung them, phan loai IP vs DNS, loc trung
  const candidates = [...getLocalIPv4s(), ...extraNames];
  for (const raw of candidates) {
    const host = String(raw || '').trim();
    if (!host) continue;
    const entry = ipRegex.test(host) ? `IP:${host}` : `DNS:${host}`;
    if (!entries.includes(entry)) entries.push(entry);
  }
  return entries.join(',');
}

/**
 * Sinh cap key+cert self-signed (PEM) bang openssl, ghi vao keyPath/certPath.
 * @param {string} keyPath - duong dan tuyet doi private key
 * @param {string} certPath - duong dan tuyet doi certificate
 * @param {string} sanString - chuoi SAN (buildSanString)
 * @throws neu openssl khong co hoac sinh that bai
 */
export function generateCert(keyPath, certPath, sanString) {
  // Dam bao thu muc dich ton tai
  mkdirSync(dirname(keyPath), { recursive: true });
  mkdirSync(dirname(certPath), { recursive: true });

  // CN lay tu entry IP/DNS dau tien sau localhost (neu co), nguoc lai 'localhost'
  const firstHost = sanString.split(',').map((e) => e.split(':')[1]).find((h) => h && h !== 'localhost') || 'localhost';

  // Goi openssl sinh key+cert mot lan; -addext dua SAN vao de chap nhan IP
  execFileSync('openssl', [
    'req', '-x509', '-newkey', 'rsa:2048', '-nodes',
    '-keyout', keyPath,
    '-out', certPath,
    '-days', String(CERT_DAYS),
    '-subj', `/CN=${firstHost}`,
    '-addext', `subjectAltName=${sanString}`
  ], { stdio: 'ignore' });

  // Khoa quyen private key (chi chu so huu doc)
  try { chmodSync(keyPath, 0o600); } catch { /* he dieu hanh khong ho tro chmod */ }
}

/**
 * Dam bao co cert hop le truoc khi chay HTTPS. Neu thieu key hoac cert thi tu sinh.
 * @param {object} tls - config.tls ({ keyPath, certPath, extraNames? })
 * @param {string} projectRoot - thu muc goc du an (de giai path tuong doi)
 * @returns {{ keyPath: string, certPath: string, generated: boolean, san?: string }}
 *          duong dan tuyet doi + co vua sinh moi hay khong
 */
export function ensureCert(tls, projectRoot) {
  // Giai duong dan tuyet doi (cho phep tuyet doi hoac tuong doi goc du an)
  const keyPath = isAbsolute(tls.keyPath) ? tls.keyPath : resolve(projectRoot, tls.keyPath);
  const certPath = isAbsolute(tls.certPath) ? tls.certPath : resolve(projectRoot, tls.certPath);

  // Da co du ca hai file => dung luon, khong sinh lai
  if (existsSync(keyPath) && existsSync(certPath)) {
    return { keyPath, certPath, generated: false };
  }

  // Thieu it nhat mot file => sinh moi voi SAN gom IP may + ten khai bao them
  const extra = Array.isArray(tls.extraNames) ? tls.extraNames : [];
  const san = buildSanString(extra);
  generateCert(keyPath, certPath, san);
  return { keyPath, certPath, generated: true, san };
}
