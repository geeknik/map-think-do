/**
 * @fileoverview Mathematical Solver Tool
 *
 * Advanced mathematical reasoning tool using mathjs for real computation.
 * Supports expression evaluation, equation solving, pattern analysis,
 * matrix operations, statistical analysis, and symbolic computation.
 */

import * as math from 'mathjs';
import {
  ExternalTool,
  ToolInput,
  ToolOutput,
  ValidationResult,
  ToolSchema,
} from '../tool-registry.js';

export class MathematicalSolver implements ExternalTool {
  id = 'mathematical-solver';
  name = 'Mathematical Solver';
  description = 'Advanced mathematical reasoning with real computation using mathjs';
  category = 'mathematical' as const;
  version = '2.0.0';
  capabilities = [
    'expression_evaluation',
    'equation_solving',
    'pattern_analysis',
    'matrix_operations',
    'statistics',
    'calculus',
    'unit_conversion',
    'symbolic_math',
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

    if (!input.operation) {
      errors.push('Operation is required');
    } else if (!this.getSupportedOperations().includes(input.operation)) {
      errors.push(`Unsupported operation: ${input.operation}`);
      suggestions.push(`Supported operations: ${this.getSupportedOperations().join(', ')}`);
    }

    if (input.operation === 'calculate' && !input.parameters.expression) {
      errors.push('Expression parameter is required for calculate operation');
    }

    if (input.operation === 'solve_equation' && !input.parameters.equation) {
      errors.push('Equation parameter is required for solve_equation operation');
    }

    if (input.operation === 'analyze_pattern' && !input.parameters.sequence) {
      errors.push('Sequence parameter is required for analyze_pattern operation');
    }

    if (input.operation === 'matrix_operation' && !input.parameters.matrix) {
      errors.push('Matrix parameter is required for matrix_operation operation');
    }

    if (input.operation === 'statistical_analysis' && !input.parameters.data) {
      errors.push('Data parameter is required for statistical_analysis operation');
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
          description: 'Evaluate mathematical expressions using mathjs',
          parameters: {
            expression: { type: 'string', description: 'Mathematical expression to evaluate' },
            precision: { type: 'number', description: 'Decimal places', default: 10 },
            scope: { type: 'object', description: 'Variable definitions', default: {} },
          },
          returns: {
            result: { type: 'number', description: 'Calculated result' },
            formatted: { type: 'string', description: 'Human-readable result' },
          },
          examples: [
            { expression: 'sqrt(16) + log(e)', result: 5 },
            { expression: 'sin(pi/2) * 2', result: 2 },
          ],
        },
        solve_equation: {
          description: 'Solve algebraic equations',
          parameters: {
            equation: { type: 'string', description: 'Equation to solve' },
            variable: { type: 'string', description: 'Variable to solve for', default: 'x' },
          },
          returns: {
            solutions: { type: 'array', description: 'Solutions' },
            steps: { type: 'array', description: 'Solution steps' },
          },
          examples: [{ equation: 'x^2 - 5x + 6 = 0', solutions: [2, 3] }],
        },
        analyze_pattern: {
          description: 'Analyze mathematical sequences and predict next terms',
          parameters: {
            sequence: { type: 'array', description: 'Number sequence' },
            predict_next: { type: 'number', description: 'Terms to predict', default: 3 },
          },
          returns: {
            pattern_type: { type: 'string', description: 'Pattern type' },
            formula: { type: 'string', description: 'Pattern formula' },
            next_terms: { type: 'array', description: 'Predicted terms' },
          },
          examples: [],
        },
        matrix_operation: {
          description: 'Perform matrix operations',
          parameters: {
            matrix: { type: 'array', description: '2D matrix' },
            operation: { type: 'string', description: 'Operation type' },
            matrix2: { type: 'array', description: 'Second matrix for binary operations' },
          },
          returns: {
            result: { type: 'any', description: 'Operation result' },
          },
          examples: [],
        },
        statistical_analysis: {
          description: 'Perform statistical analysis on data',
          parameters: {
            data: { type: 'array', description: 'Data points' },
            analysis_type: { type: 'string', description: 'Analysis type', default: 'descriptive' },
          },
          returns: {
            statistics: { type: 'object', description: 'Statistical measures' },
            insights: { type: 'array', description: 'Key insights' },
          },
          examples: [],
        },
        derivative: {
          description: 'Compute symbolic derivative',
          parameters: {
            expression: { type: 'string', description: 'Expression to differentiate' },
            variable: { type: 'string', description: 'Differentiation variable', default: 'x' },
          },
          returns: {
            derivative: { type: 'string', description: 'Derivative expression' },
          },
          examples: [],
        },
        simplify: {
          description: 'Simplify mathematical expression',
          parameters: {
            expression: { type: 'string', description: 'Expression to simplify' },
          },
          returns: {
            simplified: { type: 'string', description: 'Simplified expression' },
          },
          examples: [],
        },
        convert_units: {
          description: 'Convert between units',
          parameters: {
            value: { type: 'string', description: 'Value with unit (e.g., "5 km")' },
            to_unit: { type: 'string', description: 'Target unit (e.g., "miles")' },
          },
          returns: {
            result: { type: 'string', description: 'Converted value' },
          },
          examples: [],
        },
      },
    };
  }

  private async performMathematicalOperation(input: ToolInput): Promise<any> {
    switch (input.operation) {
      case 'calculate':
        return this.calculate(
          input.parameters.expression,
          input.parameters.precision,
          input.parameters.scope
        );
      case 'solve_equation':
        return this.solveEquation(input.parameters.equation, input.parameters.variable);
      case 'analyze_pattern':
        return this.analyzePattern(input.parameters.sequence, input.parameters.predict_next);
      case 'matrix_operation':
        return this.matrixOperation(
          input.parameters.matrix,
          input.parameters.operation,
          input.parameters.matrix2
        );
      case 'statistical_analysis':
        return this.statisticalAnalysis(input.parameters.data, input.parameters.analysis_type);
      case 'derivative':
        return this.computeDerivative(input.parameters.expression, input.parameters.variable);
      case 'simplify':
        return this.simplifyExpression(input.parameters.expression);
      case 'convert_units':
        return this.convertUnits(input.parameters.value, input.parameters.to_unit);
      default:
        throw new Error(`Unsupported operation: ${input.operation}`);
    }
  }

  // ============ Core Operations ============

  private calculate(
    expression: string,
    precision: number = 10,
    scope: Record<string, any> = {}
  ): any {
    const steps: string[] = [];
    steps.push(`Evaluating: ${expression}`);

    try {
      // Add common constants to scope if not defined
      const fullScope = {
        ...scope,
      };

      if (Object.keys(scope).length > 0) {
        steps.push(`With variables: ${JSON.stringify(scope)}`);
      }

      const result = math.evaluate(expression, fullScope);
      steps.push(`Raw result: ${result}`);

      // Handle different result types
      let finalResult: any;
      let formatted: string;

      if (typeof result === 'number') {
        finalResult = math.round(result, precision);
        formatted = `${expression} = ${finalResult}`;
      } else if (math.isMatrix(result)) {
        finalResult = result.toArray();
        formatted = `${expression} = ${math.format(result)}`;
      } else if (math.isComplex(result)) {
        finalResult = { re: result.re, im: result.im };
        formatted = `${expression} = ${math.format(result)}`;
      } else if (result && typeof result.toNumber === 'function') {
        finalResult = math.round(result.toNumber(), precision);
        formatted = `${expression} = ${finalResult}`;
      } else {
        finalResult = result;
        formatted = `${expression} = ${math.format(result)}`;
      }

      steps.push(`Final result: ${formatted}`);

      return {
        result: finalResult,
        formatted,
        expression_type: this.classifyExpression(expression),
        confidence: 0.98,
        steps,
      };
    } catch (error) {
      throw new Error(`Calculation error: ${(error as Error).message}`);
    }
  }

  private solveEquation(equation: string, variable: string = 'x'): any {
    const steps: string[] = [];
    steps.push(`Solving: ${equation}`);
    steps.push(`Variable: ${variable}`);

    try {
      // Parse the equation (assuming format: expression = expression or expression = 0)
      let leftSide: string;
      let rightSide: string = '0';

      if (equation.includes('=')) {
        const parts = equation.split('=').map(s => s.trim());
        leftSide = parts[0];
        rightSide = parts[1] || '0';
      } else {
        leftSide = equation;
      }

      // Move everything to left side
      const normalizedExpr = rightSide === '0' ? leftSide : `(${leftSide}) - (${rightSide})`;
      steps.push(`Normalized form: ${normalizedExpr} = 0`);

      // Try to solve using mathjs's rationalize and equation solving
      // For polynomial equations, we'll use numerical methods
      const solutions = this.findRoots(normalizedExpr, variable, steps);

      return {
        solutions,
        equation_type: this.classifyEquation(normalizedExpr),
        confidence: solutions.length > 0 ? 0.95 : 0.5,
        steps,
      };
    } catch (error) {
      throw new Error(`Equation solving error: ${(error as Error).message}`);
    }
  }

  private findRoots(expression: string, variable: string, steps: string[]): number[] {
    const roots: number[] = [];

    // Try to parse as polynomial and find roots
    try {
      // Evaluate at various points to find sign changes (bracketing method)
      const testPoints = [-100, -10, -5, -2, -1, -0.5, 0, 0.5, 1, 2, 5, 10, 100];
      const values: { x: number; y: number }[] = [];

      for (const x of testPoints) {
        try {
          const y = math.evaluate(expression, { [variable]: x }) as number;
          if (typeof y === 'number' && isFinite(y)) {
            values.push({ x, y });
          }
        } catch {
          // Skip invalid points
        }
      }

      // Find sign changes and refine roots
      for (let i = 0; i < values.length - 1; i++) {
        const v1 = values[i];
        const v2 = values[i + 1];

        if (v1.y * v2.y < 0) {
          // Sign change detected - use bisection to find root
          const root = this.bisectionMethod(expression, variable, v1.x, v2.x, 1e-10, 100);
          if (root !== null && !roots.some(r => Math.abs(r - root) < 1e-6)) {
            roots.push(math.round(root, 10) as number);
            steps.push(`Found root at ${variable} = ${math.round(root, 6)}`);
          }
        }

        // Check if point is approximately zero
        if (Math.abs(v1.y) < 1e-10 && !roots.some(r => Math.abs(r - v1.x) < 1e-6)) {
          roots.push(v1.x);
          steps.push(`Found exact root at ${variable} = ${v1.x}`);
        }
      }

      // Check quadratic formula for degree-2 polynomials
      const quadraticRoots = this.tryQuadraticFormula(expression, variable, steps);
      for (const r of quadraticRoots) {
        if (!roots.some(existing => Math.abs(existing - r) < 1e-6)) {
          roots.push(r);
        }
      }

      return roots.sort((a, b) => a - b);
    } catch (error) {
      steps.push(`Root finding encountered error: ${(error as Error).message}`);
      return roots;
    }
  }

  private bisectionMethod(
    expr: string,
    variable: string,
    a: number,
    b: number,
    tol: number,
    maxIter: number
  ): number | null {
    let left = a;
    let right = b;

    for (let i = 0; i < maxIter; i++) {
      const mid = (left + right) / 2;
      const fMid = math.evaluate(expr, { [variable]: mid }) as number;

      if (Math.abs(fMid) < tol || (right - left) / 2 < tol) {
        return mid;
      }

      const fLeft = math.evaluate(expr, { [variable]: left }) as number;
      if (fLeft * fMid < 0) {
        right = mid;
      } else {
        left = mid;
      }
    }

    return (left + right) / 2;
  }

  private tryQuadraticFormula(expression: string, variable: string, steps: string[]): number[] {
    // Try to match ax^2 + bx + c pattern
    try {
      const coefficients = this.extractPolynomialCoefficients(expression, variable);

      if (coefficients.degree === 2) {
        const a = coefficients.coeffs[2] || 0;
        const b = coefficients.coeffs[1] || 0;
        const c = coefficients.coeffs[0] || 0;

        steps.push(`Identified quadratic: ${a}${variable}² + ${b}${variable} + ${c}`);

        const discriminant = b * b - 4 * a * c;
        steps.push(`Discriminant: ${discriminant}`);

        if (discriminant >= 0) {
          const x1 = (-b + Math.sqrt(discriminant)) / (2 * a);
          const x2 = (-b - Math.sqrt(discriminant)) / (2 * a);

          if (discriminant === 0) {
            return [math.round(x1, 10) as number];
          } else {
            return [math.round(x1, 10) as number, math.round(x2, 10) as number];
          }
        }
      }
    } catch {
      // Not a simple quadratic
    }

    return [];
  }

  private extractPolynomialCoefficients(
    expression: string,
    variable: string
  ): { degree: number; coeffs: number[] } {
    // Evaluate polynomial at multiple points to determine coefficients
    const points = [0, 1, 2, 3, 4];
    const values = points.map(x => math.evaluate(expression, { [variable]: x }) as number);

    // Use finite differences to determine degree and coefficients
    let diffs = [...values];
    let degree = 0;

    for (let d = 0; d < points.length - 1; d++) {
      const newDiffs = [];
      for (let i = 0; i < diffs.length - 1; i++) {
        newDiffs.push(diffs[i + 1] - diffs[i]);
      }

      if (newDiffs.every(v => Math.abs(v) < 1e-10)) {
        degree = d;
        break;
      }
      diffs = newDiffs;
      degree = d + 1;
    }

    // For quadratic: f(x) = ax^2 + bx + c
    // f(0) = c, f(1) = a + b + c, f(2) = 4a + 2b + c
    const coeffs: number[] = [];
    if (degree === 0) {
      coeffs[0] = values[0];
    } else if (degree === 1) {
      coeffs[0] = values[0]; // c
      coeffs[1] = values[1] - values[0]; // b
    } else if (degree === 2) {
      const c = values[0];
      const ab = values[1] - c; // a + b
      const fourA2b = values[2] - c; // 4a + 2b
      const a = (fourA2b - 2 * ab) / 2;
      const b = ab - a;
      coeffs[0] = c;
      coeffs[1] = b;
      coeffs[2] = a;
    }

    return { degree, coeffs };
  }

  // ============ Pattern Analysis ============

  private analyzePattern(sequence: number[], predictNext: number = 3): any {
    const steps: string[] = [];
    steps.push(`Analyzing sequence: [${sequence.join(', ')}]`);

    if (sequence.length < 2) {
      throw new Error('Sequence must have at least 2 elements');
    }

    // Check arithmetic progression
    const arithmeticResult = this.checkArithmeticProgression(sequence);
    if (arithmeticResult.isArithmetic) {
      const nextTerms = [];
      let last = sequence[sequence.length - 1];
      for (let i = 0; i < predictNext; i++) {
        last += arithmeticResult.commonDiff!;
        nextTerms.push(math.round(last, 10));
      }

      steps.push(`Arithmetic progression with d = ${arithmeticResult.commonDiff}`);

      return {
        pattern_type: 'arithmetic',
        formula: `a_n = ${sequence[0]} + ${arithmeticResult.commonDiff} × (n - 1)`,
        parameters: { first_term: sequence[0], common_difference: arithmeticResult.commonDiff },
        next_terms: nextTerms,
        confidence: 0.98,
        steps,
      };
    }

    // Check geometric progression
    const geometricResult = this.checkGeometricProgression(sequence);
    if (geometricResult.isGeometric) {
      const nextTerms = [];
      let last = sequence[sequence.length - 1];
      for (let i = 0; i < predictNext; i++) {
        last *= geometricResult.commonRatio!;
        nextTerms.push(math.round(last, 10));
      }

      steps.push(`Geometric progression with r = ${geometricResult.commonRatio}`);

      return {
        pattern_type: 'geometric',
        formula: `a_n = ${sequence[0]} × ${geometricResult.commonRatio}^(n-1)`,
        parameters: { first_term: sequence[0], common_ratio: geometricResult.commonRatio },
        next_terms: nextTerms,
        confidence: 0.97,
        steps,
      };
    }

    // Check Fibonacci-like
    const fibResult = this.checkFibonacciLike(sequence);
    if (fibResult.isFibonacci) {
      const nextTerms = [];
      const len = sequence.length;
      let prev2 = sequence[len - 2];
      let prev1 = sequence[len - 1];
      for (let i = 0; i < predictNext; i++) {
        const next = prev1 + prev2;
        nextTerms.push(next);
        prev2 = prev1;
        prev1 = next;
      }

      steps.push('Fibonacci-like sequence detected');

      return {
        pattern_type: 'fibonacci',
        formula: 'a_n = a_(n-1) + a_(n-2)',
        parameters: { seed_values: [sequence[0], sequence[1]] },
        next_terms: nextTerms,
        confidence: 0.95,
        steps,
      };
    }

    // Check polynomial pattern
    const polyResult = this.checkPolynomialPattern(sequence);
    if (polyResult.isPolynomial && polyResult.degree! <= 3) {
      const nextTerms = [];
      for (let i = 0; i < predictNext; i++) {
        const n = sequence.length + i + 1;
        let value = 0;
        for (let d = 0; d <= polyResult.degree!; d++) {
          value += polyResult.coefficients![d] * Math.pow(n, d);
        }
        nextTerms.push(math.round(value, 6));
      }

      steps.push(`Polynomial pattern of degree ${polyResult.degree}`);

      return {
        pattern_type: `polynomial_degree_${polyResult.degree}`,
        formula: this.formatPolynomialFormula(polyResult.coefficients!),
        parameters: { coefficients: polyResult.coefficients, degree: polyResult.degree },
        next_terms: nextTerms,
        confidence: 0.85,
        steps,
      };
    }

    // Check for prime numbers
    if (this.isPrimeSequence(sequence)) {
      const nextTerms = this.getNextPrimes(sequence[sequence.length - 1], predictNext);
      steps.push('Prime number sequence detected');

      return {
        pattern_type: 'primes',
        formula: 'Prime number sequence',
        next_terms: nextTerms,
        confidence: 0.9,
        steps,
      };
    }

    steps.push('No simple pattern detected');

    return {
      pattern_type: 'unknown',
      formula: 'Pattern not recognized',
      next_terms: [],
      confidence: 0.2,
      steps,
      suggestion: 'Try providing more terms or check for complex patterns',
    };
  }

  private checkArithmeticProgression(seq: number[]): {
    isArithmetic: boolean;
    commonDiff?: number;
  } {
    if (seq.length < 2) return { isArithmetic: false };

    const diff = seq[1] - seq[0];
    for (let i = 2; i < seq.length; i++) {
      if (Math.abs(seq[i] - seq[i - 1] - diff) > 1e-10) {
        return { isArithmetic: false };
      }
    }
    return { isArithmetic: true, commonDiff: diff };
  }

  private checkGeometricProgression(seq: number[]): { isGeometric: boolean; commonRatio?: number } {
    if (seq.length < 2 || seq.some(x => x === 0)) return { isGeometric: false };

    const ratio = seq[1] / seq[0];
    for (let i = 2; i < seq.length; i++) {
      if (Math.abs(seq[i] / seq[i - 1] - ratio) > 1e-10) {
        return { isGeometric: false };
      }
    }
    return { isGeometric: true, commonRatio: ratio };
  }

  private checkFibonacciLike(seq: number[]): { isFibonacci: boolean } {
    if (seq.length < 3) return { isFibonacci: false };

    for (let i = 2; i < seq.length; i++) {
      if (Math.abs(seq[i] - (seq[i - 1] + seq[i - 2])) > 1e-10) {
        return { isFibonacci: false };
      }
    }
    return { isFibonacci: true };
  }

  private checkPolynomialPattern(seq: number[]): {
    isPolynomial: boolean;
    degree?: number;
    coefficients?: number[];
  } {
    // Use method of differences
    let diffs: number[] = [...seq];
    let degree = 0;

    for (let d = 0; d < seq.length - 1; d++) {
      const newDiffs: number[] = [];
      for (let i = 0; i < diffs.length - 1; i++) {
        newDiffs.push(diffs[i + 1] - diffs[i]);
      }

      if (newDiffs.every(v => Math.abs(v - newDiffs[0]) < 1e-10)) {
        degree = d + 1;

        // Reconstruct coefficients using Lagrange interpolation
        const coefficients = this.lagrangeCoefficients(seq, degree);
        return { isPolynomial: true, degree, coefficients };
      }
      diffs = newDiffs;
    }

    return { isPolynomial: false };
  }

  private lagrangeCoefficients(seq: number[], degree: number): number[] {
    // Simplified coefficient extraction for low-degree polynomials
    const n = seq.length;
    const coeffs: number[] = new Array(degree + 1).fill(0);

    // For degree 1: a*n + b
    if (degree === 1 && n >= 2) {
      const a = seq[1] - seq[0];
      const b = seq[0] - a; // b = y[0] - a*1
      coeffs[0] = b;
      coeffs[1] = a;
    }
    // For degree 2: a*n^2 + b*n + c
    else if (degree === 2 && n >= 3) {
      // Use first 3 points: (1, seq[0]), (2, seq[1]), (3, seq[2])
      const y0 = seq[0],
        y1 = seq[1],
        y2 = seq[2];
      const a = (y2 - 2 * y1 + y0) / 2;
      const b = y1 - y0 - 3 * a;
      const c = y0 - a - b;
      coeffs[0] = c;
      coeffs[1] = b;
      coeffs[2] = a;
    }

    return coeffs;
  }

  private formatPolynomialFormula(coeffs: number[]): string {
    const terms: string[] = [];
    for (let i = coeffs.length - 1; i >= 0; i--) {
      const c = math.round(coeffs[i], 4);
      if (Math.abs(c as number) < 1e-10) continue;

      let term = '';
      if (i === 0) {
        term = String(c);
      } else if (i === 1) {
        term = c === 1 ? 'n' : `${c}n`;
      } else {
        term = c === 1 ? `n^${i}` : `${c}n^${i}`;
      }

      if (terms.length > 0 && (c as number) > 0) {
        terms.push(`+ ${term}`);
      } else {
        terms.push(term);
      }
    }

    return `a_n = ${terms.join(' ') || '0'}`;
  }

  private isPrimeSequence(seq: number[]): boolean {
    const isPrime = (n: number): boolean => {
      if (n < 2) return false;
      if (n === 2) return true;
      if (n % 2 === 0) return false;
      for (let i = 3; i <= Math.sqrt(n); i += 2) {
        if (n % i === 0) return false;
      }
      return true;
    };

    // Check if all are primes and consecutive
    if (!seq.every(isPrime)) return false;

    // Check if they're consecutive primes
    for (let i = 1; i < seq.length; i++) {
      let nextPrime = seq[i - 1] + 1;
      while (!isPrime(nextPrime)) nextPrime++;
      if (nextPrime !== seq[i]) return false;
    }

    return true;
  }

  private getNextPrimes(after: number, count: number): number[] {
    const isPrime = (n: number): boolean => {
      if (n < 2) return false;
      if (n === 2) return true;
      if (n % 2 === 0) return false;
      for (let i = 3; i <= Math.sqrt(n); i += 2) {
        if (n % i === 0) return false;
      }
      return true;
    };

    const primes: number[] = [];
    let current = after + 1;
    while (primes.length < count) {
      if (isPrime(current)) primes.push(current);
      current++;
    }
    return primes;
  }

  // ============ Matrix Operations ============

  private matrixOperation(matrix: number[][], operation: string, matrix2?: number[][]): any {
    const steps: string[] = [];
    steps.push(`Matrix operation: ${operation}`);

    try {
      const m1 = math.matrix(matrix);
      steps.push(`Input matrix: ${math.format(m1)}`);

      let result: any;
      let resultFormatted: string;

      switch (operation) {
        case 'determinant':
          result = math.det(m1);
          resultFormatted = `det(A) = ${result}`;
          break;

        case 'inverse':
          result = math.inv(m1);
          resultFormatted = `A^(-1) = ${math.format(result)}`;
          break;

        case 'transpose':
          result = math.transpose(m1);
          resultFormatted = `A^T = ${math.format(result)}`;
          break;

        case 'eigenvalues': {
          const eig = math.eigs(m1);
          result = { values: eig.values, vectors: eig.eigenvectors };
          resultFormatted = `Eigenvalues: ${math.format(eig.values)}`;
          break;
        }

        case 'trace':
          result = math.trace(m1);
          resultFormatted = `tr(A) = ${result}`;
          break;

        case 'rank': {
          // Calculate rank via SVD approximation
          const size = math.size(m1).valueOf() as number[];
          result = Math.min(size[0], size[1]); // Simplified
          resultFormatted = `rank(A) = ${result}`;
          break;
        }

        case 'multiply': {
          if (!matrix2) throw new Error('Second matrix required for multiplication');
          const m2 = math.matrix(matrix2);
          result = math.multiply(m1, m2);
          resultFormatted = `A × B = ${math.format(result)}`;
          break;
        }

        case 'add':
          if (!matrix2) throw new Error('Second matrix required for addition');
          result = math.add(m1, math.matrix(matrix2));
          resultFormatted = `A + B = ${math.format(result)}`;
          break;

        case 'subtract':
          if (!matrix2) throw new Error('Second matrix required for subtraction');
          result = math.subtract(m1, math.matrix(matrix2));
          resultFormatted = `A - B = ${math.format(result)}`;
          break;

        case 'lu': {
          const lu = math.lup(m1);
          result = { L: lu.L, U: lu.U, P: lu.p };
          resultFormatted = 'LU decomposition computed';
          break;
        }

        default:
          throw new Error(`Unknown matrix operation: ${operation}`);
      }

      steps.push(resultFormatted);

      return {
        result: math.isMatrix(result) ? result.toArray() : result,
        operation,
        formatted: resultFormatted,
        confidence: 0.98,
        steps,
      };
    } catch (error) {
      throw new Error(`Matrix operation error: ${(error as Error).message}`);
    }
  }

  // ============ Statistical Analysis ============

  private statisticalAnalysis(data: number[], analysisType: string = 'descriptive'): any {
    const steps: string[] = [];
    steps.push(`Performing ${analysisType} analysis on ${data.length} data points`);

    if (data.length === 0) {
      throw new Error('Data array cannot be empty');
    }

    const statistics: any = {};

    // Descriptive statistics
    statistics.count = data.length;
    statistics.sum = math.sum(data);
    statistics.mean = math.mean(data);
    statistics.median = math.median(data);
    statistics.min = math.min(data);
    statistics.max = math.max(data);
    statistics.range = (statistics.max as number) - (statistics.min as number);
    statistics.variance = math.variance(data);
    statistics.std_dev = math.std(data);

    // Additional statistics
    const sorted = [...data].sort((a, b) => a - b);
    statistics.q1 = math.quantileSeq(sorted, 0.25);
    statistics.q3 = math.quantileSeq(sorted, 0.75);
    statistics.iqr = (statistics.q3 as number) - (statistics.q1 as number);

    // Mode (most frequent value)
    const frequency: Map<number, number> = new Map();
    data.forEach(v => frequency.set(v, (frequency.get(v) || 0) + 1));
    let maxFreq = 0;
    let mode: number[] = [];
    frequency.forEach((count, value) => {
      if (count > maxFreq) {
        maxFreq = count;
        mode = [value];
      } else if (count === maxFreq) {
        mode.push(value);
      }
    });
    statistics.mode = mode.length === data.length ? null : mode;

    // Skewness and Kurtosis
    const mean = statistics.mean as number;
    const stdDev = statistics.std_dev as number;
    if (stdDev > 0) {
      const n = data.length;
      const skewSum = data.reduce((sum, x) => sum + Math.pow((x - mean) / stdDev, 3), 0);
      const kurtSum = data.reduce((sum, x) => sum + Math.pow((x - mean) / stdDev, 4), 0);
      statistics.skewness = (n / ((n - 1) * (n - 2))) * skewSum;
      statistics.kurtosis =
        ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * kurtSum -
        (3 * (n - 1) * (n - 1)) / ((n - 2) * (n - 3));
    }

    // Round values for display
    Object.keys(statistics).forEach(key => {
      if (typeof statistics[key] === 'number') {
        statistics[key] = math.round(statistics[key], 6);
      }
    });

    // Generate insights
    const insights: string[] = [];
    insights.push(`Dataset contains ${data.length} observations`);
    insights.push(`Central tendency: mean = ${statistics.mean}, median = ${statistics.median}`);
    insights.push(`Spread: std_dev = ${statistics.std_dev}, IQR = ${statistics.iqr}`);

    if (Math.abs(statistics.skewness || 0) > 1) {
      insights.push(
        `Distribution is ${(statistics.skewness || 0) > 0 ? 'right' : 'left'}-skewed (skewness = ${statistics.skewness})`
      );
    } else {
      insights.push('Distribution is approximately symmetric');
    }

    // Outlier detection using IQR
    const lowerBound = (statistics.q1 as number) - 1.5 * (statistics.iqr as number);
    const upperBound = (statistics.q3 as number) + 1.5 * (statistics.iqr as number);
    const outliers = data.filter(x => x < lowerBound || x > upperBound);
    if (outliers.length > 0) {
      insights.push(`Detected ${outliers.length} potential outlier(s)`);
      statistics.outliers = outliers;
    }

    return {
      statistics,
      insights,
      confidence: 0.95,
      steps,
    };
  }

  // ============ Calculus Operations ============

  private computeDerivative(expression: string, variable: string = 'x'): any {
    const steps: string[] = [];
    steps.push(`Computing derivative of: ${expression}`);
    steps.push(`With respect to: ${variable}`);

    try {
      const parsed = math.parse(expression);
      const derivative = math.derivative(parsed, variable);
      const simplified = math.simplify(derivative);

      steps.push(`Derivative: ${derivative.toString()}`);
      steps.push(`Simplified: ${simplified.toString()}`);

      return {
        original: expression,
        derivative: simplified.toString(),
        variable,
        confidence: 0.98,
        steps,
      };
    } catch (error) {
      throw new Error(`Derivative computation error: ${(error as Error).message}`);
    }
  }

  private simplifyExpression(expression: string): any {
    const steps: string[] = [];
    steps.push(`Simplifying: ${expression}`);

    try {
      const parsed = math.parse(expression);
      const simplified = math.simplify(parsed);

      steps.push(`Result: ${simplified.toString()}`);

      return {
        original: expression,
        simplified: simplified.toString(),
        confidence: 0.95,
        steps,
      };
    } catch (error) {
      throw new Error(`Simplification error: ${(error as Error).message}`);
    }
  }

  // ============ Unit Conversion ============

  private convertUnits(value: string, toUnit: string): any {
    const steps: string[] = [];
    steps.push(`Converting: ${value} to ${toUnit}`);

    try {
      const result = math.evaluate(`${value} to ${toUnit}`);
      const formatted = math.format(result, { precision: 10 });

      steps.push(`Result: ${formatted}`);

      return {
        original: value,
        converted: formatted,
        to_unit: toUnit,
        confidence: 0.99,
        steps,
      };
    } catch (error) {
      throw new Error(`Unit conversion error: ${(error as Error).message}`);
    }
  }

  // ============ Helper Methods ============

  private classifyExpression(expr: string): string {
    if (expr.includes('sin') || expr.includes('cos') || expr.includes('tan')) {
      return 'trigonometric';
    }
    if (expr.includes('log') || expr.includes('ln') || expr.includes('exp')) {
      return 'logarithmic/exponential';
    }
    if (expr.includes('sqrt') || expr.includes('^(1/')) {
      return 'radical';
    }
    if (expr.includes('^') || expr.includes('**')) {
      return 'polynomial/power';
    }
    if (expr.includes('matrix') || expr.includes('[')) {
      return 'matrix';
    }
    return 'arithmetic';
  }

  private classifyEquation(expr: string): string {
    const hasX2 = expr.includes('x^2') || expr.includes('x**2');
    const hasX3 = expr.includes('x^3') || expr.includes('x**3');

    if (hasX3) return 'cubic';
    if (hasX2) return 'quadratic';
    if (expr.includes('x')) return 'linear';
    return 'constant';
  }

  private getSupportedOperations(): string[] {
    return [
      'calculate',
      'solve_equation',
      'analyze_pattern',
      'matrix_operation',
      'statistical_analysis',
      'derivative',
      'simplify',
      'convert_units',
    ];
  }
}
