/**
 * Unit tests for CircularBuffer utility
 */

import assert from 'assert';
import { CircularBuffer, CognitiveCircularBuffer, BufferFactory } from '../src/utils/circular-buffer.js';

async function runCircularBufferTests() {
  console.log('🧪 Running CircularBuffer tests...');

  // Test basic functionality
  testBasicOperations();
  testOverflowBehavior();
  testQueryOperations();
  testCognitiveBuffer();
  testBufferFactory();
  testEdgeCases();

  console.log('✅ All CircularBuffer tests passed');
}

function testBasicOperations() {
  console.log('  Testing basic operations...');
  
  const buffer = new CircularBuffer<string>(3);
  
  // Test empty buffer
  assert.strictEqual(buffer.size, 0);
  assert.strictEqual(buffer.isEmpty, true);
  assert.strictEqual(buffer.isFull, false);
  
  // Test push and size
  buffer.push('item1');
  assert.strictEqual(buffer.size, 1);
  assert.strictEqual(buffer.isEmpty, false);
  
  buffer.push('item2');
  buffer.push('item3');
  assert.strictEqual(buffer.size, 3);
  assert.strictEqual(buffer.isFull, true);
  
  // Test getAll
  const items = buffer.getAll();
  assert.deepStrictEqual(items, ['item1', 'item2', 'item3']);
  
  console.log('    ✓ Basic operations work correctly');
}

function testOverflowBehavior() {
  console.log('  Testing overflow behavior...');
  
  const buffer = new CircularBuffer<number>(2);
  
  // Fill to capacity
  buffer.push(1);
  buffer.push(2);
  assert.strictEqual(buffer.totalOverflow, 0);
  
  // Test overflow
  buffer.push(3);
  assert.strictEqual(buffer.size, 2);
  assert.strictEqual(buffer.totalOverflow, 1);
  assert.deepStrictEqual(buffer.getAll(), [2, 3]);
  
  // Test multiple overflows
  buffer.push(4);
  buffer.push(5);
  assert.strictEqual(buffer.totalOverflow, 3);
  assert.deepStrictEqual(buffer.getAll(), [4, 5]);
  
  console.log('    ✓ Overflow behavior works correctly');
}

function testQueryOperations() {
  console.log('  Testing query operations...');
  
  const buffer = new CircularBuffer<string>(5);
  
  // Add test data
  buffer.push('apple');
  buffer.push('banana');
  buffer.push('cherry');
  buffer.push('date');
  
  // Test getRecent
  assert.deepStrictEqual(buffer.getRecent(2), ['cherry', 'date']);
  assert.deepStrictEqual(buffer.getRecent(10), ['apple', 'banana', 'cherry', 'date']);
  
  // Test find
  const fruitsWithA = buffer.find(item => item.includes('a'));
  assert.strictEqual(fruitsWithA.length, 3); // apple, banana, date
  
  // Test contains
  assert.strictEqual(buffer.contains(item => item === 'cherry'), true);
  assert.strictEqual(buffer.contains(item => item === 'grape'), false);
  
  console.log('    ✓ Query operations work correctly');
}

function testCognitiveBuffer() {
  console.log('  Testing CognitiveCircularBuffer...');
  
  const buffer = new CognitiveCircularBuffer<string>(3);
  
  // Test performance tracking
  buffer.push('test1');
  buffer.push('test2');
  buffer.getAll();
  
  const metrics = buffer.getPerformanceMetrics();
  assert.strictEqual(metrics.accessCount, 3); // 2 pushes + 1 getAll
  assert.strictEqual(metrics.memoryEfficiency, 2/3); // 2 items / 3 capacity
  
  // Test reset
  buffer.resetMetrics();
  const resetMetrics = buffer.getPerformanceMetrics();
  assert.strictEqual(resetMetrics.accessCount, 0);
  
  console.log('    ✓ CognitiveCircularBuffer works correctly');
}

function testBufferFactory() {
  console.log('  Testing BufferFactory...');
  
  const interventionBuffer = BufferFactory.createInterventionBuffer(100);
  assert.strictEqual(interventionBuffer.capacity, 100);
  
  const insightBuffer = BufferFactory.createInsightBuffer(50);
  assert.strictEqual(insightBuffer.capacity, 50);
  
  const thoughtBuffer = BufferFactory.createThoughtBuffer(200);
  assert.strictEqual(thoughtBuffer.capacity, 200);
  
  const errorBuffer = BufferFactory.createErrorBuffer(10);
  assert.strictEqual(errorBuffer.capacity, 10);
  
  console.log('    ✓ BufferFactory works correctly');
}

function testEdgeCases() {
  console.log('  Testing edge cases...');
  
  // Test invalid size
  try {
    new CircularBuffer<string>(0);
    assert.fail('Should have thrown error for zero size');
  } catch (error) {
    assert.ok((error as Error).message.includes('must be positive'));
  }
  
  try {
    new CircularBuffer<string>(-1);
    assert.fail('Should have thrown error for negative size');
  } catch (error) {
    assert.ok((error as Error).message.includes('must be positive'));
  }
  
  // Test operations on empty buffer
  const emptyBuffer = new CircularBuffer<string>(5);
  assert.deepStrictEqual(emptyBuffer.getAll(), []);
  assert.deepStrictEqual(emptyBuffer.getRecent(3), []);
  assert.deepStrictEqual(emptyBuffer.find(() => true), []);
  
  // Test clear
  const buffer = new CircularBuffer<string>(3);
  buffer.push('test');
  assert.strictEqual(buffer.size, 1);
  buffer.clear();
  assert.strictEqual(buffer.size, 0);
  assert.strictEqual(buffer.totalOverflow, 0);
  
  console.log('    ✓ Edge cases handled correctly');
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runCircularBufferTests().catch(error => {
    console.error('❌ CircularBuffer tests failed:', error);
    process.exit(1);
  });
}

export { runCircularBufferTests };