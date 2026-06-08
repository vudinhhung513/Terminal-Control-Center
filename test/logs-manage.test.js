// file: test/logs-manage.test.js
// Chuc nang: Unit test cho cac ham quan ly log (listLogs/readLog/deleteLog)
// trong session-logger. Dung TCC_DATA_DIR tro toi thu muc tam de cach ly.

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

// Dat TCC_DATA_DIR truoc khi goi cac ham (logsDir doc env luc goi)
const tmpRoot = mkdtempSync(resolve(tmpdir(), 'tcc-logs-'));
process.env.TCC_DATA_DIR = tmpRoot;

const { listLogs, readLog, deleteLog, renameLog } = await import('../src/session-logger.js');

const logsDir = resolve(tmpRoot, 'logs');

describe('quan ly log (listLogs/readLog/deleteLog)', () => {
  before(() => {
    mkdirSync(logsDir, { recursive: true });
    writeFileSync(resolve(logsDir, 'alpha.log'), 'noi dung alpha\n', 'utf-8');
    writeFileSync(resolve(logsDir, 'beta.log'), 'noi dung beta\n', 'utf-8');
    // File khong phai .log -> phai bi bo qua
    writeFileSync(resolve(logsDir, 'alpha.stream'), 'raw', 'utf-8');
  });

  after(() => {
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('listLogs chi liet ke file .log (bo qua .stream)', () => {
    const logs = listLogs();
    const names = logs.map((l) => l.name).sort();
    assert.deepStrictEqual(names, ['alpha', 'beta']);
    assert.ok(logs.every((l) => typeof l.size === 'number' && typeof l.mtime === 'number'));
  });

  it('readLog tra noi dung file log', () => {
    assert.strictEqual(readLog('alpha'), 'noi dung alpha\n');
  });

  it('readLog tra null khi phien khong co log', () => {
    assert.strictEqual(readLog('khongton'), null);
  });

  it('readLog tu choi ten khong hop le (path traversal)', () => {
    assert.strictEqual(readLog('../config'), null);
    assert.strictEqual(readLog('a/b'), null);
  });

  it('deleteLog xoa file log va tra true', () => {
    assert.strictEqual(deleteLog('beta'), true);
    assert.strictEqual(existsSync(resolve(logsDir, 'beta.log')), false);
    assert.strictEqual(readLog('beta'), null);
  });

  it('deleteLog tra false khi khong co file', () => {
    assert.strictEqual(deleteLog('beta'), false);
  });

  it('deleteLog tu choi ten khong hop le', () => {
    assert.strictEqual(deleteLog('../../etc/passwd'), false);
  });

  it('renameLog di chuyen file .log sang ten moi va xoa .stream cu', async () => {
    writeFileSync(resolve(logsDir, 'src.log'), 'noi dung src\n', 'utf-8');
    writeFileSync(resolve(logsDir, 'src.stream'), 'raw', 'utf-8');

    await renameLog('src', 'dst');

    assert.strictEqual(existsSync(resolve(logsDir, 'src.log')), false);
    assert.strictEqual(existsSync(resolve(logsDir, 'src.stream')), false);
    assert.strictEqual(readLog('dst'), 'noi dung src\n');
  });

  it('renameLog bo qua khi ten khong hop le hoac trung nhau', async () => {
    writeFileSync(resolve(logsDir, 'keep.log'), 'giu nguyen\n', 'utf-8');
    await renameLog('keep', 'keep'); // trung -> khong lam gi
    await renameLog('../bad', 'ok'); // ten cu sai -> khong lam gi
    assert.strictEqual(readLog('keep'), 'giu nguyen\n');
  });
});
