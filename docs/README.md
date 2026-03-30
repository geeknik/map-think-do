# Documentation

This directory documents the current `map-think-do` MCP server as it exists today.

Key terminology:

- Package / executable: `map-think-do`
- MCP tool exposed by the server: `code-reasoning`
- Default config directory: `~/.code-reasoning`

## Index

- [Configuration](./configuration.md): supported runtime flags, MCP setup, config storage, and logging behavior.
- [Examples](./examples.md): prompt and integration examples for the `code-reasoning` tool.
- [Prompts](./prompts.md): built-in prompt templates and prompt value persistence.
- [Testing](./testing.md): default test commands and extra validation scripts.
- [Architecture Notes](./AGI-TRANSFORMATION.md): implementation notes on the cognitive modules and why the repo uses that language.

## Scope

The server implements structured reasoning with persisted state, prompt support, and heuristic cognitive metadata. It does not claim real sentience, consciousness, or AGI. Documentation in this repo should be read as architecture and behavior notes, not capability guarantees.

## Logging and Sensitive Data

- In normal mode, secure logging redacts and hashes content before writing logs.
- In `--debug` mode, raw content may be logged to `stderr`.
- Debug mode should only be used in trusted environments with controlled data.
- Test logs are written under [`logs/`](/home/geeknik/dev/map-think-do/logs) and results under [`test-results/`](/home/geeknik/dev/map-think-do/test-results).
