// file: test/session-logger.test.js
// Chuc nang: Unit test cho cac tien ich noi bo cua session-logger:
// dung lai dong (assembleLines: xu ly \r, \n, backspace), strip ANSI,
// va heuristic loc dong lenh (PROMPT_RE) cho che do 'input'.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { _internal } from '../src/session-logger.js';

const { assembleLines, ANSI_RE, PROMPT_RE } = _internal;

describe('assembleLines', () => {
  it('tach dong theo \\n va giu phan con do', () => {
    const { lines, rest } = assembleLines('', 'abc\ndef');
    assert.deepStrictEqual(lines, ['abc']);
    assert.strictEqual(rest, 'def');
  });

  it('noi tiep phan con do tu lan truoc', () => {
    const { lines, rest } = assembleLines('abc', 'def\n');
    assert.deepStrictEqual(lines, ['abcdef']);
    assert.strictEqual(rest, '');
  });

  it('backspace xoa ky tu truoc con tro', () => {
    const { rest } = assembleLines('', 'abc\b\bX');
    assert.strictEqual(rest, 'aX');
  });

  it('carriage-return ghi de tu dau dong', () => {
    const { rest } = assembleLines('', 'hello\rHE');
    assert.strictEqual(rest, 'HEllo');
  });
});

describe('ANSI_RE', () => {
  it('loai bo ma mau CSI', () => {
    const out = '\u001b[1;31mRED\u001b[0m'.replace(ANSI_RE, '');
    assert.strictEqual(out, 'RED');
  });

  it('giu nguyen van ban thuong', () => {
    const out = 'plain text 123'.replace(ANSI_RE, '');
    assert.strictEqual(out, 'plain text 123');
  });
});

describe('PROMPT_RE (loc dong lenh che do input)', () => {
  it('bat dong lenh sau dau prompt $', () => {
    const m = PROMPT_RE.exec('user@host:~$ ls -la');
    assert.ok(m);
    assert.strictEqual(m[1], 'ls -la');
  });

  it('bat dong lenh sau dau prompt #', () => {
    const m = PROMPT_RE.exec('root@host:/# whoami');
    assert.ok(m);
    assert.strictEqual(m[1], 'whoami');
  });

  it('khong bat dong output thuong (khong co prompt)', () => {
    const m = PROMPT_RE.exec('total 64 drwxr-xr-x');
    assert.strictEqual(m, null);
  });
});
