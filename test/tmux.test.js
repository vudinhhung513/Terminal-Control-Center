// file: test/tmux.test.js
// Chuc nang: Unit test cho ham validateName (chay offline, khong goi tmux that).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { homedir } from 'node:os';
import { validateName, expandHome } from '../src/tmux.js';

describe('validateName', () => {
  // Truong hop hop le
  it('chap nhan ten chi chua chu cai', () => {
    assert.strictEqual(validateName('abc'), true);
  });

  it('chap nhan ten co underscore va dash', () => {
    assert.strictEqual(validateName('a_b-1'), true);
  });

  it('chap nhan ten chi co so', () => {
    assert.strictEqual(validateName('123'), true);
  });

  it('chap nhan ten do dai 1 ky tu', () => {
    assert.strictEqual(validateName('x'), true);
  });

  it('chap nhan ten do dai 64 ky tu', () => {
    assert.strictEqual(validateName('a'.repeat(64)), true);
  });

  // Truong hop khong hop le
  it('tu choi ten co khoang trang', () => {
    assert.strictEqual(validateName('a b'), false);
  });

  it('tu choi ten co dau cham', () => {
    assert.strictEqual(validateName('a.b'), false);
  });

  it('tu choi chuoi rong', () => {
    assert.strictEqual(validateName(''), false);
  });

  it('tu choi ten qua dai (>64 ky tu)', () => {
    assert.strictEqual(validateName('a'.repeat(65)), false);
  });

  it('tu choi ten co ky tu dac biet (;)', () => {
    assert.strictEqual(validateName('a;b'), false);
  });

  it('tu choi gia tri khong phai string', () => {
    assert.strictEqual(validateName(null), false);
    assert.strictEqual(validateName(undefined), false);
    assert.strictEqual(validateName(123), false);
  });
});

describe('expandHome', () => {
  it('doi "~" thanh thu muc home', () => {
    assert.strictEqual(expandHome('~'), homedir());
  });

  it('doi "~/..." thanh duong dan tuyet doi trong home', () => {
    assert.strictEqual(expandHome('~/projects'), homedir() + '/projects');
  });

  it('giu nguyen duong dan tuyet doi khong co ~', () => {
    assert.strictEqual(expandHome('/var/www'), '/var/www');
  });

  it('giu nguyen chuoi rong / gia tri khong phai string', () => {
    assert.strictEqual(expandHome(''), '');
    assert.strictEqual(expandHome(null), null);
  });
});
