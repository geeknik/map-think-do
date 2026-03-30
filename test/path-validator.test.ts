import assert from 'assert/strict';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { safeWriteFile, validatePath } from '../src/utils/path-validator.js';

export async function runPathValidatorTests(): Promise<void> {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'map-think-do-paths-'));
  const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'map-think-do-outside-'));
  const linkedDir = path.join(base, 'linked');

  try {
    await fs.symlink(outside, linkedDir, 'dir');

    await assert.rejects(
      () => validatePath(path.join(linkedDir, 'escape.txt'), base, false),
      /Path traversal attempt detected/,
      'symlinked parent directories must not escape the allowed base'
    );

    await assert.rejects(
      () => safeWriteFile(path.join(linkedDir, 'escape.txt'), 'denied', base),
      /Path traversal attempt detected/,
      'writes through symlink escapes must be blocked'
    );

    const safePath = path.join(base, 'nested', 'safe.txt');
    await safeWriteFile(safePath, 'ok', base);
    assert.equal(await fs.readFile(safePath, 'utf8'), 'ok');

    console.log('✅ path-validator tests passed');
  } finally {
    await fs.rm(base, { recursive: true, force: true });
    await fs.rm(outside, { recursive: true, force: true });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runPathValidatorTests().catch(error => {
    console.error('💥 path-validator tests failed', error);
    process.exit(1);
  });
}
