# Configuration

This document covers configuration that is supported by the current codebase.

## Executable and Tool Names

- Executable / package command: `map-think-do`
- MCP tool name: `map-think-do`

The server still accepts the legacy `code-reasoning` tool name for older clients, but new integrations should use `map-think-do`.

## Supported CLI Flags

| Flag | Description |
| --- | --- |
| `--debug` | Enables verbose logging and disables normal secure redaction behavior for debug output. |
| `--help`, `-h` | Prints basic CLI usage information and exits. |

There is currently no supported `--config-dir` CLI flag.

## Claude Desktop Example

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

If the package is installed globally, `command` can be `map-think-do`.

## Runtime Configuration

The server uses `src/utils/config-manager.ts` for in-memory runtime flags. At startup, the current implementation initializes:

```ts
{
  maxThoughtLength: 20000,
  timeoutMs: 60000,
  maxThoughts: 20,
  debug: false,
  promptsEnabled: true
}
```

## Prompt and Config Storage

The default config directory behavior is defined in [`src/utils/config.ts`](/home/geeknik/dev/map-think-do/src/utils/config.ts):

- Default config directory: `~/.map-think-do`
- Default prompt values file: `~/.map-think-do/prompt_values.json`
- Default custom prompts directory: `~/.map-think-do/prompts`

Compatibility behavior:

- If `~/.map-think-do` exists, it is used.
- Otherwise, if `~/.code-reasoning` exists, the server keeps using that legacy directory.
- If neither exists, the server creates and uses `~/.map-think-do`.

Custom prompt loading is restricted to that base directory.

## Logging

- MCP protocol messages use `stdout`.
- Application logs use `stderr`.
- In normal mode, secure logging redacts or hashes sensitive content before logging.
- In `--debug` mode, logs may contain raw thought content.

## Memory Storage

The default server path uses SQLite storage under the user home directory. Alternate memory store implementations exist in the repo for testing and extension work.

When the filesystem-backed memory store is used with `encryptSensitiveData: true`, `MEMORY_STORE_KEY` must be set. The store now fails closed if that key is missing.
