# Testing

This project has a mixed test layout:

- TypeScript unit and e2e tests compiled into `dist/test` and `dist/tests`
- standalone JavaScript protocol and transport scripts under `test/`

## Default Checks

```bash
npm run build
npm test
```

`npm test` currently runs:

1. `dist/test/unit-test-runner.js`
2. `dist/test/map-think-do.e2e.js basic`
3. `dist/tests/plugin-manager.test.js`

The unit runner covers core utilities, state management, memory stores, and orchestrator behavior.

## Scenario Tests

```bash
npm run test:basic
npm run test:branch
npm run test:revision
npm run test:error
npm run test:perf
npm run test:all
```

These scripts exercise the MCP server through stdio and verify thought sequencing, branching, revision handling, error handling, and longer flows.

## Extra Validation Scripts

These are not part of the default `npm test` command, but they are useful when changing transport or protocol code:

```bash
node test/mcp-compliance.test.js
node test/transport-failure.test.js
```

## Prompt Evaluation

Prompt evaluation lives under `test/prompt-evaluation/`.

```bash
npm run eval
```

That workflow is optional and separate from the core unit/e2e suite.

## Debugging Notes

- The server must keep JSON-RPC traffic on `stdout` and logs on `stderr`.
- `--debug` increases logging detail and may expose raw thought content.
- Test logs are written under `logs/`.
- Structured e2e results are written under `test-results/`.
