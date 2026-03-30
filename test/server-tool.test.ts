import assert from 'assert/strict';
import { CODE_REASONING_TOOL } from '../src/server.js';

export async function runServerToolTests(): Promise<void> {
  const description = CODE_REASONING_TOOL.description ?? '';

  assert.match(
    description,
    /heuristic cognitive metadata/i,
    'tool description should describe heuristic metadata accurately'
  );
  assert.match(
    description,
    /persisted state/i,
    'tool description should mention persisted state rather than implied sentience'
  );
  assert.doesNotMatch(
    description,
    /adaptive learning/i,
    'tool description should not promise adaptive learning that the tool output does not expose'
  );
  assert.doesNotMatch(
    description,
    /\bAGI\b|\bsentien/i,
    'tool description should avoid AGI or sentience claims'
  );

  console.log('✅ server-tool tests passed');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runServerToolTests().catch(error => {
    console.error('💥 server-tool tests failed', error);
    process.exit(1);
  });
}
