// file: test/password.test.js
// Chuc nang: Unit test cho hash/verify mat khau scrypt (chay offline).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, isHashed } from '../src/password.js';

describe('password', () => {
  it('hashPassword tao chuoi dang scrypt$salt$hash', () => {
    const h = hashPassword('secret123');
    assert.ok(isHashed(h));
    assert.strictEqual(h.split('$').length, 3);
  });

  it('hai lan hash cung mat khau ra ket qua khac nhau (salt ngau nhien)', () => {
    assert.notStrictEqual(hashPassword('abc'), hashPassword('abc'));
  });

  it('verifyPassword dung voi mat khau da hash', () => {
    const h = hashPassword('correct horse');
    assert.strictEqual(verifyPassword('correct horse', h), true);
  });

  it('verifyPassword sai khi mat khau khong khop', () => {
    const h = hashPassword('correct horse');
    assert.strictEqual(verifyPassword('wrong', h), false);
  });

  it('verifyPassword ho tro plaintext cu (tuong thich nguoc)', () => {
    assert.strictEqual(verifyPassword('plain', 'plain'), true);
    assert.strictEqual(verifyPassword('plain', 'other'), false);
  });

  it('isHashed phan biet hash va plaintext', () => {
    assert.strictEqual(isHashed(hashPassword('x')), true);
    assert.strictEqual(isHashed('plaintext'), false);
    assert.strictEqual(isHashed(''), false);
  });

  it('verifyPassword tra false voi dau vao khong phai string', () => {
    assert.strictEqual(verifyPassword(null, 'x'), false);
    assert.strictEqual(verifyPassword('x', null), false);
  });

  it('verifyPassword tra false khi hash sai dinh dang', () => {
    assert.strictEqual(verifyPassword('x', 'scrypt$onlytwo'), false);
  });
});
