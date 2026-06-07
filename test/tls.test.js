// file: test/tls.test.js
// Chuc nang: Unit test cho src/tls.js (buildSanString, ensureCert khi da co file).

import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildSanString, getLocalIPv4s, ensureCert } from '../src/tls.js';

describe('tls.buildSanString', () => {
  it('luon co localhost + 127.0.0.1', () => {
    const san = buildSanString([]);
    assert.ok(san.includes('DNS:localhost'));
    assert.ok(san.includes('IP:127.0.0.1'));
  });

  it('phan loai IP vs hostname dung tien to', () => {
    const san = buildSanString(['10.1.2.3', 'my-host']);
    assert.ok(san.includes('IP:10.1.2.3'));
    assert.ok(san.includes('DNS:my-host'));
  });

  it('khong lap entry trung', () => {
    const san = buildSanString(['127.0.0.1', '127.0.0.1']);
    const count = san.split(',').filter((e) => e === 'IP:127.0.0.1').length;
    assert.strictEqual(count, 1);
  });
});

describe('tls.getLocalIPv4s', () => {
  it('tra ve mang string', () => {
    const ips = getLocalIPv4s();
    assert.ok(Array.isArray(ips));
    ips.forEach((ip) => assert.strictEqual(typeof ip, 'string'));
  });
});

describe('tls.ensureCert', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tcc-tls-'));
  after(() => rmSync(dir, { recursive: true, force: true }));

  it('khong sinh lai khi da co du key+cert', () => {
    // Tao san file key+cert gia trong thu muc tam
    writeFileSync(join(dir, 'key.pem'), 'KEY');
    writeFileSync(join(dir, 'cert.pem'), 'CERT');
    const res = ensureCert({ keyPath: 'key.pem', certPath: 'cert.pem' }, dir);
    assert.strictEqual(res.generated, false);
    assert.strictEqual(res.keyPath, join(dir, 'key.pem'));
    assert.strictEqual(res.certPath, join(dir, 'cert.pem'));
  });
});
