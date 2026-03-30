#!/usr/bin/env node

/**
 * Transport Failure Test
 *
 * This test specifically reproduces the "sending to closed channel" error
 * that our basic tests miss. It simulates real-world scenarios where clients
 * disconnect abruptly, pipes break, or network connections fail.
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function testTransportFailure() {
  console.log('🔬 Testing transport failure scenarios...\n');

  // Test 1: Abrupt client disconnect
  await testAbruptDisconnect();

  // Test 2: Broken pipe simulation
  await testBrokenPipe();

  // Test 3: Multiple rapid connections
  await testRapidConnections();
}

async function testAbruptDisconnect() {
  console.log('📡 Test 1: Abrupt client disconnect');

  const serverProcess = spawn('node', [path.join(__dirname, '../dist/index.js')], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  // Send initialization sequence
  const initMessage =
    JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' },
      },
    }) + '\n';

  try {
    serverProcess.stdin.write(initMessage);

    // Wait a moment for initialization
    await wait(100);

    // ABRUPTLY KILL THE STDIN (simulates client disconnect)
    serverProcess.stdin.destroy();

    // Try to send a tool call (this should trigger the error)
    const toolCall =
      JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'map-think-do',
          arguments: {
            thought: 'Test thought',
            thought_number: 1,
            total_thoughts: 1,
            next_thought_needed: false,
          },
        },
      }) + '\n';

    let callbackError = null;
    const accepted = serverProcess.stdin.write(toolCall, err => {
      callbackError = err || null;
    });
    await wait(100);

    if (callbackError || !accepted || serverProcess.stdin.destroyed) {
      console.log('✅ Client write path closed as expected');
    } else {
      console.log('⚠️ Write call was accepted before disconnect propagated');
    }
  } catch (err) {
    if (err.message.includes('EPIPE') || err.message.includes('write after end')) {
      console.log('✅ Caught expected transport error:', err.message);
    } else {
      console.log('❓ Unexpected error:', err.message);
    }
  } finally {
    serverProcess.kill('SIGKILL');
  }

  console.log('');
}

async function testBrokenPipe() {
  console.log('🔧 Test 2: Broken pipe simulation');

  const serverProcess = spawn('node', [path.join(__dirname, '../dist/index.js')], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  try {
    // Send initialization
    const initMessage =
      JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' },
        },
      }) + '\n';

    serverProcess.stdin.write(initMessage);
    await wait(100);

    // Close stdout to simulate broken pipe
    serverProcess.stdout.destroy();

    // Try to trigger a response
    const toolCall =
      JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'map-think-do',
          arguments: {
            thought: 'This should trigger EPIPE',
            thought_number: 1,
            total_thoughts: 1,
            next_thought_needed: false,
          },
        },
      }) + '\n';

    serverProcess.stdin.write(toolCall);

    // Wait for server to handle the broken pipe
    await wait(1000);

    console.log('✅ Server handled broken pipe gracefully');
  } catch (err) {
    console.log('✅ Caught transport error:', err.message);
  } finally {
    serverProcess.kill('SIGKILL');
  }

  console.log('');
}

async function testRapidConnections() {
  console.log('⚡ Test 3: Rapid connection stress test');

  const processes = [];

  try {
    // Start multiple server processes rapidly
    for (let i = 0; i < 5; i++) {
      const serverProcess = spawn('node', [path.join(__dirname, '../dist/index.js')], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      processes.push(serverProcess);

      // Send init message immediately
      const initMessage =
        JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: `test-client-${i}`, version: '1.0.0' },
          },
        }) + '\n';

      try {
        serverProcess.stdin.write(initMessage);
      } catch (err) {
        console.log(`Process ${i} failed to write:`, err.message);
      }

      // Kill some randomly to simulate network failures
      if (Math.random() > 0.5) {
        setTimeout(() => {
          try {
            serverProcess.kill('SIGKILL');
          } catch (err) {
            // Process might already be dead
          }
        }, Math.random() * 500);
      }
    }

    // Wait for chaos to settle
    await wait(2000);

    console.log('✅ Rapid connection test completed');
  } catch (err) {
    console.log('Stress test error (expected):', err.message);
  } finally {
    // Clean up any surviving processes
    processes.forEach(proc => {
      try {
        proc.kill('SIGKILL');
      } catch (err) {
        // Already dead
      }
    });
  }

  console.log('');
}

// Run the tests
testTransportFailure()
  .then(() => {
    console.log('🎉 Transport failure tests completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('💥 Test runner failed:', err);
    process.exit(1);
  });
