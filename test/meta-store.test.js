// file: test/meta-store.test.js
// Chuc nang: Unit test cho meta-store (ghi chu, thu tu, lastAccess, rename).
// Dung thu muc tam qua env TCC_DATA_DIR de khong dung du lieu that.

import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Tao thu muc tam TRUOC khi import module (path tinh lazy nen co hieu luc)
const tmpDir = mkdtempSync(join(tmpdir(), 'tcc-meta-'));
process.env.TCC_DATA_DIR = tmpDir;

const meta = await import('../src/meta-store.js');

describe('meta-store', () => {
  after(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('getMeta tao record mac dinh cho phien moi', () => {
    const rec = meta.getMeta('alpha');
    assert.strictEqual(rec.note, '');
    assert.strictEqual(rec.lastAccess, 0);
    assert.strictEqual(typeof rec.order, 'number');
  });

  it('setNote luu va doc lai ghi chu', () => {
    meta.setNote('alpha', 'phien build frontend');
    assert.strictEqual(meta.getMeta('alpha').note, 'phien build frontend');
  });

  it('touch cap nhat lastAccess > 0', () => {
    meta.touch('alpha');
    assert.ok(meta.getMeta('alpha').lastAccess > 0);
  });

  it('setOrder gan order theo index mang', () => {
    meta.setOrder(['beta', 'alpha']);
    assert.strictEqual(meta.getMeta('beta').order, 0);
    assert.strictEqual(meta.getMeta('alpha').order, 1);
  });

  it('rename giu nguyen metadata va doi key', () => {
    meta.setNote('alpha', 'ghi chu cu');
    meta.rename('alpha', 'alpha2');
    const all = meta.getAllMeta();
    assert.strictEqual(all.alpha, undefined);
    assert.strictEqual(all.alpha2.note, 'ghi chu cu');
  });

  it('remove xoa metadata cua phien', () => {
    meta.remove('alpha2');
    assert.strictEqual(meta.getAllMeta().alpha2, undefined);
  });
});
