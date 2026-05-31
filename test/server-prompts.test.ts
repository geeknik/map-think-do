import assert from 'assert/strict';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { ChildProcess, spawn } from 'child_process';
import { fileURLToPath } from 'url';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params: Record<string, unknown>;
}

interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number | null;
  result?: Record<string, unknown>;
  error?: {
    code: number;
    message: string;
  };
}

interface PendingResponse {
  resolve: (value: JsonRpcResponse) => void;
  reject: (reason?: unknown) => void;
  timeout: NodeJS.Timeout;
}

class JsonRpcServerHarness {
  private readonly pendingResponses = new Map<number, PendingResponse>();
  private stdoutBuffer = '';
  private stderrBuffer = '';

  constructor(private readonly child: ChildProcess) {
    if (!child.stdout || !child.stdin || !child.stderr) {
      throw new Error('Child process stdio is not available');
    }

    child.stdout.on('data', this.handleStdoutData);
    child.stderr.on('data', this.handleStderrData);
    child.on('exit', this.handleExit);
    child.on('error', this.handleExit);
  }

  async initialize(): Promise<void> {
    const response = await this.request(1, 'initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'server-prompts-test',
        version: '1.0.0',
      },
    });

    assert.ok(response.result, 'initialize should return a result');
    await this.notify({
      jsonrpc: '2.0',
      method: 'notifications/initialized',
    });
  }

  async request(
    id: number,
    method: string,
    params: Record<string, unknown>
  ): Promise<JsonRpcResponse> {
    const childStdin = this.child.stdin;
    if (!childStdin) {
      throw new Error('Child process stdin is not available');
    }

    return new Promise<JsonRpcResponse>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingResponses.delete(id);
        reject(
          new Error(`Timed out waiting for response to ${method}. stderr=${this.stderrBuffer}`)
        );
      }, 10000);

      this.pendingResponses.set(id, { resolve, reject, timeout });

      const message: JsonRpcRequest = {
        jsonrpc: '2.0',
        id,
        method,
        params,
      };

      childStdin.write(`${JSON.stringify(message)}\n`);
    });
  }

  async notify(message: JsonRpcNotification): Promise<void> {
    const childStdin = this.child.stdin;
    if (!childStdin) {
      throw new Error('Child process stdin is not available');
    }

    childStdin.write(`${JSON.stringify(message)}\n`);
  }

  async close(): Promise<void> {
    for (const pending of this.pendingResponses.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Server harness closed before a response was received'));
    }
    this.pendingResponses.clear();

    if (!this.child.killed) {
      this.child.kill();
    }

    await new Promise<void>(resolve => {
      if (this.child.exitCode !== null || this.child.signalCode !== null) {
        resolve();
        return;
      }

      this.child.once('exit', () => resolve());
    });
  }

  private readonly handleStdoutData = (chunk: Buffer): void => {
    this.stdoutBuffer += chunk.toString('utf8');

    while (true) {
      const newlineIndex = this.stdoutBuffer.indexOf('\n');
      if (newlineIndex === -1) {
        return;
      }

      const line = this.stdoutBuffer.slice(0, newlineIndex).trim();
      this.stdoutBuffer = this.stdoutBuffer.slice(newlineIndex + 1);

      if (!line) {
        continue;
      }

      try {
        const response = JSON.parse(line) as JsonRpcResponse;
        if (typeof response.id !== 'number') {
          continue;
        }

        const pending = this.pendingResponses.get(response.id);
        if (!pending) {
          continue;
        }

        clearTimeout(pending.timeout);
        this.pendingResponses.delete(response.id);
        pending.resolve(response);
      } catch {
        // Ignore non-JSON stdout fragments while waiting for JSON-RPC responses.
      }
    }
  };

  private readonly handleStderrData = (chunk: Buffer): void => {
    this.stderrBuffer += chunk.toString('utf8');
  };

  private readonly handleExit = (errorOrCode: Error | number | null): void => {
    const reason =
      errorOrCode instanceof Error
        ? errorOrCode.message
        : `code=${String(errorOrCode)} stderr=${this.stderrBuffer}`;

    for (const [id, pending] of this.pendingResponses.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error(`Server exited before responding to request ${id}: ${reason}`));
      this.pendingResponses.delete(id);
    }
  };
}

export async function runServerPromptTests(): Promise<void> {
  const tempHome = await fs.mkdtemp(path.join(os.tmpdir(), 'map-think-do-server-prompts-'));
  const configDir = path.join(tempHome, '.map-think-do');

  await fs.mkdir(path.join(configDir, 'prompts'), { recursive: true });
  await fs.writeFile(
    path.join(configDir, 'prompt_values.json'),
    JSON.stringify({
      global: {
        working_directory: '/tmp/project',
      },
      prompts: {
        'code-review': {
          language: 'typescript',
        },
        'bug-analysis': {
          language: 'ruby',
        },
      },
    }),
    'utf8'
  );

  const harness = createServerHarness(tempHome);

  try {
    await harness.initialize();
    await testCompletionFiltersUndeclaredArguments(harness);
    await testPromptApplicationIgnoresStaleStoredValues(harness);
    console.log('✅ server-prompt tests passed');
  } finally {
    await harness.close();
    await fs.rm(tempHome, { recursive: true, force: true });
  }
}

function createServerHarness(tempHome: string): JsonRpcServerHarness {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const serverEntryPoint = path.join(__dirname, '../index.js');
  const child = spawn('node', [serverEntryPoint], {
    cwd: path.join(__dirname, '..'),
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      HOME: tempHome,
    },
  });

  return new JsonRpcServerHarness(child);
}

async function testCompletionFiltersUndeclaredArguments(
  harness: JsonRpcServerHarness
): Promise<void> {
  const codeReviewCompletion = await harness.request(2, 'completion/complete', {
    ref: {
      type: 'ref/prompt',
      name: 'code-review',
    },
    argument: {
      name: 'language',
      value: '',
    },
  });

  assert.deepEqual(codeReviewCompletion.error, undefined);
  assert.deepEqual(codeReviewCompletion.result?.completion, {
    values: ['typescript'],
  });

  const bugAnalysisCompletion = await harness.request(3, 'completion/complete', {
    ref: {
      type: 'ref/prompt',
      name: 'bug-analysis',
    },
    argument: {
      name: 'language',
      value: '',
    },
  });

  assert.deepEqual(bugAnalysisCompletion.error, undefined);
  assert.deepEqual(bugAnalysisCompletion.result?.completion, {
    values: [],
  });
}

async function testPromptApplicationIgnoresStaleStoredValues(
  harness: JsonRpcServerHarness
): Promise<void> {
  const promptResponse = await harness.request(4, 'prompts/get', {
    name: 'bug-analysis',
    arguments: {
      bug_behavior: 'The request fails under load.',
      expected_behavior: 'The request should complete successfully.',
      affected_components: 'src/server.ts',
    },
  });

  assert.deepEqual(promptResponse.error, undefined);

  const messages = promptResponse.result?.messages;
  assert.ok(Array.isArray(messages), 'prompts/get should return messages');

  const firstMessage = messages[0] as {
    content?: {
      text?: string;
    };
  };

  const text = firstMessage.content?.text ?? '';
  assert.match(text, /The request fails under load\./);
  assert.match(
    text,
    /Working Directory: \/tmp\/project/,
    'declared stored values should still be applied after filtering'
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runServerPromptTests().catch(error => {
    console.error('💥 server-prompt tests failed', error);
    process.exit(1);
  });
}
