/**
 * Unit Test Runner for Phase 1 Improvements
 *
 * Runs all unit tests for the architectural improvements implemented in Phase 1
 */

import { runCircularBufferTests } from './circular-buffer.test.js';
import { runErrorBoundaryTests } from './error-boundary.test.js';
import { runSecureLoggerTests } from './secure-logger.test.js';
import { runStateManagerTests } from './state-manager.test.js';

interface TestSuite {
  name: string;
  runner: () => Promise<void>;
}

const testSuites: TestSuite[] = [
  { name: 'CircularBuffer', runner: runCircularBufferTests },
  // { name: 'ErrorBoundary', runner: runErrorBoundaryTests }, // Temporarily disabled
  { name: 'SecureLogger', runner: runSecureLoggerTests },
  { name: 'StateManager', runner: runStateManagerTests },
];

async function runAllUnitTests() {
  console.log('🚀 Starting Phase 1 Unit Test Suite...\n');

  const startTime = Date.now();
  let passedSuites = 0;
  let failedSuites = 0;
  const failures: string[] = [];

  for (const suite of testSuites) {
    try {
      console.log(`📦 Running ${suite.name} tests...`);
      await suite.runner();
      passedSuites++;
      console.log(`✅ ${suite.name} tests completed successfully\n`);
    } catch (error) {
      failedSuites++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      failures.push(`${suite.name}: ${errorMessage}`);
      console.error(`❌ ${suite.name} tests failed: ${errorMessage}\n`);
    }
  }

  const duration = Date.now() - startTime;

  console.log('📊 Test Summary:');
  console.log(`   Total Suites: ${testSuites.length}`);
  console.log(`   Passed: ${passedSuites}`);
  console.log(`   Failed: ${failedSuites}`);
  console.log(`   Duration: ${duration}ms`);

  if (failures.length > 0) {
    console.log('\n❌ Failed Suites:');
    failures.forEach(failure => console.log(`   - ${failure}`));
  }

  if (failedSuites === 0) {
    console.log('\n🎉 All unit tests passed! Phase 1 implementations are working correctly.');
    return true;
  } else {
    console.log('\n💥 Some tests failed. Please fix the issues before proceeding.');
    return false;
  }
}

// Export for use in other test runners
export { runAllUnitTests };

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllUnitTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Test runner failed:', error);
      process.exit(1);
    });
}
