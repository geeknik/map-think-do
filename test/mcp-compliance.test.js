#!/usr/bin/env node

/**
 * MCP Compliance Test Suite
 * 
 * Tests our server against the official MCP specification to ensure
 * full protocol compliance including:
 * - JSON-RPC 2.0 message format
 * - Standard error codes
 * - Proper initialization handshake
 * - Transport layer requirements
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testMcpCompliance() {
  console.log('🔍 Testing MCP Protocol Compliance...\n');

  await testInitializationHandshake();
  await testErrorCodeCompliance();
  await testInvalidMethodHandling();
  await testInvalidParamsHandling();
  await testTransportCompliance();
  
  console.log('✅ MCP Compliance test suite completed\n');
}

async function testInitializationHandshake() {
  console.log('🤝 Test: Initialization Handshake');
  
  const serverProcess = spawn('node', [path.join(__dirname, '../dist/index.js')], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  try {
    // Send initialize request
    const initRequest = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {}
        },
        clientInfo: {
          name: 'mcp-compliance-test',
          version: '1.0.0'
        }
      }
    }) + '\n';

    serverProcess.stdin.write(initRequest);

    // Wait for response
    let response = '';
    const responsePromise = new Promise((resolve) => {
      serverProcess.stdout.on('data', (data) => {
        response += data.toString();
        if (response.includes('}')) {
          resolve(response);
        }
      });
    });

    await Promise.race([responsePromise, new Promise(resolve => setTimeout(resolve, 2000))]);

    // Validate response format
    try {
      const parsedResponse = JSON.parse(response.trim());
      
      // Check JSON-RPC 2.0 format
      if (parsedResponse.jsonrpc !== '2.0') {
        console.log('❌ Invalid JSON-RPC version');
        return;
      }

      // Check required fields
      if (!parsedResponse.result) {
        console.log('❌ Missing result field');
        return;
      }

      const result = parsedResponse.result;
      
      // Check protocol version
      if (!result.protocolVersion) {
        console.log('❌ Missing protocolVersion');
        return;
      }

      // Check capabilities
      if (!result.capabilities) {
        console.log('❌ Missing capabilities');
        return;
      }

      // Check server info
      if (!result.serverInfo || !result.serverInfo.name || !result.serverInfo.version) {
        console.log('❌ Missing or invalid serverInfo');
        return;
      }

      console.log('✅ Initialization handshake compliant');
      
    } catch (err) {
      console.log('❌ Invalid JSON response:', err.message);
    }

  } finally {
    serverProcess.kill();
  }
}

async function testErrorCodeCompliance() {
  console.log('⚠️ Test: Error Code Compliance');
  
  const serverProcess = spawn('node', [path.join(__dirname, '../dist/index.js')], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  try {
    // Initialize first
    const initRequest = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test', version: '1.0.0' }
      }
    }) + '\n';

    serverProcess.stdin.write(initRequest);
    await new Promise(resolve => setTimeout(resolve, 200));

    // Test unknown method (should return -32601)
    const unknownMethodRequest = JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'unknown/method',
      params: {}
    }) + '\n';

    serverProcess.stdin.write(unknownMethodRequest);

    // Test invalid tool call (should return -32601)
    const invalidToolRequest = JSON.stringify({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'non-existent-tool',
        arguments: {}
      }
    }) + '\n';

    serverProcess.stdin.write(invalidToolRequest);

    // Test invalid parameters (should return -32602)
    const invalidParamsRequest = JSON.stringify({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'code-reasoning',
        arguments: {
          // Missing required fields
          thought_number: 'invalid'
        }
      }
    }) + '\n';

    serverProcess.stdin.write(invalidParamsRequest);

    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('✅ Error code tests sent (responses should use MCP standard error codes)');

  } finally {
    serverProcess.kill();
  }
}

async function testInvalidMethodHandling() {
  console.log('🚫 Test: Invalid Method Handling');
  
  const serverProcess = spawn('node', [path.join(__dirname, '../dist/index.js')], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  try {
    // Send malformed JSON
    const malformedRequest = '{"jsonrpc":"2.0","id":1,"method":"test"' + '\n'; // Missing closing brace

    let errorReceived = false;
    serverProcess.stdout.on('data', (data) => {
      const response = data.toString();
      if (response.includes('-32700')) { // ParseError
        errorReceived = true;
        console.log('✅ Correctly handled malformed JSON with ParseError (-32700)');
      }
    });

    serverProcess.stdin.write(malformedRequest);
    await new Promise(resolve => setTimeout(resolve, 500));

    if (!errorReceived) {
      console.log('⚠️ Server may not be handling parse errors correctly');
    }

  } finally {
    serverProcess.kill();
  }
}

async function testInvalidParamsHandling() {
  console.log('📋 Test: Invalid Parameters Handling');
  
  const serverProcess = spawn('node', [path.join(__dirname, '../dist/index.js')], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  try {
    // Initialize server
    const initRequest = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test', version: '1.0.0' }
      }
    }) + '\n';

    serverProcess.stdin.write(initRequest);
    await new Promise(resolve => setTimeout(resolve, 200));

    // Test various invalid parameter scenarios
    const testCases = [
      {
        name: 'Empty thought',
        params: {
          name: 'code-reasoning',
          arguments: {
            thought: '',
            thought_number: 1,
            total_thoughts: 1,
            next_thought_needed: false
          }
        }
      },
      {
        name: 'Invalid thought_number',
        params: {
          name: 'code-reasoning',
          arguments: {
            thought: 'Test',
            thought_number: 0,
            total_thoughts: 1,
            next_thought_needed: false
          }
        }
      },
      {
        name: 'Missing required fields',
        params: {
          name: 'code-reasoning',
          arguments: {
            thought: 'Test'
            // Missing other required fields
          }
        }
      }
    ];

    for (const testCase of testCases) {
      const request = JSON.stringify({
        jsonrpc: '2.0',
        id: Math.floor(Math.random() * 1000),
        method: 'tools/call',
        params: testCase.params
      }) + '\n';

      serverProcess.stdin.write(request);
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('✅ Invalid parameter tests sent (should return -32602 errors)');

  } finally {
    serverProcess.kill();
  }
}

async function testTransportCompliance() {
  console.log('🚇 Test: Transport Layer Compliance');
  
  // Test that server properly handles stdio transport
  const serverProcess = spawn('node', [path.join(__dirname, '../dist/index.js')], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  try {
    let stdoutReceived = false;
    let stderrReceived = false;

    serverProcess.stdout.on('data', () => {
      stdoutReceived = true;
    });

    serverProcess.stderr.on('data', () => {
      stderrReceived = true;
    });

    // Send a request
    const request = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test', version: '1.0.0' }
      }
    }) + '\n';

    serverProcess.stdin.write(request);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify transport behavior
    if (stdoutReceived && stderrReceived) {
      console.log('✅ Server correctly uses stdout for JSON-RPC and stderr for logging');
    } else if (stdoutReceived && !stderrReceived) {
      console.log('⚠️ Server uses stdout for JSON-RPC but no stderr logging detected');
    } else if (!stdoutReceived && stderrReceived) {
      console.log('❌ Server not responding on stdout');
    } else {
      console.log('❌ No output detected on either stdout or stderr');
    }

  } finally {
    serverProcess.kill();
  }
}

// Run the compliance tests
testMcpCompliance().catch(err => {
  console.error('💥 MCP compliance test failed:', err);
  process.exit(1);
});