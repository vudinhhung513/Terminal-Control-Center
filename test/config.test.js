// file: test/config.test.js
// Chuc nang: Unit test cho DEFAULTS export tu config.js (shells, theme, language).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS } from '../src/config.js';

describe('config DEFAULTS', () => {
  it('shells la mang khong rong', () => {
    assert.ok(Array.isArray(DEFAULTS.shells));
    assert.ok(DEFAULTS.shells.length > 0);
  });

  it('shell mac dinh la string nam trong shells', () => {
    assert.strictEqual(typeof DEFAULTS.shell, 'string');
    assert.ok(DEFAULTS.shells.includes(DEFAULTS.shell));
  });

  it('theme mac dinh la dark', () => {
    assert.strictEqual(DEFAULTS.theme, 'dark');
  });

  it('language mac dinh la en', () => {
    assert.strictEqual(DEFAULTS.language, 'en');
  });

  it('defaultPath mac dinh la chuoi rong', () => {
    assert.strictEqual(DEFAULTS.defaultPath, '');
  });
});
