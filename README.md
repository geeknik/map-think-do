# map-think-do

`map-think-do` is an MCP server that exposes a single `map-think-do` tool for structured problem solving. It supports linear reasoning, revisions, branching, prompt templates, persisted memory, and a set of heuristic cognitive signals such as bias detection and recommendation generation.

This project is experimental software. It uses cognitive and persona-oriented language in parts of the codebase, but it should be understood as a reasoning aid and orchestration layer, not as a claim of sentience or general intelligence.

## What It Actually Does

- Registers the `map-think-do` MCP tool over stdio.
- Validates tool input with a strict schema and rejects extra fields.
- Tracks ordered thoughts with optional revision and branch metadata.
- Generates cognitive state metadata such as `metacognitive_awareness` and `breakthrough_likelihood`.
- Persists reasoning history in SQLite by default, with alternate memory store implementations in the repo.
- Supports prompt templates and custom prompt files under `~/.map-think-do/prompts`.
- Includes unit tests, end-to-end MCP tests, and transport/compliance test scripts.

## What It Does Not Do

- It does not provide autonomous execution of external tasks.
- It does not guarantee correctness of generated recommendations.
- It does not provide real consciousness, sentience, or AGI.
- It does not currently expose a public CLI for changing the config directory at runtime.

## Installation

For local development:

```bash
npm install
npm run build
```

Run the server directly:

```bash
node dist/index.js
```

If you install the package globally, the executable name is `map-think-do`.

## MCP Configuration

The executable is `map-think-do`, and the MCP tool name exposed by the server is also `map-think-do`.

For backward compatibility, the server still accepts incoming `code-reasoning` tool calls from older MCP clients, but it no longer advertises that legacy name.

Example Claude Desktop configuration for a local checkout:

```json
{
  "mcpServers": {
    "map-think-do": {
      "command": "node",
      "args": ["/absolute/path/to/map-think-do/dist/index.js"]
    }
  }
}
```

## Tool Input

The `map-think-do` tool accepts:

```json
{
  "thought": "Investigate the failing request path",
  "thought_number": 1,
  "total_thoughts": 4,
  "next_thought_needed": true,
  "is_revision": false,
  "revises_thought": null,
  "branch_from_thought": null,
  "branch_id": null,
  "needs_more_thoughts": false
}
```

Required fields:

- `thought`
- `thought_number`
- `total_thoughts`
- `next_thought_needed`

Branching requires both `branch_from_thought` and `branch_id`. Revisions require `is_revision: true` and `revises_thought`.

## Output Shape

Responses include the validated thought flow plus cognitive metadata. Common fields include:

- `cognitive_insights`
- `cognitive_interventions`
  Each intervention now includes bounded activation context explaining why it fired now.
- `hypothesis_ledger`
  Each hypothesis now includes a bounded explanation of its latest confidence change.
- `reasoning_mode`
- `recent_mode_shifts`
- `action_ranking`
- `detected_biases`
- `ai_recommendations`
- `metacognitive_awareness`
- `creative_pressure`
- `breakthrough_likelihood`
- `cognitive_flexibility`
- `insight_potential`

These values are heuristics produced by the current implementation. They are useful for downstream prompts and debugging, but they are not formal guarantees or calibrated scientific measurements.

## Running

Debug mode:

```bash
node dist/index.js --debug
```

CLI help:

```bash
node dist/index.js --help
```

Current runtime behavior:

- JSON-RPC is written to `stdout`.
- Logs are written to `stderr`.
- Debug mode reduces redaction in logs and should not be used in production environments.
- Prompt data is stored under `~/.map-think-do` by default.
- If `~/.code-reasoning` already exists and `~/.map-think-do` does not, the server keeps using the legacy directory to avoid orphaning existing prompt data.

## Testing

Main checks:

```bash
npm run build
npm test
```

Additional useful commands:

```bash
npm run test:basic
npm run test:branch
npm run test:revision
npm run test:error
npm run test:perf
node test/mcp-compliance.test.js
node test/transport-failure.test.js
npm run demo
```

## Security Notes

- Tool input is schema-validated and unknown fields are rejected.
- The filesystem-backed memory store now rejects unsafe IDs and fails closed if encryption is enabled without `MEMORY_STORE_KEY`.
- Debug logging can expose sensitive input data and should be used only in controlled environments.
- Prompt and config file access is restricted to the configured base directory and guarded against traversal through symlink escapes.

## Documentation

- [Architecture Notes](./docs/AGI-TRANSFORMATION.md)
- [Configuration](./docs/configuration.md)
- [Testing](./docs/testing.md)
- [Docs Index](./docs/README.md)
- [Test Notes](./test/README.md)
