import assert from 'assert/strict';
import { MAP_THINK_DO_TOOL, LEGACY_TOOL_NAME } from '../src/server.js';

export async function runServerToolTests(): Promise<void> {
  const description = MAP_THINK_DO_TOOL.description ?? '';

  assert.equal(
    MAP_THINK_DO_TOOL.name,
    'map-think-do',
    'server should advertise the map-think-do tool name'
  );
  assert.equal(LEGACY_TOOL_NAME, 'code-reasoning', 'legacy tool alias should remain explicit');

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
  assert.match(
    description,
    /hypothesis_ledger/i,
    'tool description should mention the hypothesis ledger output now exposed by the server'
  );
  assert.match(
    description,
    /reasoning_mode/i,
    'tool description should mention the grounded reasoning mode output'
  );
  assert.match(
    description,
    /recent_mode_shifts/i,
    'tool description should mention bounded mode-shift history output'
  );
  assert.match(
    description,
    /action_ranking/i,
    'tool description should mention structured action ranking output'
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
