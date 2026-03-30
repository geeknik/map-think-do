#!/usr/bin/env node

import { parseArgs } from 'node:util';

/**
 * Map. Think. Do. MCP Server entry point
 *
 * This is the entry point for the Map. Think. Do. MCP server, which uses sequential thinking
 * methodology to help solve programming problems step by step. It delegates to the main
 * server implementation in src/server.ts after parsing command line arguments.
 *
 * Note: The server now advertises the "map-think-do" tool name and still accepts the
 * legacy "code-reasoning" alias for existing clients.
 */

// Parse command line arguments
const { values } = parseArgs({
  options: {
    debug: { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
});

if (values.help) {
  console.info(`map-think-do

Usage:
  map-think-do [--debug] [--help]

Options:
  --debug    Enable verbose logging and disable secure redaction for debug output
  --help     Show this help text
`);
  process.exit(0);
}

// Import and run the server
import('./src/server.js')
  .then(module => {
    // Debug flag is passed to runServer
    if (values.debug) {
      console.info('Starting server in debug mode');
    }

    module.runServer(values.debug);
  })
  .catch(error => {
    console.error('Error starting server:', error);
    process.exit(1);
  });
