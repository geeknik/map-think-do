import assert from 'assert/strict';
import {
  MAP_THINK_DO_TOOL,
  MAP_THINK_DO_FEEDBACK_TOOL,
  MAP_THINK_DO_FEEDBACK_TOOL_NAME,
  LEGACY_TOOL_NAME,
  validateThoughtData,
  validateFeedbackData,
} from '../src/server.js';

export async function runServerToolTests(): Promise<void> {
  testToolSchemaMatchesRuntimeValidation();
  testFeedbackToolSchemaAndValidation();

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
    /hypothesis_ledger|confidence-change explanations/i,
    'tool description should mention the hypothesis ledger and its confidence-change explanation output'
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
  assert.match(
    description,
    /activation context|why they fired now/i,
    'tool description should mention bounded intervention activation context'
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

function testToolSchemaMatchesRuntimeValidation(): void {
  const validThought = validateThoughtData({
    thought: 'Investigate the failure mode before choosing a fix.',
    thought_number: 1,
    total_thoughts: 3,
    next_thought_needed: true,
  });

  assert.equal(
    validThought.thought_number,
    1,
    'runtime validation should accept valid thought input'
  );

  assert.throws(
    () =>
      validateThoughtData({
        thought: 'Unexpected input should be rejected.',
        thought_number: 1,
        total_thoughts: 1,
        next_thought_needed: false,
        unexpected_field: 'reject me',
      }),
    /unexpected_field|Unrecognized key/i,
    'runtime validation should reject unknown input fields'
  );

  assert.equal(
    (MAP_THINK_DO_TOOL.inputSchema as Record<string, unknown>).additionalProperties,
    false,
    'tool schema should advertise closed input objects'
  );
}

function testFeedbackToolSchemaAndValidation(): void {
  assert.equal(
    MAP_THINK_DO_FEEDBACK_TOOL.name,
    'map-think-do-feedback',
    'server should advertise the feedback tool name'
  );
  assert.equal(
    MAP_THINK_DO_FEEDBACK_TOOL_NAME,
    'map-think-do-feedback',
    'feedback tool name constant should be explicit'
  );
  assert.equal(
    MAP_THINK_DO_FEEDBACK_TOOL.annotations?.readOnlyHint,
    false,
    'feedback tool mutates learning state, so it is not read-only'
  );
  assert.equal(
    (MAP_THINK_DO_FEEDBACK_TOOL.inputSchema as Record<string, unknown>).additionalProperties,
    false,
    'feedback tool schema should advertise closed input objects'
  );

  // Accepts a well-formed outcome report.
  const valid = validateFeedbackData({
    session_id: 'session_abc',
    outcome: 'success',
    score: 0.9,
    comment: 'Shipped and verified.',
  });
  assert.equal(valid.outcome, 'success', 'valid feedback should parse');
  assert.equal(valid.score, 0.9, 'valid score should be preserved');

  // Minimal payload (no comment) is allowed.
  assert.doesNotThrow(
    () => validateFeedbackData({ session_id: 's1', outcome: 'partial', score: 0 }),
    'comment is optional'
  );

  // Rejects an out-of-range score.
  assert.throws(
    () => validateFeedbackData({ session_id: 's1', outcome: 'success', score: 1.5 }),
    /less than or equal to 1|score/i,
    'score above 1 should be rejected'
  );

  // Rejects an unknown outcome value.
  assert.throws(
    () => validateFeedbackData({ session_id: 's1', outcome: 'maybe', score: 0.5 }),
    /Invalid enum value|outcome/i,
    'outcome must be one of success|failure|partial'
  );

  // Rejects unknown fields (fail closed).
  assert.throws(
    () =>
      validateFeedbackData({
        session_id: 's1',
        outcome: 'success',
        score: 0.5,
        injected: 'reject me',
      }),
    /injected|Unrecognized key/i,
    'feedback validation should reject unknown input fields'
  );

  // Rejects an empty session_id.
  assert.throws(
    () => validateFeedbackData({ session_id: '', outcome: 'success', score: 0.5 }),
    /session_id|at least 1/i,
    'session_id must be non-empty'
  );

  console.log('✅ feedback-tool tests passed');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runServerToolTests().catch(error => {
    console.error('💥 server-tool tests failed', error);
    process.exit(1);
  });
}
