import assert from 'assert/strict';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { PromptManager } from '../src/prompts/manager.js';

export async function runPromptManagerTests(): Promise<void> {
  const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), 'map-think-do-prompts-'));

  try {
    await testRejectsNonStringArguments(baseDir);
    await testPersistsOnlyAllowlistedValues(baseDir);
    await testFiltersUnsafeStoredValuesOnLoad(baseDir);
    await testIgnoresStaleStoredValuesForUndeclaredArguments(baseDir);
    await testCompletionValuesRequireDeclaredArguments(baseDir);
    await testRejectsInvalidCustomPromptArgumentShape(baseDir);
    console.log('✅ prompt-manager tests passed');
  } finally {
    await fs.rm(baseDir, { recursive: true, force: true });
  }
}

async function testRejectsNonStringArguments(baseDir: string): Promise<void> {
  const manager = new PromptManager(baseDir);

  assert.throws(
    () =>
      manager.applyPrompt('bug-analysis', {
        bug_behavior: 42,
        expected_behavior: 'Should not crash',
        affected_components: 'src/server.ts',
      }),
    /Invalid prompt arguments/i,
    'prompt application should reject non-string argument values'
  );
}

async function testPersistsOnlyAllowlistedValues(baseDir: string): Promise<void> {
  const manager = new PromptManager(baseDir);

  manager.applyPrompt('code-review', {
    code_path: 'src/server.ts',
    requirements: 'Do not persist this free-form review request.',
    language: 'typescript',
    working_directory: '/tmp/project',
  });

  const storedValues = manager.getStoredValues('code-review');

  assert.equal(storedValues.working_directory, '/tmp/project');
  assert.equal(storedValues.language, 'typescript');
  assert.ok(!('code_path' in storedValues), 'code_path should not be persisted');
  assert.ok(!('requirements' in storedValues), 'free-form requirements should not be persisted');
}

async function testFiltersUnsafeStoredValuesOnLoad(baseDir: string): Promise<void> {
  const promptValuesPath = path.join(baseDir, 'prompt_values.json');
  await fs.writeFile(
    promptValuesPath,
    JSON.stringify({
      global: {
        working_directory: '/tmp/project',
        leaked_context: 'remove me',
      },
      prompts: {
        'bug-analysis': {
          bug_behavior: 'secret reproduction details',
          language: 'typescript',
        },
      },
    }),
    'utf8'
  );

  const manager = new PromptManager(baseDir);
  const storedValues = manager.getStoredValues('bug-analysis');

  assert.equal(storedValues.working_directory, '/tmp/project');
  assert.ok(
    !('bug_behavior' in storedValues),
    'unsafe free-form values should be discarded on load'
  );
  assert.ok(
    !('language' in storedValues),
    'stored values should be filtered to arguments actually declared by the target prompt'
  );
  assert.ok(
    !('leaked_context' in storedValues),
    'unexpected global keys should be discarded on load'
  );
}

async function testIgnoresStaleStoredValuesForUndeclaredArguments(baseDir: string): Promise<void> {
  const promptValuesPath = path.join(baseDir, 'prompt_values.json');
  await fs.writeFile(
    promptValuesPath,
    JSON.stringify({
      global: {
        working_directory: '/tmp/project',
      },
      prompts: {
        'bug-analysis': {
          language: 'typescript',
        },
      },
    }),
    'utf8'
  );

  const manager = new PromptManager(baseDir);
  const result = manager.applyPrompt('bug-analysis', {
    bug_behavior: 'The request fails under load.',
    expected_behavior: 'The request should complete successfully.',
    affected_components: 'src/server.ts',
  });

  assert.match(
    result.messages[0]?.content.text ?? '',
    /The request fails under load\./,
    'stale undeclared stored values should not block prompt application'
  );
}

async function testCompletionValuesRequireDeclaredArguments(baseDir: string): Promise<void> {
  const promptValuesPath = path.join(baseDir, 'prompt_values.json');
  await fs.writeFile(
    promptValuesPath,
    JSON.stringify({
      global: {
        working_directory: '/tmp/project',
      },
      prompts: {
        'code-review': {
          language: 'typescript',
        },
        'bug-analysis': {
          language: 'ruby',
        },
      },
    }),
    'utf8'
  );

  const manager = new PromptManager(baseDir);

  assert.deepEqual(manager.getCompletionValues('code-review', 'language'), ['typescript']);
  assert.deepEqual(
    manager.getCompletionValues('bug-analysis', 'language'),
    [],
    'completion should fail closed for undeclared prompt arguments'
  );
  assert.deepEqual(
    manager.getCompletionValues('missing-prompt', 'language'),
    [],
    'completion should fail closed for unknown prompts'
  );
}

async function testRejectsInvalidCustomPromptArgumentShape(baseDir: string): Promise<void> {
  const promptsDir = path.join(baseDir, 'prompts');
  await fs.mkdir(promptsDir, { recursive: true });
  await fs.writeFile(
    path.join(promptsDir, 'invalid-prompt.json'),
    JSON.stringify({
      name: 'unsafe-prompt',
      description: 'Should be rejected because argument definitions are not strict.',
      template: 'Hello {name}',
      arguments: [
        {
          name: 'name',
          description: 'User name',
          required: true,
          extra: 'reject me',
        },
      ],
    }),
    'utf8'
  );

  const manager = new PromptManager(baseDir);
  await manager.loadCustomPrompts(promptsDir);

  assert.equal(
    manager.getPrompt('unsafe-prompt'),
    undefined,
    'custom prompt loader should reject argument definitions with unknown fields'
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runPromptManagerTests().catch(error => {
    console.error('💥 prompt-manager tests failed', error);
    process.exit(1);
  });
}
