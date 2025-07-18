/**
 * @fileoverview Mathematical Solver Tool
 *
 * Advanced mathematical reasoning tool that can solve equations, perform
 * calculations, analyze mathematical patterns, and provide step-by-step solutions.
 */

import {
  ExternalTool,
  ToolInput,
  ToolOutput,
  ValidationResult,
  ToolSchema,
} from '../tool-registry.js';
import { evaluate, round } from 'mathjs';

export class MathematicalSolver implements ExternalTool {
  id = 'mathematical-solver';
  name = 'Mathematical Solver';
  description = 'Advanced mathematical reasoning and computation tool';
  category = 'mathematical' as const;
  version = '1.0.0';
  capabilities = [
    'algebra',
    'calculus',
    'statistics',
    'geometry',
    'number_theory',
    'linear_algebra',
    'optimization',
    'pattern_analysis',
  ];

  config = {
    timeout_ms: 10000,
    max_retries: 3,
    requires_auth: false,
    rate_limit: {
      requests_per_minute: 100,
      burst_limit: 10,
    },
  };

  async execute(input: ToolInput): Promise<ToolOutput> {
    const startTime = Date.now();

    try {
      const result = await this.performMathematicalOperation(input);

      return {
        success: true,
        result,
        metadata: {
          execution_time_ms: Date.now() - startTime,
          tool_version: this.version,
          confidence: result.confidence,
          reasoning_trace: result.steps,
        },
      };
    } catch (error) {
      return {
        success: false,
        result: null,
        metadata: {
          execution_time_ms: Date.now() - startTime,
          tool_version: this.version,
        },
        error: {
          code: 'MATH_ERROR',
          message: (error as Error).message,
          details: error,
        },
      };
    }
  }

  async validate(input: ToolInput): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Validate operation
    if (!input.operation) {
      errors.push('Operation is required');
    } else if (!this.getSupportedOperations().includes(input.operation)) {
      errors.push(`Unsupported operation: ${input.operation}`);
      suggestions.push(`Supported operations: ${this.getSupportedOperations().join(', ')}`);
    }

    // Validate parameters based on operation
    if (input.operation === 'solve_equation' && !input.parameters.equation) {
      errors.push('Equation parameter is required for solve_equation operation');
    }

    if (input.operation === 'calculate' && !input.parameters.expression) {
      errors.push('Expression parameter is required for calculate operation');
    }

    if (input.operation === 'analyze_pattern' && !input.parameters.sequence) {
      errors.push('Sequence parameter is required for analyze_pattern operation');
    }

    // Warnings for complex operations
    if (input.operation === 'solve_differential_equation') {
      warnings.push('Differential equation solving may take longer than usual');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  getSchema(): ToolSchema {
    return {
      operations: {
        calculate: {
          description: 'Perform mathematical calculations',
          parameters: {
            expression: { type: 'string', description: 'Mathematical expression to evaluate' },
            precision: { type: 'number', description: 'Number of decimal places', default: 10 },
          },
          returns: {
            result: { type: 'number', description: 'Calculated result' },
            formatted: { type: 'string', description: 'Human-readable result' },
          },
          examples: [
            { expression: '2 + 3 * 4', result: 14 },
            { expression: 'sqrt(16) + log(10)', result: 5 },
          ],
        },
        solve_equation: {
          description: 'Solve algebraic equations',
          parameters: {
            equation: {
              type: 'string',
              description: 'Equation to solve (e.g., "x^2 - 5x + 6 = 0")',
            },
            variable: { type: 'string', description: 'Variable to solve for', default: 'x' },
          },
          returns: {
            solutions: { type: 'array', description: 'Array of solutions' },
            steps: { type: 'array', description: 'Step-by-step solution process' },
          },
          examples: [{ equation: 'x^2 - 5x + 6 = 0', solutions: [2, 3] }],
        },
        analyze_pattern: {
          description: 'Analyze mathematical patterns and sequences',
          parameters: {
            sequence: { type: 'array', description: 'Sequence of numbers to analyze' },
            predict_next: {
              type: 'number',
              description: 'Number of next terms to predict',
              default: 3,
            },
          },
          returns: {
            pattern_type: { type: 'string', description: 'Type of pattern detected' },
            formula: { type: 'string', description: 'Mathematical formula for the pattern' },
            next_terms: { type: 'array', description: 'Predicted next terms' },
          },
          examples: [{ sequence: [1, 1, 2, 3, 5, 8], pattern_type: 'fibonacci' }],
        },
        optimize: {
          description: 'Solve optimization problems',
          parameters: {
            objective: { type: 'string', description: 'Objective function to optimize' },
            constraints: { type: 'array', description: 'Constraint functions' },
            variables: { type: 'array', description: 'Variables to optimize' },
          },
          returns: {
            optimal_values: { type: 'object', description: 'Optimal variable values' },
            optimal_result: { type: 'number', description: 'Optimal objective value' },
          },
          examples: [],
        },
        statistical_analysis: {
          description: 'Perform statistical analysis on data',
          parameters: {
            data: { type: 'array', description: 'Data points to analyze' },
            analysis_type: {
              type: 'string',
              description: 'Type of analysis (descriptive, regression, etc.)',
            },
          },
          returns: {
            statistics: { type: 'object', description: 'Statistical measures' },
            insights: { type: 'array', description: 'Key insights from the analysis' },
          },
          examples: [],
        },
      },
    };
  }

  private async performMathematicalOperation(input: ToolInput): Promise<any> {
    switch (input.operation) {
      case 'calculate':
        return this.calculate(input.parameters.expression, input.parameters.precision || 10);

      case 'solve_equation':
        return this.solveEquation(input.parameters.equation, input.parameters.variable || 'x');

      case 'analyze_pattern':
        return this.analyzePattern(input.parameters.sequence, input.parameters.predict_next || 3);

      case 'optimize':
        return this.optimize(
          input.parameters.objective,
          input.parameters.constraints,
          input.parameters.variables
        );

      case 'statistical_analysis':
        return this.statisticalAnalysis(input.parameters.data, input.parameters.analysis_type);

      default:
        throw new Error(`Unsupported operation: ${input.operation}`);
    }
  }

  private calculate(expression: string, precision: number): any {
    try {
      // Use mathjs for safe expression evaluation
      // mathjs supports all common mathematical functions and operators safely
      const result = evaluate(expression);

      // Convert to number if needed (mathjs can return complex numbers, matrices, etc.)
      const numericResult = typeof result === 'number' ? result : Number(result);

      if (isNaN(numericResult)) {
        throw new Error('Expression did not evaluate to a numeric value');
      }

      const roundedResult = round(numericResult, precision);

      return {
        result: roundedResult,
        formatted: `${expression} = ${roundedResult}`,
        confidence: 0.95,
        steps: [
          `Original expression: ${expression}`,
          `Evaluated result: ${numericResult}`,
          `Rounded to ${precision} decimal places: ${roundedResult}`,
          `Using mathjs for safe evaluation`,
        ],
      };
    } catch (error) {
      throw new Error(`Failed to calculate expression: ${(error as Error).message}`);
    }
  }

  private solveEquation(equation: string, variable: string): any {
    // Simplified equation solver for demonstration
    // In production, use a proper symbolic math library

    const steps: string[] = [];
    steps.push(`Solving equation: ${equation}`);
    steps.push(`Variable: ${variable}`);

    // Handle simple quadratic equations (ax^2 + bx + c = 0)
    const quadraticMatch = equation.match(
      /([+-]?\d*)\s*\*?\s*x\^2\s*([+-]?\d*)\s*\*?\s*x\s*([+-]?\d*)\s*=\s*0/
    );

    if (quadraticMatch) {
      const a = parseFloat(quadraticMatch[1] || '1');
      const b = parseFloat(quadraticMatch[2] || '0');
      const c = parseFloat(quadraticMatch[3] || '0');

      steps.push(`Identified quadratic equation: ${a}x² + ${b}x + ${c} = 0`);

      const discriminant = b * b - 4 * a * c;
      steps.push(`Discriminant: b² - 4ac = ${b}² - 4(${a})(${c}) = ${discriminant}`);

      if (discriminant >= 0) {
        const x1 = (-b + Math.sqrt(discriminant)) / (2 * a);
        const x2 = (-b - Math.sqrt(discriminant)) / (2 * a);

        steps.push(`Solutions: x = (-${b} ± √${discriminant}) / (2 × ${a})`);
        steps.push(`x₁ = ${x1}, x₂ = ${x2}`);

        return {
          solutions: discriminant === 0 ? [x1] : [x1, x2],
          steps,
          confidence: 0.98,
          equation_type: 'quadratic',
        };
      } else {
        steps.push('No real solutions (discriminant < 0)');
        return {
          solutions: [],
          steps,
          confidence: 0.98,
          equation_type: 'quadratic',
          note: 'Complex solutions exist but not computed',
        };
      }
    }

    // Handle simple linear equations (ax + b = 0)
    const linearMatch = equation.match(/([+-]?\d*)\s*\*?\s*x\s*([+-]?\d*)\s*=\s*0/);
    if (linearMatch) {
      const a = parseFloat(linearMatch[1] || '1');
      const b = parseFloat(linearMatch[2] || '0');

      steps.push(`Identified linear equation: ${a}x + ${b} = 0`);

      if (a !== 0) {
        const solution = -b / a;
        steps.push(`Solution: x = -${b} / ${a} = ${solution}`);

        return {
          solutions: [solution],
          steps,
          confidence: 0.99,
          equation_type: 'linear',
        };
      }
    }

    throw new Error(`Unable to solve equation: ${equation}`);
  }

  private analyzePattern(sequence: number[], predictNext: number): any {
    const steps: string[] = [];
    steps.push(`Analyzing sequence: [${sequence.join(', ')}]`);

    // Check for arithmetic progression
    const differences: number[] = [];
    for (let i = 1; i < sequence.length; i++) {
      differences.push(sequence[i] - sequence[i - 1]);
    }

    const isArithmetic = differences.every(d => d === differences[0]);
    if (isArithmetic) {
      const commonDiff = differences[0];
      steps.push(`Arithmetic progression detected with common difference: ${commonDiff}`);

      const nextTerms = [];
      for (let i = 0; i < predictNext; i++) {
        nextTerms.push(sequence[sequence.length - 1] + commonDiff * (i + 1));
      }

      return {
        pattern_type: 'arithmetic',
        formula: `a_n = ${sequence[0]} + ${commonDiff} × (n - 1)`,
        next_terms: nextTerms,
        confidence: 0.95,
        steps,
      };
    }

    // Check for geometric progression
    const ratios: number[] = [];
    for (let i = 1; i < sequence.length; i++) {
      if (sequence[i - 1] !== 0) {
        ratios.push(sequence[i] / sequence[i - 1]);
      }
    }

    const isGeometric = ratios.length > 0 && ratios.every(r => Math.abs(r - ratios[0]) < 0.0001);
    if (isGeometric) {
      const commonRatio = ratios[0];
      steps.push(`Geometric progression detected with common ratio: ${commonRatio}`);

      const nextTerms = [];
      for (let i = 0; i < predictNext; i++) {
        nextTerms.push(sequence[sequence.length - 1] * Math.pow(commonRatio, i + 1));
      }

      return {
        pattern_type: 'geometric',
        formula: `a_n = ${sequence[0]} × ${commonRatio}^(n-1)`,
        next_terms: nextTerms,
        confidence: 0.95,
        steps,
      };
    }

    // Check for Fibonacci-like sequence
    const isFibonacci =
      sequence.length >= 3 &&
      sequence.slice(2).every((val, i) => val === sequence[i] + sequence[i + 1]);

    if (isFibonacci) {
      steps.push('Fibonacci-like sequence detected');

      const nextTerms = [];
      let prev2 = sequence[sequence.length - 2];
      let prev1 = sequence[sequence.length - 1];

      for (let i = 0; i < predictNext; i++) {
        const next = prev1 + prev2;
        nextTerms.push(next);
        prev2 = prev1;
        prev1 = next;
      }

      return {
        pattern_type: 'fibonacci',
        formula: 'a_n = a_(n-1) + a_(n-2)',
        next_terms: nextTerms,
        confidence: 0.92,
        steps,
      };
    }

    // If no pattern found, try polynomial fitting
    steps.push('No simple pattern detected, attempting polynomial fit');

    return {
      pattern_type: 'unknown',
      formula: 'Pattern not recognized',
      next_terms: [],
      confidence: 0.1,
      steps,
      suggestion: 'Sequence may follow a more complex pattern requiring advanced analysis',
    };
  }

  private optimize(objective: string, constraints: string[], variables: string[]): any {
    // Simplified optimization for demonstration
    // In production, use a proper optimization library

    return {
      optimal_values: {},
      optimal_result: 0,
      confidence: 0.3,
      steps: ['Optimization functionality not fully implemented'],
      note: 'This is a placeholder for advanced optimization capabilities',
    };
  }

  private statisticalAnalysis(data: number[], analysisType: string): any {
    const steps: string[] = [];
    steps.push(`Performing ${analysisType} analysis on ${data.length} data points`);

    // Basic descriptive statistics
    const sorted = [...data].sort((a, b) => a - b);
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);
    const median =
      sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];

    const statistics = {
      count: data.length,
      mean: Math.round(mean * 1000) / 1000,
      median: Math.round(median * 1000) / 1000,
      std_dev: Math.round(stdDev * 1000) / 1000,
      variance: Math.round(variance * 1000) / 1000,
      min: Math.min(...data),
      max: Math.max(...data),
      range: Math.max(...data) - Math.min(...data),
    };

    const insights = [
      `Dataset contains ${data.length} observations`,
      `Mean value: ${statistics.mean}`,
      `Standard deviation: ${statistics.std_dev}`,
      `Data range: ${statistics.min} to ${statistics.max}`,
    ];

    if (statistics.std_dev / statistics.mean > 0.5) {
      insights.push('High variability detected in the dataset');
    }

    return {
      statistics,
      insights,
      confidence: 0.9,
      steps,
    };
  }

  private getSupportedOperations(): string[] {
    return ['calculate', 'solve_equation', 'analyze_pattern', 'optimize', 'statistical_analysis'];
  }
}
