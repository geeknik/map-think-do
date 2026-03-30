/**
 * @fileoverview Code Analysis Tool
 *
 * Advanced code analysis tool using real TypeScript AST parsing for accurate
 * code structure analysis, complexity metrics, pattern detection, and security scanning.
 *
 * Enhanced with:
 * - TypeScript Compiler API for real AST analysis
 * - Accurate cyclomatic complexity calculation
 * - Proper function/class extraction
 * - Real pattern detection
 */

import * as ts from 'typescript';
import {
  ExternalTool,
  ToolInput,
  ToolOutput,
  ValidationResult,
  ToolSchema,
} from '../tool-registry.js';

interface FunctionInfo {
  name: string;
  line: number;
  lineCount: number;
  paramCount: number;
  complexity: number;
  isAsync: boolean;
  isExported: boolean;
}

interface ClassInfo {
  name: string;
  line: number;
  methodCount: number;
  propertyCount: number;
  isExported: boolean;
  extendsClass?: string;
  implementsInterfaces: string[];
}

interface ImportInfo {
  module: string;
  namedImports: string[];
  defaultImport?: string;
  isTypeOnly: boolean;
}

export class CodeAnalyzer implements ExternalTool {
  id = 'code-analyzer';
  name = 'Code Analyzer';
  description = 'Advanced code analysis with real TypeScript AST parsing';
  category = 'analytical' as const;
  version = '2.0.0';
  capabilities = [
    'code_structure_analysis',
    'pattern_detection',
    'complexity_analysis',
    'architecture_insights',
    'refactoring_suggestions',
    'performance_analysis',
    'security_scanning',
    'dependency_analysis',
  ];

  config = {
    timeout_ms: 15000,
    max_retries: 2,
    requires_auth: false,
    rate_limit: {
      requests_per_minute: 50,
      burst_limit: 5,
    },
  };

  async execute(input: ToolInput): Promise<ToolOutput> {
    const startTime = Date.now();

    try {
      const result = await this.performCodeAnalysis(input);

      return {
        success: true,
        result,
        metadata: {
          execution_time_ms: Date.now() - startTime,
          tool_version: this.version,
          confidence: result.confidence,
          reasoning_trace: result.analysis_steps,
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
          code: 'CODE_ANALYSIS_ERROR',
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

    if (
      [
        'analyze_code',
        'detect_patterns',
        'suggest_refactoring',
        'analyze_complexity',
        'security_scan',
      ].includes(input.operation) &&
      !input.parameters.code
    ) {
      errors.push('Code parameter is required for this operation');
    }

    if (input.parameters.code && input.parameters.code.length > 50000) {
      warnings.push('Large code input detected - analysis may take longer');
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
        analyze_code: {
          description: 'Comprehensive code structure and quality analysis using AST',
          parameters: {
            code: { type: 'string', description: 'Source code to analyze' },
            language: {
              type: 'string',
              description: 'Programming language',
              default: 'typescript',
            },
            focus: { type: 'string', description: 'Analysis focus', default: 'all' },
          },
          returns: {
            structure: { type: 'object', description: 'Code structure analysis' },
            metrics: { type: 'object', description: 'Code quality metrics' },
            issues: { type: 'array', description: 'Identified issues' },
          },
          examples: [],
        },
        detect_patterns: {
          description: 'Detect design patterns and anti-patterns using AST',
          parameters: {
            code: { type: 'string', description: 'Source code to analyze' },
            pattern_types: { type: 'array', description: 'Patterns to look for', default: ['all'] },
          },
          returns: {
            patterns: { type: 'array', description: 'Detected patterns' },
            anti_patterns: { type: 'array', description: 'Detected anti-patterns' },
          },
          examples: [],
        },
        suggest_refactoring: {
          description: 'Suggest code refactoring opportunities',
          parameters: {
            code: { type: 'string', description: 'Source code to analyze' },
            refactoring_type: { type: 'string', description: 'Refactoring focus', default: 'all' },
          },
          returns: {
            suggestions: { type: 'array', description: 'Refactoring suggestions' },
            priority: { type: 'string', description: 'Priority level' },
          },
          examples: [],
        },
        analyze_complexity: {
          description: 'Analyze code complexity metrics using AST',
          parameters: {
            code: { type: 'string', description: 'Source code to analyze' },
            complexity_types: {
              type: 'array',
              description: 'Complexity types',
              default: ['cyclomatic', 'cognitive'],
            },
          },
          returns: {
            complexity_metrics: { type: 'object', description: 'Complexity measurements' },
            complexity_hotspots: { type: 'array', description: 'High complexity areas' },
          },
          examples: [],
        },
        security_scan: {
          description: 'Scan code for security vulnerabilities',
          parameters: {
            code: { type: 'string', description: 'Source code to scan' },
            scan_depth: { type: 'string', description: 'Scan depth', default: 'standard' },
          },
          returns: {
            vulnerabilities: { type: 'array', description: 'Security issues' },
            security_score: { type: 'number', description: 'Security score' },
          },
          examples: [],
        },
      },
    };
  }

  // ============ AST Parsing Core ============

  private parseCode(code: string): ts.SourceFile {
    return ts.createSourceFile(
      'analysis.ts',
      code,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX
    );
  }

  private async performCodeAnalysis(input: ToolInput): Promise<any> {
    switch (input.operation) {
      case 'analyze_code':
        return this.analyzeCode(
          input.parameters.code,
          input.parameters.language,
          input.parameters.focus
        );
      case 'detect_patterns':
        return this.detectPatterns(input.parameters.code, input.parameters.pattern_types);
      case 'suggest_refactoring':
        return this.suggestRefactoring(input.parameters.code, input.parameters.refactoring_type);
      case 'analyze_complexity':
        return this.analyzeComplexity(input.parameters.code, input.parameters.complexity_types);
      case 'security_scan':
        return this.securityScan(input.parameters.code, input.parameters.scan_depth);
      default:
        throw new Error(`Unsupported operation: ${input.operation}`);
    }
  }

  // ============ Code Analysis ============

  private analyzeCode(code: string, _language: string = 'typescript', focus: string = 'all'): any {
    const analysisSteps: string[] = [];
    analysisSteps.push(`Starting AST-based code analysis`);

    const sourceFile = this.parseCode(code);
    analysisSteps.push(
      `Parsed source file with ${sourceFile.statements.length} top-level statements`
    );

    const functions = this.extractFunctions(sourceFile);
    const classes = this.extractClasses(sourceFile);
    const imports = this.extractImports(sourceFile);

    analysisSteps.push(
      `Found ${functions.length} functions, ${classes.length} classes, ${imports.length} imports`
    );

    const metrics = this.calculateMetrics(sourceFile, functions, classes);
    analysisSteps.push(
      `Calculated metrics: ${metrics.lines_of_code} LOC, complexity ${metrics.total_complexity}`
    );

    const issues = this.detectIssues(sourceFile, functions, classes, focus);
    analysisSteps.push(`Detected ${issues.length} potential issues`);

    return {
      language: 'typescript',
      structure: {
        functions: functions.map(f => ({
          name: f.name,
          line: f.line,
          lineCount: f.lineCount,
          paramCount: f.paramCount,
          complexity: f.complexity,
          isAsync: f.isAsync,
          isExported: f.isExported,
        })),
        classes: classes.map(c => ({
          name: c.name,
          line: c.line,
          methodCount: c.methodCount,
          propertyCount: c.propertyCount,
          isExported: c.isExported,
          extends: c.extendsClass,
          implements: c.implementsInterfaces,
        })),
        imports,
        total_lines: sourceFile.getLineAndCharacterOfPosition(sourceFile.end).line + 1,
        file_structure: {
          has_classes: classes.length > 0,
          has_interfaces: this.hasInterfaces(sourceFile),
          has_async_code: functions.some(f => f.isAsync),
          has_exports: functions.some(f => f.isExported) || classes.some(c => c.isExported),
        },
      },
      metrics,
      issues,
      analysis_steps: analysisSteps,
      confidence: 0.95,
      recommendations: this.generateRecommendations(functions, classes, metrics, issues),
    };
  }

  private extractFunctions(sourceFile: ts.SourceFile): FunctionInfo[] {
    const functions: FunctionInfo[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isFunctionDeclaration(node) && node.name) {
        functions.push(this.analyzeFunctionNode(sourceFile, node, node.name.text));
      } else if (ts.isMethodDeclaration(node) && node.name) {
        const name = ts.isIdentifier(node.name) ? node.name.text : node.name.getText(sourceFile);
        functions.push(this.analyzeFunctionNode(sourceFile, node, name));
      } else if (ts.isArrowFunction(node)) {
        const parent = node.parent;
        if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
          functions.push(this.analyzeFunctionNode(sourceFile, node, parent.name.text));
        }
      } else if (ts.isFunctionExpression(node)) {
        const parent = node.parent;
        if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
          functions.push(this.analyzeFunctionNode(sourceFile, node, parent.name.text));
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return functions;
  }

  private analyzeFunctionNode(
    sourceFile: ts.SourceFile,
    node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction | ts.FunctionExpression,
    name: string
  ): FunctionInfo {
    const startLine = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
    const endLine = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
    const lineCount = endLine - startLine + 1;

    const paramCount = node.parameters?.length || 0;
    const isAsync = node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) || false;

    let isExported = false;
    if (ts.isFunctionDeclaration(node)) {
      isExported = node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) || false;
    }

    const complexity = this.calculateNodeComplexity(node);

    return { name, line: startLine, lineCount, paramCount, complexity, isAsync, isExported };
  }

  private extractClasses(sourceFile: ts.SourceFile): ClassInfo[] {
    const classes: ClassInfo[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isClassDeclaration(node) && node.name) {
        const name = node.name.text;
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;

        let methodCount = 0;
        let propertyCount = 0;
        node.members.forEach(member => {
          if (ts.isMethodDeclaration(member) || ts.isConstructorDeclaration(member)) {
            methodCount++;
          } else if (ts.isPropertyDeclaration(member)) {
            propertyCount++;
          }
        });

        const isExported =
          node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) || false;

        let extendsClass: string | undefined;
        const implementsInterfaces: string[] = [];

        if (node.heritageClauses) {
          node.heritageClauses.forEach(clause => {
            if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
              extendsClass = clause.types[0]?.expression.getText(sourceFile);
            } else if (clause.token === ts.SyntaxKind.ImplementsKeyword) {
              clause.types.forEach(t =>
                implementsInterfaces.push(t.expression.getText(sourceFile))
              );
            }
          });
        }

        classes.push({
          name,
          line,
          methodCount,
          propertyCount,
          isExported,
          extendsClass,
          implementsInterfaces,
        });
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return classes;
  }

  private extractImports(sourceFile: ts.SourceFile): ImportInfo[] {
    const imports: ImportInfo[] = [];

    sourceFile.statements.forEach(stmt => {
      if (
        ts.isImportDeclaration(stmt) &&
        stmt.moduleSpecifier &&
        ts.isStringLiteral(stmt.moduleSpecifier)
      ) {
        const module = stmt.moduleSpecifier.text;
        const namedImports: string[] = [];
        let defaultImport: string | undefined;
        const isTypeOnly = stmt.importClause?.isTypeOnly || false;

        if (stmt.importClause) {
          if (stmt.importClause.name) {
            defaultImport = stmt.importClause.name.text;
          }
          if (stmt.importClause.namedBindings) {
            if (ts.isNamedImports(stmt.importClause.namedBindings)) {
              stmt.importClause.namedBindings.elements.forEach(el => {
                namedImports.push(el.name.text);
              });
            }
          }
        }

        imports.push({ module, namedImports, defaultImport, isTypeOnly });
      }
    });

    return imports;
  }

  private hasInterfaces(sourceFile: ts.SourceFile): boolean {
    let found = false;
    const visit = (node: ts.Node) => {
      if (ts.isInterfaceDeclaration(node)) {
        found = true;
      }
      if (!found) ts.forEachChild(node, visit);
    };
    visit(sourceFile);
    return found;
  }

  // ============ Complexity Calculation ============

  private calculateNodeComplexity(node: ts.Node): number {
    let complexity = 1; // Base complexity

    const visit = (n: ts.Node) => {
      switch (n.kind) {
        case ts.SyntaxKind.IfStatement:
        case ts.SyntaxKind.ConditionalExpression: // ternary
        case ts.SyntaxKind.ForStatement:
        case ts.SyntaxKind.ForInStatement:
        case ts.SyntaxKind.ForOfStatement:
        case ts.SyntaxKind.WhileStatement:
        case ts.SyntaxKind.DoStatement:
        case ts.SyntaxKind.CatchClause:
        case ts.SyntaxKind.CaseClause:
          complexity++;
          break;
        case ts.SyntaxKind.BinaryExpression: {
          const binary = n as ts.BinaryExpression;
          if (
            binary.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
            binary.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
            binary.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
          ) {
            complexity++;
          }
          break;
        }
      }
      ts.forEachChild(n, visit);
    };

    visit(node);
    return complexity;
  }

  private calculateMetrics(
    sourceFile: ts.SourceFile,
    functions: FunctionInfo[],
    classes: ClassInfo[]
  ): any {
    const lines = sourceFile.text.split('\n');
    const codeLines = lines.filter(line => {
      const trimmed = line.trim();
      return (
        trimmed &&
        !trimmed.startsWith('//') &&
        !trimmed.startsWith('/*') &&
        !trimmed.startsWith('*')
      );
    }).length;
    const commentLines = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*');
    }).length;

    const totalComplexity = functions.reduce((sum, f) => sum + f.complexity, 0);
    const avgComplexity = functions.length > 0 ? totalComplexity / functions.length : 0;

    return {
      lines_of_code: codeLines,
      total_lines: lines.length,
      comment_lines: commentLines,
      comment_ratio: codeLines > 0 ? commentLines / codeLines : 0,
      function_count: functions.length,
      class_count: classes.length,
      total_complexity: totalComplexity,
      average_complexity: Math.round(avgComplexity * 100) / 100,
      max_complexity: functions.length > 0 ? Math.max(...functions.map(f => f.complexity)) : 0,
      maintainability_index: this.calculateMaintainabilityIndex(
        codeLines,
        totalComplexity,
        commentLines
      ),
    };
  }

  private calculateMaintainabilityIndex(
    loc: number,
    complexity: number,
    _comments: number
  ): number {
    // Microsoft's maintainability index formula (simplified)
    // Note: comments factor would adjust the score but we use a simplified formula
    const HV = loc * Math.log2(loc + 1); // Halstead Volume approximation
    const CC = complexity;

    const MI = Math.max(
      0,
      ((171 - 5.2 * Math.log(HV + 1) - 0.23 * CC - 16.2 * Math.log(loc + 1)) * 100) / 171
    );
    return Math.round(MI);
  }

  // ============ Issue Detection ============

  private detectIssues(
    sourceFile: ts.SourceFile,
    functions: FunctionInfo[],
    classes: ClassInfo[],
    _focus: string
  ): any[] {
    const issues: any[] = [];

    // Long functions
    functions
      .filter(f => f.lineCount > 50)
      .forEach(f => {
        issues.push({
          type: 'long_function',
          severity: f.lineCount > 100 ? 'high' : 'medium',
          location: `Line ${f.line}`,
          description: `Function '${f.name}' is ${f.lineCount} lines (recommended: < 50)`,
          suggestion: 'Break this function into smaller, focused functions',
        });
      });

    // High complexity functions
    functions
      .filter(f => f.complexity > 10)
      .forEach(f => {
        issues.push({
          type: 'high_complexity',
          severity: f.complexity > 20 ? 'high' : 'medium',
          location: `Line ${f.line}`,
          description: `Function '${f.name}' has complexity ${f.complexity} (recommended: < 10)`,
          suggestion: 'Reduce complexity by extracting logic or simplifying conditions',
        });
      });

    // Too many parameters
    functions
      .filter(f => f.paramCount > 4)
      .forEach(f => {
        issues.push({
          type: 'too_many_parameters',
          severity: 'medium',
          location: `Line ${f.line}`,
          description: `Function '${f.name}' has ${f.paramCount} parameters (recommended: < 5)`,
          suggestion: 'Consider using an options object pattern',
        });
      });

    // God classes
    classes
      .filter(c => c.methodCount > 20)
      .forEach(c => {
        issues.push({
          type: 'god_class',
          severity: 'high',
          location: `Line ${c.line}`,
          description: `Class '${c.name}' has ${c.methodCount} methods (recommended: < 20)`,
          suggestion: 'Consider splitting into multiple focused classes',
        });
      });

    // Deep nesting detection
    this.detectDeepNesting(sourceFile, issues);

    return issues;
  }

  private detectDeepNesting(sourceFile: ts.SourceFile, issues: any[]): void {
    const visit = (node: ts.Node, depth: number) => {
      const isNestingNode =
        ts.isIfStatement(node) ||
        ts.isForStatement(node) ||
        ts.isForInStatement(node) ||
        ts.isForOfStatement(node) ||
        ts.isWhileStatement(node) ||
        ts.isDoStatement(node) ||
        ts.isTryStatement(node);

      const newDepth = isNestingNode ? depth + 1 : depth;

      if (newDepth > 4) {
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
        issues.push({
          type: 'deep_nesting',
          severity: newDepth > 6 ? 'high' : 'medium',
          location: `Line ${line}`,
          description: `Nesting depth of ${newDepth} detected (recommended: < 4)`,
          suggestion: 'Extract nested logic into separate functions or use early returns',
        });
      }

      ts.forEachChild(node, child => visit(child, newDepth));
    };

    visit(sourceFile, 0);
  }

  // ============ Pattern Detection ============

  private detectPatterns(code: string, patternTypes: string[] = ['all']): any {
    const analysisSteps: string[] = [];
    analysisSteps.push(`Detecting patterns using AST analysis`);

    const sourceFile = this.parseCode(code);
    const patterns: any[] = [];
    const antiPatterns: any[] = [];

    const shouldCheck = (type: string) =>
      patternTypes.includes('all') || patternTypes.includes(type);

    // Singleton pattern
    if (shouldCheck('singleton')) {
      const singletons = this.detectSingletonPattern(sourceFile);
      patterns.push(...singletons);
      analysisSteps.push(`Singleton patterns: ${singletons.length}`);
    }

    // Observer pattern
    if (shouldCheck('observer')) {
      const observers = this.detectObserverPattern(sourceFile);
      patterns.push(...observers);
      analysisSteps.push(`Observer patterns: ${observers.length}`);
    }

    // Factory pattern
    if (shouldCheck('factory')) {
      const factories = this.detectFactoryPattern(sourceFile);
      patterns.push(...factories);
      analysisSteps.push(`Factory patterns: ${factories.length}`);
    }

    // Decorator pattern
    if (shouldCheck('decorator')) {
      const decorators = this.detectDecoratorPattern(sourceFile);
      patterns.push(...decorators);
      analysisSteps.push(`Decorator patterns: ${decorators.length}`);
    }

    // Anti-patterns
    const godObjects = this.detectGodObjectAntiPattern(sourceFile);
    antiPatterns.push(...godObjects);

    const callbacks = this.detectCallbackHell(sourceFile);
    antiPatterns.push(...callbacks);

    analysisSteps.push(`Total patterns: ${patterns.length}, anti-patterns: ${antiPatterns.length}`);

    return {
      patterns,
      anti_patterns: antiPatterns,
      analysis_steps: analysisSteps,
      confidence: 0.88,
      pattern_summary: {
        total_patterns: patterns.length,
        total_anti_patterns: antiPatterns.length,
        pattern_diversity: new Set(patterns.map(p => p.type)).size,
      },
    };
  }

  private detectSingletonPattern(sourceFile: ts.SourceFile): any[] {
    const singletons: any[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isClassDeclaration(node) && node.name) {
        let hasPrivateConstructor = false;
        let hasStaticInstance = false;
        let hasGetInstance = false;

        node.members.forEach(member => {
          if (ts.isConstructorDeclaration(member)) {
            hasPrivateConstructor =
              member.modifiers?.some(m => m.kind === ts.SyntaxKind.PrivateKeyword) || false;
          }
          if (ts.isPropertyDeclaration(member)) {
            const isStatic = member.modifiers?.some(m => m.kind === ts.SyntaxKind.StaticKeyword);
            const name = member.name.getText(sourceFile).toLowerCase();
            if (isStatic && name.includes('instance')) {
              hasStaticInstance = true;
            }
          }
          if (ts.isMethodDeclaration(member)) {
            const isStatic = member.modifiers?.some(m => m.kind === ts.SyntaxKind.StaticKeyword);
            const name = member.name.getText(sourceFile).toLowerCase();
            if (isStatic && (name.includes('getinstance') || name.includes('instance'))) {
              hasGetInstance = true;
            }
          }
        });

        if ((hasPrivateConstructor && hasStaticInstance) || (hasStaticInstance && hasGetInstance)) {
          singletons.push({
            type: 'singleton',
            confidence: 0.9,
            location: `Class '${node.name.text}'`,
            description: 'Singleton pattern detected with static instance and getInstance method',
          });
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return singletons;
  }

  private detectObserverPattern(sourceFile: ts.SourceFile): any[] {
    const observers: any[] = [];
    let hasSubscribe = false;
    let hasUnsubscribe = false;
    let hasNotify = false;
    let hasObservers = false;

    const visit = (node: ts.Node) => {
      if (ts.isMethodDeclaration(node) || ts.isPropertyDeclaration(node)) {
        const name = node.name?.getText(sourceFile).toLowerCase() || '';
        if (
          name.includes('subscribe') ||
          name.includes('addeventlistener') ||
          name.includes('on')
        ) {
          hasSubscribe = true;
        }
        if (
          name.includes('unsubscribe') ||
          name.includes('removeeventlistener') ||
          name.includes('off')
        ) {
          hasUnsubscribe = true;
        }
        if (name.includes('notify') || name.includes('emit') || name.includes('dispatch')) {
          hasNotify = true;
        }
        if (
          name.includes('observers') ||
          name.includes('listeners') ||
          name.includes('subscribers')
        ) {
          hasObservers = true;
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    if ((hasSubscribe && hasNotify) || (hasObservers && (hasSubscribe || hasNotify))) {
      observers.push({
        type: 'observer',
        confidence: 0.85,
        description: 'Observer/Event pattern detected',
        indicators: { hasSubscribe, hasUnsubscribe, hasNotify, hasObservers },
      });
    }

    return observers;
  }

  private detectFactoryPattern(sourceFile: ts.SourceFile): any[] {
    const factories: any[] = [];

    const visit = (node: ts.Node) => {
      if ((ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) && node.name) {
        const name = node.name.getText(sourceFile).toLowerCase();
        if (name.startsWith('create') || name.startsWith('make') || name.startsWith('build')) {
          // Check if it returns an object/instance
          const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
          factories.push({
            type: 'factory',
            confidence: 0.75,
            location: `Line ${line}`,
            description: `Factory method '${node.name.getText(sourceFile)}' detected`,
          });
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return factories;
  }

  private detectDecoratorPattern(sourceFile: ts.SourceFile): any[] {
    const decorators: any[] = [];

    const visit = (node: ts.Node) => {
      // TypeScript decorators
      if (ts.canHaveDecorators(node)) {
        const nodeDecorators = ts.getDecorators(node);
        if (nodeDecorators && nodeDecorators.length > 0) {
          const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
          decorators.push({
            type: 'decorator',
            confidence: 0.95,
            location: `Line ${line}`,
            description: `TypeScript decorator(s) used`,
            decoratorCount: nodeDecorators.length,
          });
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return decorators;
  }

  private detectGodObjectAntiPattern(sourceFile: ts.SourceFile): any[] {
    const antiPatterns: any[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isClassDeclaration(node) && node.name) {
        const methodCount = node.members.filter(
          m => ts.isMethodDeclaration(m) || ts.isConstructorDeclaration(m)
        ).length;
        const propertyCount = node.members.filter(m => ts.isPropertyDeclaration(m)).length;

        if (methodCount > 20 || propertyCount > 15) {
          antiPatterns.push({
            type: 'god_object',
            severity: 'high',
            location: `Class '${node.name.text}'`,
            description: `Class has ${methodCount} methods and ${propertyCount} properties`,
            suggestion: 'Consider applying Single Responsibility Principle',
          });
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return antiPatterns;
  }

  private detectCallbackHell(sourceFile: ts.SourceFile): any[] {
    const antiPatterns: any[] = [];

    const countNestedCallbacks = (node: ts.Node, depth: number): number => {
      let maxDepth = depth;

      if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
        const parent = node.parent;
        if (ts.isCallExpression(parent)) {
          ts.forEachChild(node, child => {
            maxDepth = Math.max(maxDepth, countNestedCallbacks(child, depth + 1));
          });
        }
      }

      ts.forEachChild(node, child => {
        maxDepth = Math.max(maxDepth, countNestedCallbacks(child, depth));
      });

      return maxDepth;
    };

    const maxNesting = countNestedCallbacks(sourceFile, 0);

    if (maxNesting >= 3) {
      antiPatterns.push({
        type: 'callback_hell',
        severity: maxNesting >= 5 ? 'high' : 'medium',
        description: `Nested callbacks detected (depth: ${maxNesting})`,
        suggestion: 'Consider using async/await or Promise chains',
      });
    }

    return antiPatterns;
  }

  // ============ Refactoring Suggestions ============

  private suggestRefactoring(code: string, refactoringType: string = 'all'): any {
    const analysisSteps: string[] = [];
    analysisSteps.push(`Analyzing code for refactoring opportunities`);

    const sourceFile = this.parseCode(code);
    const functions = this.extractFunctions(sourceFile);
    const classes = this.extractClasses(sourceFile);
    const suggestions: any[] = [];

    const shouldCheck = (type: string) => refactoringType === 'all' || refactoringType === type;

    // Extract method opportunities
    if (shouldCheck('extract_method')) {
      functions
        .filter(f => f.lineCount > 30 || f.complexity > 8)
        .forEach(f => {
          suggestions.push({
            type: 'extract_method',
            priority: f.complexity > 15 ? 'high' : 'medium',
            target: f.name,
            location: `Line ${f.line}`,
            reason: `Function is ${f.lineCount} lines with complexity ${f.complexity}`,
            benefit: 'Improved readability and testability',
          });
        });
    }

    // Parameter object opportunities
    if (shouldCheck('introduce_parameter_object')) {
      functions
        .filter(f => f.paramCount > 3)
        .forEach(f => {
          suggestions.push({
            type: 'introduce_parameter_object',
            priority: 'medium',
            target: f.name,
            location: `Line ${f.line}`,
            reason: `Function has ${f.paramCount} parameters`,
            benefit: 'Cleaner function signatures and easier to extend',
          });
        });
    }

    // Class decomposition
    if (shouldCheck('decompose_class')) {
      classes
        .filter(c => c.methodCount > 15)
        .forEach(c => {
          suggestions.push({
            type: 'decompose_class',
            priority: 'high',
            target: c.name,
            location: `Line ${c.line}`,
            reason: `Class has ${c.methodCount} methods`,
            benefit: 'Better separation of concerns',
          });
        });
    }

    const priority = this.determinePriority(suggestions);
    analysisSteps.push(
      `Generated ${suggestions.length} refactoring suggestions with ${priority} priority`
    );

    return {
      suggestions,
      priority,
      analysis_steps: analysisSteps,
      confidence: 0.85,
      refactoring_impact: {
        maintainability_improvement: suggestions.length * 0.08,
        readability_improvement: suggestions.length * 0.1,
        estimated_effort_hours: suggestions.reduce(
          (sum, s) => sum + (s.priority === 'high' ? 4 : 2),
          0
        ),
      },
    };
  }

  // ============ Complexity Analysis ============

  private analyzeComplexity(
    code: string,
    complexityTypes: string[] = ['cyclomatic', 'cognitive']
  ): any {
    const analysisSteps: string[] = [];
    analysisSteps.push(`Analyzing code complexity using AST`);

    const sourceFile = this.parseCode(code);
    const functions = this.extractFunctions(sourceFile);

    const complexityMetrics: any = {};
    const complexityHotspots: any[] = [];

    if (complexityTypes.includes('cyclomatic')) {
      const perFunction = functions.map(f => ({
        name: f.name,
        line: f.line,
        complexity: f.complexity,
      }));

      complexityMetrics.cyclomatic = {
        overall: functions.reduce((sum, f) => sum + f.complexity, 0),
        average:
          functions.length > 0
            ? functions.reduce((sum, f) => sum + f.complexity, 0) / functions.length
            : 0,
        max: functions.length > 0 ? Math.max(...functions.map(f => f.complexity)) : 0,
        per_function: perFunction,
      };

      analysisSteps.push(`Cyclomatic complexity: overall=${complexityMetrics.cyclomatic.overall}`);
    }

    if (complexityTypes.includes('cognitive')) {
      // Cognitive complexity adds penalties for nesting
      const cognitivePerFunction = functions.map(f => ({
        name: f.name,
        line: f.line,
        cognitive: f.complexity * 1.2, // Simplified cognitive adjustment
      }));

      complexityMetrics.cognitive = {
        overall: cognitivePerFunction.reduce((sum, f) => sum + f.cognitive, 0),
        per_function: cognitivePerFunction,
      };

      analysisSteps.push(
        `Cognitive complexity: overall=${Math.round(complexityMetrics.cognitive.overall)}`
      );
    }

    // Identify hotspots
    functions
      .filter(f => f.complexity > 10)
      .forEach(f => {
        complexityHotspots.push({
          type: 'function',
          name: f.name,
          line: f.line,
          complexity: f.complexity,
          severity: f.complexity > 20 ? 'critical' : 'warning',
          recommendation: 'Consider breaking down this function',
        });
      });

    return {
      complexity_metrics: complexityMetrics,
      complexity_hotspots: complexityHotspots,
      analysis_steps: analysisSteps,
      confidence: 0.92,
      complexity_summary: {
        overall_score: this.calculateOverallComplexityScore(complexityMetrics),
        recommendations: this.generateComplexityRecommendations(
          complexityMetrics,
          complexityHotspots
        ),
      },
    };
  }

  // ============ Security Scanning ============

  private securityScan(code: string, scanDepth: string = 'standard'): any {
    const analysisSteps: string[] = [];
    analysisSteps.push(`Starting security scan (depth: ${scanDepth})`);

    const sourceFile = this.parseCode(code);
    const vulnerabilities: any[] = [];

    // SQL injection patterns
    this.detectSQLInjection(sourceFile, vulnerabilities);
    analysisSteps.push(
      `SQL injection checks: ${vulnerabilities.filter(v => v.type === 'sql_injection').length} found`
    );

    // XSS patterns
    this.detectXSS(sourceFile, vulnerabilities);
    analysisSteps.push(`XSS checks: ${vulnerabilities.filter(v => v.type === 'xss').length} found`);

    // Hardcoded secrets
    this.detectHardcodedSecrets(sourceFile, vulnerabilities);
    analysisSteps.push(
      `Secret detection: ${vulnerabilities.filter(v => v.type === 'hardcoded_secret').length} found`
    );

    // Eval usage
    this.detectEvalUsage(sourceFile, vulnerabilities);

    // Unsafe regex
    this.detectUnsafeRegex(sourceFile, vulnerabilities);

    const securityScore = this.calculateSecurityScore(vulnerabilities);
    analysisSteps.push(`Security score: ${securityScore}/100`);

    return {
      vulnerabilities,
      security_score: securityScore,
      analysis_steps: analysisSteps,
      confidence: 0.82,
      security_summary: {
        total_vulnerabilities: vulnerabilities.length,
        critical: vulnerabilities.filter(v => v.severity === 'critical').length,
        high: vulnerabilities.filter(v => v.severity === 'high').length,
        medium: vulnerabilities.filter(v => v.severity === 'medium').length,
        recommendations: this.generateSecurityRecommendations(vulnerabilities),
      },
    };
  }

  private detectSQLInjection(sourceFile: ts.SourceFile, vulnerabilities: any[]): void {
    const visit = (node: ts.Node) => {
      if (ts.isTemplateExpression(node) || ts.isBinaryExpression(node)) {
        const text = node.getText(sourceFile).toLowerCase();
        if (
          (text.includes('select') ||
            text.includes('insert') ||
            text.includes('update') ||
            text.includes('delete')) &&
          (text.includes('${') || text.includes(' + '))
        ) {
          const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
          vulnerabilities.push({
            type: 'sql_injection',
            severity: 'critical',
            location: `Line ${line}`,
            description: 'Potential SQL injection - string interpolation in SQL query',
            recommendation: 'Use parameterized queries or prepared statements',
          });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }

  private detectXSS(sourceFile: ts.SourceFile, vulnerabilities: any[]): void {
    const visit = (node: ts.Node) => {
      if (ts.isPropertyAccessExpression(node)) {
        const text = node.getText(sourceFile);
        if (text.includes('innerHTML') || text.includes('outerHTML')) {
          const parent = node.parent;
          if (
            ts.isBinaryExpression(parent) &&
            parent.operatorToken.kind === ts.SyntaxKind.EqualsToken
          ) {
            const line =
              sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
            vulnerabilities.push({
              type: 'xss',
              severity: 'high',
              location: `Line ${line}`,
              description: 'Potential XSS - innerHTML assignment detected',
              recommendation: 'Use textContent or sanitize HTML input',
            });
          }
        }
      }
      if (ts.isCallExpression(node)) {
        const text = node.expression.getText(sourceFile);
        if (text.includes('document.write') || text.includes('eval')) {
          const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
          vulnerabilities.push({
            type: 'xss',
            severity: 'high',
            location: `Line ${line}`,
            description: `Dangerous function call: ${text}`,
            recommendation: 'Avoid document.write and eval with user input',
          });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }

  private detectHardcodedSecrets(sourceFile: ts.SourceFile, vulnerabilities: any[]): void {
    const secretPatterns = [
      'password',
      'secret',
      'apikey',
      'api_key',
      'token',
      'private_key',
      'auth',
    ];

    const visit = (node: ts.Node) => {
      if (
        ts.isVariableDeclaration(node) &&
        node.initializer &&
        ts.isStringLiteral(node.initializer)
      ) {
        const varName = node.name.getText(sourceFile).toLowerCase();
        const value = node.initializer.text;

        if (secretPatterns.some(p => varName.includes(p)) && value.length > 5) {
          const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
          vulnerabilities.push({
            type: 'hardcoded_secret',
            severity: 'medium',
            location: `Line ${line}`,
            description: `Potential hardcoded secret in variable '${node.name.getText(sourceFile)}'`,
            recommendation: 'Use environment variables or secure secret management',
          });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }

  private detectEvalUsage(sourceFile: ts.SourceFile, vulnerabilities: any[]): void {
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        if (node.expression.text === 'eval' || node.expression.text === 'Function') {
          const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
          vulnerabilities.push({
            type: 'code_injection',
            severity: 'critical',
            location: `Line ${line}`,
            description: `Dangerous function '${node.expression.text}' usage`,
            recommendation: 'Avoid eval/Function with dynamic input',
          });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }

  private detectUnsafeRegex(sourceFile: ts.SourceFile, vulnerabilities: any[]): void {
    const visit = (node: ts.Node) => {
      if (ts.isRegularExpressionLiteral(node)) {
        const regex = node.text;
        // Check for ReDoS patterns (nested quantifiers, overlapping groups)
        if (/(\+|\*|\{[^}]+\})\s*(\+|\*|\{[^}]+\})/.test(regex) || /(\([^)]*\)\+)+/.test(regex)) {
          const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
          vulnerabilities.push({
            type: 'redos',
            severity: 'medium',
            location: `Line ${line}`,
            description: 'Potentially vulnerable regex pattern (ReDoS)',
            recommendation: 'Review regex for catastrophic backtracking',
          });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }

  // ============ Helper Methods ============

  private calculateSecurityScore(vulnerabilities: any[]): number {
    let score = 100;
    vulnerabilities.forEach(v => {
      switch (v.severity) {
        case 'critical':
          score -= 25;
          break;
        case 'high':
          score -= 15;
          break;
        case 'medium':
          score -= 8;
          break;
        case 'low':
          score -= 3;
          break;
      }
    });
    return Math.max(0, score);
  }

  private calculateOverallComplexityScore(metrics: any): number {
    const cyclomatic = metrics.cyclomatic?.average || 0;
    const cognitive = metrics.cognitive?.overall || 0;

    // Score from 0-100 where lower complexity = higher score
    const rawScore = cyclomatic * 5 + cognitive * 0.5;
    return Math.max(0, Math.min(100, 100 - rawScore));
  }

  private determinePriority(suggestions: any[]): string {
    const highCount = suggestions.filter(s => s.priority === 'high').length;
    if (highCount >= 3) return 'high';
    if (suggestions.length > 5) return 'medium';
    return 'low';
  }

  private generateRecommendations(
    functions: FunctionInfo[],
    _classes: ClassInfo[],
    metrics: any,
    issues: any[]
  ): string[] {
    const recommendations: string[] = [];

    if (metrics.comment_ratio < 0.1) {
      recommendations.push('Add more documentation comments to improve maintainability');
    }

    if (metrics.average_complexity > 8) {
      recommendations.push('Reduce function complexity through extraction and simplification');
    }

    if (issues.some(i => i.type === 'god_class')) {
      recommendations.push('Apply Single Responsibility Principle to large classes');
    }

    if (functions.some(f => f.paramCount > 4)) {
      recommendations.push('Consider using options objects for functions with many parameters');
    }

    if (metrics.maintainability_index < 50) {
      recommendations.push('Overall maintainability is low - prioritize refactoring');
    }

    return recommendations;
  }

  private generateComplexityRecommendations(metrics: any, hotspots: any[]): string[] {
    const recommendations: string[] = [];

    if (hotspots.length > 0) {
      recommendations.push(`Focus on ${hotspots.length} complexity hotspots first`);
    }

    if (metrics.cyclomatic?.max > 15) {
      recommendations.push('Break down functions with complexity > 15');
    }

    if (metrics.cyclomatic?.average > 5) {
      recommendations.push('Aim to reduce average function complexity below 5');
    }

    return recommendations;
  }

  private generateSecurityRecommendations(vulnerabilities: any[]): string[] {
    const recommendations: string[] = [];
    const types = new Set(vulnerabilities.map(v => v.type));

    if (types.has('sql_injection')) {
      recommendations.push('Use parameterized queries for all database operations');
    }

    if (types.has('xss')) {
      recommendations.push('Sanitize all user input before rendering to DOM');
    }

    if (types.has('hardcoded_secret')) {
      recommendations.push('Move all secrets to environment variables');
    }

    if (types.has('code_injection')) {
      recommendations.push('Eliminate eval() and Function() with dynamic input');
    }

    if (vulnerabilities.length === 0) {
      recommendations.push(
        'No obvious vulnerabilities detected - continue security best practices'
      );
    }

    return recommendations;
  }

  private getSupportedOperations(): string[] {
    return [
      'analyze_code',
      'detect_patterns',
      'suggest_refactoring',
      'analyze_complexity',
      'security_scan',
    ];
  }
}
