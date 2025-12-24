/**
 * Unit Test Runner for Map. Think. Do.
 *
 * Runs all unit tests for core components
 */

import { runCircularBufferTests } from './circular-buffer.test.js';
import { runErrorBoundaryTests } from './error-boundary.test.js';
import { runSecureLoggerTests } from './secure-logger.test.js';
import { runStateManagerTests } from './state-manager.test.js';
import { runTests as runSQLiteStoreTests } from './sqlite-store.test.js';
import { runTests as runBiasDetectorTests } from './bias-detector.test.js';
import { runLearningManagerTests } from './learning-manager.test.js';
import { runCognitiveOrchestratorTests } from './cognitive-orchestrator.test.js';

interface TestSuite {
  name: string;
  runner: () => Promise<void | { passed: number; failed: number }>;
}

const testSuites: TestSuite[] = [
  { name: 'CircularBuffer', runner: runCircularBufferTests },
  { name: 'ErrorBoundary', runner: runErrorBoundaryTests },
  { name: 'SecureLogger', runner: runSecureLoggerTests },
  { name: 'StateManager', runner: runStateManagerTests },
  { name: 'SQLiteStore', runner: runSQLiteStoreTests },
  { name: 'BiasDetector', runner: runBiasDetectorTests },
  { name: 'LearningManager', runner: runLearningManagerTests },
  { name: 'CognitiveOrchestrator', runner: runCognitiveOrchestratorTests },
];

async function runAllUnitTests() {
  console.log('🗺️ Map. Think. Do. - Unit Test Suite\n');

  const startTime = Date.now();
  let passedSuites = 0;
  let failedSuites = 0;
  const failures: string[] = [];

  for (const suite of testSuites) {
    try {
      console.log(`📦 Running ${suite.name} tests...`);
      const result = await suite.runner();

      // Check if result includes failure count (new test format)
      if (result && typeof result === 'object' && 'failed' in result && result.failed > 0) {
        failedSuites++;
        failures.push(`${suite.name}: ${result.failed} test(s) failed`);
        console.error(`❌ ${suite.name} tests had ${result.failed} failure(s)\n`);
      } else {
        passedSuites++;
        console.log(`✅ ${suite.name} tests completed successfully\n`);
      }
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
    console.log('\n✅ All unit tests passed!');
    return true;
  } else {
    console.log('\n❌ Some tests failed. Please fix the issues before proceeding.');
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
