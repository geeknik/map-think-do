/**
 * Unit tests for SecureLogger utility
 */

import assert from 'assert';
import { SecureLogger, LogLevel, secureLogger } from '../src/utils/secure-logger.js';
import { configManager } from '../src/utils/config-manager.js';

async function runSecureLoggerTests() {
  console.log('🧪 Running SecureLogger tests...');

  await testBasicLogging();
  await testContentRedaction();
  await testDebugModeControl();
  await testSensitiveContentDetection();
  await testLoggingStatistics();

  console.log('✅ All SecureLogger tests passed');
}

async function testBasicLogging() {
  console.log('  Testing basic logging...');
  
  const logger = SecureLogger.getInstance();
  logger.clearHistory();
  
  // Test basic logging
  await logger.logThought(
    'This is a test thought',
    'TestComponent',
    'testMethod',
    { test: true }
  );
  
  const logs = logger.getRecentLogs(5);
  assert.strictEqual(logs.length, 1);
  assert.strictEqual(logs[0].component, 'TestComponent');
  assert.strictEqual(logs[0].method, 'testMethod');
  assert.strictEqual(logs[0].level, LogLevel.INFO);
  
  console.log('    ✓ Basic logging works correctly');
}

async function testContentRedaction() {
  console.log('  Testing content redaction...');
  
  const logger = SecureLogger.getInstance();
  logger.clearHistory();
  
  // Ensure we're not in debug mode for this test
  await configManager.setValue('debug', false);
  
  // Test redaction of sensitive content
  const sensitiveContent = 'My password is secret123 and email is test@example.com';
  
  await logger.logThought(
    sensitiveContent,
    'TestComponent',
    'testRedaction'
  );
  
  const logs = logger.getRecentLogs(1);
  assert.strictEqual(logs.length, 1);
  assert.strictEqual(logs[0].redacted, true);
  assert.ok(logs[0].contentHash);
  assert.ok(logs[0].message.includes('[REDACTED]'));
  
  console.log('    ✓ Content redaction works correctly');
}

async function testDebugModeControl() {
  console.log('  Testing debug mode control...');
  
  const logger = SecureLogger.getInstance();
  logger.clearHistory();
  
  // Test debug mode - should log raw content
  await configManager.setValue('debug', true);
  
  const testContent = 'Debug mode test with password: secret123';
  await logger.logThought(testContent, 'TestComponent', 'testDebug');
  
  const debugLogs = logger.getRecentLogs(1);
  assert.strictEqual(debugLogs[0].redacted, false);
  assert.strictEqual(debugLogs[0].message, testContent);
  
  // Test production mode - should redact
  await configManager.setValue('debug', false);
  logger.clearHistory();
  
  await logger.logThought(testContent, 'TestComponent', 'testProduction');
  
  const prodLogs = logger.getRecentLogs(1);
  assert.strictEqual(prodLogs[0].redacted, true);
  // The message should be different from the original (redacted)
  assert.notStrictEqual(prodLogs[0].message, testContent);
  
  console.log('    ✓ Debug mode control works correctly');
}

async function testSensitiveContentDetection() {
  console.log('  Testing sensitive content detection...');
  
  const logger = SecureLogger.getInstance();
  
  // Test various sensitive patterns
  const testCases = [
    { content: 'My API key is abc123def456ghi789abc', shouldDetect: true }, // 20+ chars
    { content: 'Contact me at john@example.com', shouldDetect: true },
    { content: 'Call me at 555-123-4567', shouldDetect: true },
    { content: 'SSN: 123-45-6789', shouldDetect: true },
    { content: 'Credit card: 1234 5678 9012 3456', shouldDetect: true },
    { content: 'Server IP: 192.168.1.1', shouldDetect: true },
    { content: 'Path: /Users/john/documents', shouldDetect: true },
    { content: 'password: mysecret', shouldDetect: true },
    { content: 'Just a normal message', shouldDetect: false },
    { content: 'Short text', shouldDetect: false },
  ];
  
  for (const testCase of testCases) {
    const detected = logger.containsSensitiveContent(testCase.content);
    assert.strictEqual(
      detected, 
      testCase.shouldDetect, 
      `Failed for: "${testCase.content}"`
    );
  }
  
  console.log('    ✓ Sensitive content detection works correctly');
}

async function testLoggingStatistics() {
  console.log('  Testing logging statistics...');
  
  const logger = SecureLogger.getInstance();
  logger.clearHistory();
  
  // Generate some test logs
  await configManager.setValue('debug', false);
  
  await logger.logThought('Normal message', 'Test', 'method1');
  await logger.logThought('Message with password123', 'Test', 'method2');
  await logger.logDebugSensitive('Debug info', 'Test', 'method3');
  
  const stats = logger.getLoggingStats();
  assert.strictEqual(stats.totalEntries, 3);
  assert.strictEqual(stats.redactedEntries, 3); // All should be redacted in non-debug mode
  assert.ok(stats.levelCounts[LogLevel.INFO] > 0);
  assert.ok(stats.levelCounts[LogLevel.DEBUG] > 0);
  
  // Test recent activity
  assert.strictEqual(stats.recentActivity, true);
  
  console.log('    ✓ Logging statistics work correctly');
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSecureLoggerTests().catch(error => {
    console.error('❌ SecureLogger tests failed:', error);
    process.exit(1);
  });
}

export { runSecureLoggerTests };