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

  it('termFontSizeMobile mac dinh la so trong 8..40', () => {
    assert.strictEqual(typeof DEFAULTS.termFontSizeMobile, 'number');
    assert.ok(DEFAULTS.termFontSizeMobile >= 8 && DEFAULTS.termFontSizeMobile <= 40);
  });

  it('multiDeviceMode mac dinh la takeover', () => {
    assert.strictEqual(DEFAULTS.multiDeviceMode, 'takeover');
  });

  it('logging mac dinh tat (mode off)', () => {
    assert.strictEqual(typeof DEFAULTS.logging, 'object');
    assert.strictEqual(DEFAULTS.logging.mode, 'off');
  });

  it('logging.retentionDays mac dinh la so nguyen >= 1', () => {
    assert.ok(Number.isInteger(DEFAULTS.logging.retentionDays));
    assert.ok(DEFAULTS.logging.retentionDays >= 1);
  });

  it('tls mac dinh bat (enabled = true)', () => {
    assert.strictEqual(typeof DEFAULTS.tls, 'object');
    assert.strictEqual(DEFAULTS.tls.enabled, true);
  });

  it('tls co keyPath/certPath la string', () => {
    assert.strictEqual(typeof DEFAULTS.tls.keyPath, 'string');
    assert.strictEqual(typeof DEFAULTS.tls.certPath, 'string');
  });
});
