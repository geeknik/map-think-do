import assert from 'assert/strict';
import fs from 'fs/promises';
import path from 'path';
import { FileSystemStore } from '../src/memory/file-system-store.js';
import { MemoryUtils, StoredThought } from '../src/memory/memory-store.js';

async function run() {
  const base = path.join(process.cwd(), 'tmp-memory-test');
  await fs.rm(base, { recursive: true, force: true });

  const store = new FileSystemStore(base, { encryptSensitiveData: false });

  const thought: StoredThought = {
    id: MemoryUtils.generateThoughtId(),
    thought: 'persist me',
    thought_number: 1,
    total_thoughts: 1,
    next_thought_needed: false,
    timestamp: new Date(),
    session_id: 's1',
    context: {},
  };

  await store.storeThought(thought);
  const storedRaw = await fs.readFile(path.join(base, 'thoughts', `${thought.id}.json`), 'utf8');
  assert.ok(storedRaw.includes('persist me'), 'file contains plaintext');

  const loaded = await store.getThought(thought.id);
  assert.deepEqual(loaded?.thought, 'persist me');

  // Re-open store to test persistence
  const store2 = new FileSystemStore(base, { encryptSensitiveData: false });
  const loaded2 = await store2.getThought(thought.id);
  assert.ok(loaded2, 'thought loaded after reopen');

  // Cleanup old thoughts
  const removed = await store2.cleanupOldThoughts(new Date(Date.now() + 1000));
  assert.equal(removed, 1);
  const missing = await store2.getThought(thought.id);
  assert.equal(missing, null);

  // Encryption check
  const baseEnc = path.join(process.cwd(), 'tmp-memory-test-enc');
  await fs.rm(baseEnc, { recursive: true, force: true });
  process.env.MEMORY_STORE_KEY = 'testkey';
  const encStore = new FileSystemStore(baseEnc, { encryptSensitiveData: true });
  const secretThought = { ...thought, id: MemoryUtils.generateThoughtId(), thought: 'secret' };
  await encStore.storeThought(secretThought);
  const encRaw = await fs.readFile(path.join(baseEnc, 'thoughts', `${secretThought.id}.json`), 'utf8');
  assert.ok(!encRaw.includes('secret'), 'encrypted file should not contain plaintext');
  const decThought = await encStore.getThought(secretThought.id);
  assert.equal(decThought?.thought, 'secret');
  await fs.rm(baseEnc, { recursive: true, force: true });

  await fs.rm(base, { recursive: true, force: true });
  console.log('✅ file-system-store tests passed');
}

run().catch(err => {
  console.error('💥 file-system-store tests failed', err);
  process.exit(1);
});
