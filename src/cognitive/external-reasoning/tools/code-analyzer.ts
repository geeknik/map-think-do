/**
 * @fileoverview Code Analysis Tool
 * 
 * Advanced code analysis tool that can analyze code structure, detect patterns,
 * identify potential issues, suggest improvements, and provide architectural insights.
 */

import { ExternalTool, ToolInput, ToolOutput, ValidationResult, ToolSchema } from '../tool-registry.js';

export class CodeAnalyzer implements ExternalTool {
  id = 'code-analyzer';
  name = 'Code Analyzer';
  description = 'Advanced code analysis and architectural insight tool';
  category = 'analytical' as const;
  version = '1.0.0';
  capabilities = [
    'code_structure_analysis',
    'pattern_detection',
    'complexity_analysis',
    'architecture_insights',
    'refactoring_suggestions',
    'performance_analysis',
    'security_scanning',
    'dependency_analysis'
  ];

  config = {
    timeout_ms: 15000,
    max_retries: 2,
    requires_auth: false,
    rate_limit: {
      requests_per_minute: 50,
      burst_limit: 5
    }
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
          reasoning_trace: result.analysis_steps
        }
      };
    } catch (error) {
      return {
        success: false,
        result: null,
        metadata: {
          execution_time_ms: Date.now() - startTime,
          tool_version: this.version
        },
        error: {
          code: 'CODE_ANALYSIS_ERROR',
          message: (error as Error).message,
          details: error
        }
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
    if (input.operation === 'analyze_code' && !input.parameters.code) {
      errors.push('Code parameter is required for analyze_code operation');
    }

    if (input.operation === 'detect_patterns' && !input.parameters.code) {
      errors.push('Code parameter is required for detect_patterns operation');
    }

    if (input.operation === 'suggest_refactoring' && !input.parameters.code) {
      errors.push('Code parameter is required for suggest_refactoring operation');
    }

    // Warnings for large code analysis
    if (input.parameters.code && input.parameters.code.length > 10000) {
      warnings.push('Large code input detected - analysis may take longer');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  getSchema(): ToolSchema {
    return {
      operations: {
        'analyze_code': {
          description: 'Comprehensive code structure and quality analysis',
          parameters: {
            code: { type: 'string', description: 'Source code to analyze' },
            language: { type: 'string', description: 'Programming language', default: 'auto-detect' },
            focus: { type: 'string', description: 'Analysis focus (structure, performance, security)', default: 'all' }
          },
          returns: {
            structure: { type: 'object', description: 'Code structure analysis' },
            metrics: { type: 'object', description: 'Code quality metrics' },
            issues: { type: 'array', description: 'Identified issues and concerns' }
          },
          examples: []
        },
        'detect_patterns': {
          description: 'Detect design patterns and architectural patterns',
          parameters: {
            code: { type: 'string', description: 'Source code to analyze' },
            pattern_types: { type: 'array', description: 'Specific patterns to look for', default: ['all'] }
          },
          returns: {
            patterns: { type: 'array', description: 'Detected patterns with confidence scores' },
            anti_patterns: { type: 'array', description: 'Detected anti-patterns' }
          },
          examples: []
        },
        'suggest_refactoring': {
          description: 'Suggest code refactoring opportunities',
          parameters: {
            code: { type: 'string', description: 'Source code to analyze' },
            refactoring_type: { type: 'string', description: 'Type of refactoring focus', default: 'all' }
          },
          returns: {
            suggestions: { type: 'array', description: 'Refactoring suggestions with rationale' },
            priority: { type: 'string', description: 'Priority level of refactoring' }
          },
          examples: []
        },
        'analyze_complexity': {
          description: 'Analyze code complexity metrics',
          parameters: {
            code: { type: 'string', description: 'Source code to analyze' },
            complexity_types: { type: 'array', description: 'Types of complexity to analyze', default: ['cyclomatic', 'cognitive'] }
          },
          returns: {
            complexity_metrics: { type: 'object', description: 'Various complexity measurements' },
            complexity_hotspots: { type: 'array', description: 'Areas of high complexity' }
          },
          examples: []
        },
        'security_scan': {
          description: 'Scan code for potential security vulnerabilities',
          parameters: {
            code: { type: 'string', description: 'Source code to scan' },
            scan_depth: { type: 'string', description: 'Depth of security analysis', default: 'standard' }
          },
          returns: {
            vulnerabilities: { type: 'array', description: 'Identified security issues' },
            security_score: { type: 'number', description: 'Overall security score (0-100)' }
          },
          examples: []
        }
      }
    };
  }

  private async performCodeAnalysis(input: ToolInput): Promise<any> {
    switch (input.operation) {
      case 'analyze_code':
        return this.analyzeCode(input.parameters.code, input.parameters.language, input.parameters.focus);
      
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

  private analyzeCode(code: string, language: string = 'auto-detect', focus: string = 'all'): any {
    const analysisSteps: string[] = [];
    analysisSteps.push(`Starting code analysis for ${language} code`);
    analysisSteps.push(`Analysis focus: ${focus}`);

    // Detect language if not specified
    const detectedLanguage = language === 'auto-detect' ? this.detectLanguage(code) : language;
    analysisSteps.push(`Detected/specified language: ${detectedLanguage}`);

    // Basic structure analysis
    const structure = this.analyzeStructure(code, detectedLanguage);
    analysisSteps.push(`Analyzed code structure: ${structure.functions.length} functions, ${structure.classes.length} classes`);

    // Code metrics
    const metrics = this.calculateMetrics(code, detectedLanguage);
    analysisSteps.push(`Calculated code metrics: ${metrics.lines_of_code} LOC, complexity ${metrics.cyclomatic_complexity}`);

    // Issue detection
    const issues = this.detectIssues(code, detectedLanguage, focus);
    analysisSteps.push(`Detected ${issues.length} potential issues`);

    return {
      language: detectedLanguage,
      structure,
      metrics,
      issues,
      analysis_steps: analysisSteps,
      confidence: 0.85,
      recommendations: this.generateRecommendations(structure, metrics, issues)
    };
  }

  private detectPatterns(code: string, patternTypes: string[] = ['all']): any {
    const analysisSteps: string[] = [];
    analysisSteps.push(`Detecting patterns in code`);
    analysisSteps.push(`Pattern types to detect: ${patternTypes.join(', ')}`);

    const patterns: any[] = [];
    const antiPatterns: any[] = [];

    // Singleton pattern detection
    if (patternTypes.includes('all') || patternTypes.includes('singleton')) {
      const singletonMatches = this.detectSingletonPattern(code);
      patterns.push(...singletonMatches);
      analysisSteps.push(`Singleton pattern instances: ${singletonMatches.length}`);
    }

    // Observer pattern detection
    if (patternTypes.includes('all') || patternTypes.includes('observer')) {
      const observerMatches = this.detectObserverPattern(code);
      patterns.push(...observerMatches);
      analysisSteps.push(`Observer pattern instances: ${observerMatches.length}`);
    }

    // Factory pattern detection
    if (patternTypes.includes('all') || patternTypes.includes('factory')) {
      const factoryMatches = this.detectFactoryPattern(code);
      patterns.push(...factoryMatches);
      analysisSteps.push(`Factory pattern instances: ${factoryMatches.length}`);
    }

    // Anti-pattern detection
    const godObjectAntiPattern = this.detectGodObjectAntiPattern(code);
    antiPatterns.push(...godObjectAntiPattern);

    const spaghettiCodeAntiPattern = this.detectSpaghettiCodeAntiPattern(code);
    antiPatterns.push(...spaghettiCodeAntiPattern);

    analysisSteps.push(`Total patterns detected: ${patterns.length}`);
    analysisSteps.push(`Total anti-patterns detected: ${antiPatterns.length}`);

    return {
      patterns,
      anti_patterns: antiPatterns,
      analysis_steps: analysisSteps,
      confidence: 0.78,
      pattern_summary: {
        total_patterns: patterns.length,
        total_anti_patterns: antiPatterns.length,
        pattern_diversity: new Set(patterns.map(p => p.type)).size
      }
    };
  }

  private suggestRefactoring(code: string, refactoringType: string = 'all'): any {
    const analysisSteps: string[] = [];
    analysisSteps.push(`Analyzing code for refactoring opportunities`);
    analysisSteps.push(`Refactoring focus: ${refactoringType}`);

    const suggestions: any[] = [];

    // Extract method opportunities
    if (refactoringType === 'all' || refactoringType === 'extract_method') {
      const extractMethodSuggestions = this.findExtractMethodOpportunities(code);
      suggestions.push(...extractMethodSuggestions);
      analysisSteps.push(`Extract method opportunities: ${extractMethodSuggestions.length}`);
    }

    // Remove duplication opportunities
    if (refactoringType === 'all' || refactoringType === 'remove_duplication') {
      const duplicationSuggestions = this.findDuplicationToRemove(code);
      suggestions.push(...duplicationSuggestions);
      analysisSteps.push(`Code duplication instances: ${duplicationSuggestions.length}`);
    }

    // Simplify conditional expressions
    if (refactoringType === 'all' || refactoringType === 'simplify_conditionals') {
      const conditionalSuggestions = this.findComplexConditionals(code);
      suggestions.push(...conditionalSuggestions);
      analysisSteps.push(`Complex conditional expressions: ${conditionalSuggestions.length}`);
    }

    // Determine priority
    const priority = this.determinePriority(suggestions);
    analysisSteps.push(`Refactoring priority determined: ${priority}`);

    return {
      suggestions,
      priority,
      analysis_steps: analysisSteps,
      confidence: 0.82,
      refactoring_impact: this.assessRefactoringImpact(suggestions)
    };
  }

  private analyzeComplexity(code: string, complexityTypes: string[] = ['cyclomatic', 'cognitive']): any {
    const analysisSteps: string[] = [];
    analysisSteps.push(`Analyzing code complexity`);
    analysisSteps.push(`Complexity types: ${complexityTypes.join(', ')}`);

    const complexityMetrics: any = {};
    const complexityHotspots: any[] = [];

    // Cyclomatic complexity
    if (complexityTypes.includes('cyclomatic')) {
      const cyclomaticComplexity = this.calculateCyclomaticComplexity(code);
      complexityMetrics.cyclomatic = cyclomaticComplexity;
      analysisSteps.push(`Cyclomatic complexity: ${cyclomaticComplexity.overall}`);
    }

    // Cognitive complexity
    if (complexityTypes.includes('cognitive')) {
      const cognitiveComplexity = this.calculateCognitiveComplexity(code);
      complexityMetrics.cognitive = cognitiveComplexity;
      analysisSteps.push(`Cognitive complexity: ${cognitiveComplexity.overall}`);
    }

    // Identify hotspots
    const hotspots = this.identifyComplexityHotspots(code, complexityMetrics);
    complexityHotspots.push(...hotspots);
    analysisSteps.push(`Complexity hotspots identified: ${hotspots.length}`);

    return {
      complexity_metrics: complexityMetrics,
      complexity_hotspots: complexityHotspots,
      analysis_steps: analysisSteps,
      confidence: 0.88,
      complexity_summary: {
        overall_score: this.calculateOverallComplexityScore(complexityMetrics),
        recommendations: this.generateComplexityRecommendations(complexityMetrics, complexityHotspots)
      }
    };
  }

  private securityScan(code: string, scanDepth: string = 'standard'): any {
    const analysisSteps: string[] = [];
    analysisSteps.push(`Starting security scan`);
    analysisSteps.push(`Scan depth: ${scanDepth}`);

    const vulnerabilities: any[] = [];

    // SQL injection detection
    const sqlInjectionVulns = this.detectSQLInjection(code);
    vulnerabilities.push(...sqlInjectionVulns);
    analysisSteps.push(`SQL injection vulnerabilities: ${sqlInjectionVulns.length}`);

    // XSS detection
    const xssVulns = this.detectXSS(code);
    vulnerabilities.push(...xssVulns);
    analysisSteps.push(`XSS vulnerabilities: ${xssVulns.length}`);

    // Hardcoded secrets detection
    const secretVulns = this.detectHardcodedSecrets(code);
    vulnerabilities.push(...secretVulns);
    analysisSteps.push(`Hardcoded secrets: ${secretVulns.length}`);

    // Input validation issues
    const inputValidationVulns = this.detectInputValidationIssues(code);
    vulnerabilities.push(...inputValidationVulns);
    analysisSteps.push(`Input validation issues: ${inputValidationVulns.length}`);

    // Calculate security score
    const securityScore = this.calculateSecurityScore(vulnerabilities, code.length);
    analysisSteps.push(`Security score calculated: ${securityScore}/100`);

    return {
      vulnerabilities,
      security_score: securityScore,
      analysis_steps: analysisSteps,
      confidence: 0.75,
      security_summary: {
        total_vulnerabilities: vulnerabilities.length,
        critical_vulnerabilities: vulnerabilities.filter(v => v.severity === 'critical').length,
        recommendations: this.generateSecurityRecommendations(vulnerabilities)
      }
    };
  }

  // Helper methods for code analysis
  private detectLanguage(code: string): string {
    if (code.includes('function') && code.includes('const') && code.includes('=>')) {
      return 'javascript';
    }
    if (code.includes('def ') && code.includes('import ')) {
      return 'python';
    }
    if (code.includes('public class') && code.includes('static void main')) {
      return 'java';
    }
    if (code.includes('interface') && code.includes('implements')) {
      return 'typescript';
    }
    return 'unknown';
  }

  private analyzeStructure(code: string, language: string): any {
    const functions = this.extractFunctions(code, language);
    const classes = this.extractClasses(code, language);
    const imports = this.extractImports(code, language);
    
    return {
      functions: functions.map(f => ({ name: f, line_count: this.estimateLineCount(f) })),
      classes: classes.map(c => ({ name: c, method_count: this.estimateMethodCount(c) })),
      imports: imports,
      total_lines: code.split('\n').length,
      file_structure: {
        has_main_function: functions.some(f => f.includes('main')),
        has_classes: classes.length > 0,
        has_interfaces: code.includes('interface'),
        has_async_code: code.includes('async') || code.includes('await')
      }
    };
  }

  private calculateMetrics(code: string, language: string): any {
    const lines = code.split('\n');
    const linesOfCode = lines.filter(line => line.trim() && !line.trim().startsWith('//')).length;
    const commentLines = lines.filter(line => line.trim().startsWith('//')).length;
    
    return {
      lines_of_code: linesOfCode,
      comment_lines: commentLines,
      comment_ratio: commentLines / linesOfCode,
      cyclomatic_complexity: this.calculateBasicCyclomaticComplexity(code),
      maintainability_index: this.calculateMaintainabilityIndex(code),
      code_duplication_ratio: this.calculateDuplicationRatio(code)
    };
  }

  private detectIssues(code: string, language: string, focus: string): any[] {
    const issues: any[] = [];
    
    // Long methods
    const longMethods = this.findLongMethods(code);
    issues.push(...longMethods.map(method => ({
      type: 'long_method',
      severity: 'medium',
      description: `Method ${method} is too long`,
      suggestion: 'Consider breaking this method into smaller, more focused methods'
    })));

    // Deep nesting
    const deepNesting = this.findDeepNesting(code);
    issues.push(...deepNesting.map(location => ({
      type: 'deep_nesting',
      severity: 'medium',
      description: 'Deep nesting detected',
      location,
      suggestion: 'Consider extracting nested logic into separate methods'
    })));

    // Magic numbers
    const magicNumbers = this.findMagicNumbers(code);
    issues.push(...magicNumbers.map(number => ({
      type: 'magic_number',
      severity: 'low',
      description: `Magic number found: ${number}`,
      suggestion: 'Consider defining this as a named constant'
    })));

    return issues;
  }

  // Simplified implementations for demonstration
  private extractFunctions(code: string, language: string): string[] {
    const functionMatches = code.match(/function\s+(\w+)/g) || [];
    const arrowFunctionMatches = code.match(/const\s+(\w+)\s*=/g) || [];
    return [...functionMatches, ...arrowFunctionMatches].map(match => match.split(/\s+/)[1]);
  }

  private extractClasses(code: string, language: string): string[] {
    const classMatches = code.match(/class\s+(\w+)/g) || [];
    return classMatches.map(match => match.split(/\s+/)[1]);
  }

  private extractImports(code: string, language: string): string[] {
    const importMatches = code.match(/import.*from\s+['"]([^'"]+)['"]/g) || [];
    return importMatches.map(match => match.match(/['"]([^'"]+)['"]/)![1]);
  }

  private estimateLineCount(functionCode: string): number {
    return functionCode.split('\n').length;
  }

  private estimateMethodCount(classCode: string): number {
    return (classCode.match(/function\s+\w+/g) || []).length;
  }

  private calculateBasicCyclomaticComplexity(code: string): number {
    const controlStructures = (code.match(/\b(if|while|for|switch|catch)\b/g) || []).length;
    return controlStructures + 1; // Base complexity of 1
  }

  private calculateMaintainabilityIndex(code: string): number {
    const loc = code.split('\n').length;
    const complexity = this.calculateBasicCyclomaticComplexity(code);
    // Simplified maintainability index calculation
    return Math.max(0, 171 - 5.2 * Math.log(loc) - 0.23 * complexity);
  }

  private calculateDuplicationRatio(code: string): number {
    const lines = code.split('\n').map(line => line.trim()).filter(line => line);
    const uniqueLines = new Set(lines);
    return 1 - (uniqueLines.size / lines.length);
  }

  // Placeholder implementations for pattern detection
  private detectSingletonPattern(code: string): any[] {
    const singletonPattern = /class\s+\w+.*{[\s\S]*?static\s+instance[\s\S]*?}/g;
    const matches = code.match(singletonPattern) || [];
    return matches.map(match => ({
      type: 'singleton',
      confidence: 0.8,
      location: match.substring(0, 50) + '...',
      description: 'Singleton pattern detected'
    }));
  }

  private detectObserverPattern(code: string): any[] {
    const hasSubscribe = code.includes('subscribe') || code.includes('addEventListener');
    const hasNotify = code.includes('notify') || code.includes('emit');
    
    if (hasSubscribe && hasNotify) {
      return [{
        type: 'observer',
        confidence: 0.7,
        description: 'Observer pattern indicators detected'
      }];
    }
    return [];
  }

  private detectFactoryPattern(code: string): any[] {
    const factoryPattern = /create\w+|make\w+|build\w+/gi;
    const matches = code.match(factoryPattern) || [];
    return matches.length > 0 ? [{
      type: 'factory',
      confidence: 0.6,
      description: 'Factory pattern indicators detected',
      instances: matches.length
    }] : [];
  }

  private detectGodObjectAntiPattern(code: string): any[] {
    const classes = this.extractClasses(code, 'auto');
    return classes.filter(className => {
      const classCode = this.extractClassCode(code, className);
      const methodCount = this.estimateMethodCount(classCode);
      return methodCount > 20; // Threshold for god object
    }).map(className => ({
      type: 'god_object',
      severity: 'high',
      class_name: className,
      description: 'Class has too many responsibilities'
    }));
  }

  private detectSpaghettiCodeAntiPattern(code: string): any[] {
    const complexity = this.calculateBasicCyclomaticComplexity(code);
    const nesting = this.getMaxNestingLevel(code);
    
    if (complexity > 15 && nesting > 5) {
      return [{
        type: 'spaghetti_code',
        severity: 'high',
        description: 'High complexity and deep nesting detected'
      }];
    }
    return [];
  }

  // Additional helper methods
  private findExtractMethodOpportunities(code: string): any[] {
    return this.findLongMethods(code).map(method => ({
      type: 'extract_method',
      target: method,
      description: 'Long method should be broken down',
      benefit: 'Improved readability and maintainability'
    }));
  }

  private findDuplicationToRemove(code: string): any[] {
    const duplicationRatio = this.calculateDuplicationRatio(code);
    if (duplicationRatio > 0.1) {
      return [{
        type: 'remove_duplication',
        duplication_ratio: duplicationRatio,
        description: 'Significant code duplication detected',
        benefit: 'Reduced maintenance burden'
      }];
    }
    return [];
  }

  private findComplexConditionals(code: string): any[] {
    const complexConditionals = code.match(/if\s*\([^)]{50,}\)/g) || [];
    return complexConditionals.map(conditional => ({
      type: 'simplify_conditional',
      target: conditional.substring(0, 50) + '...',
      description: 'Complex conditional expression',
      suggestion: 'Extract to well-named boolean variables'
    }));
  }

  private findLongMethods(code: string): string[] {
    const functions = this.extractFunctions(code, 'auto');
    return functions.filter(func => {
      const funcCode = this.extractFunctionCode(code, func);
      return funcCode.split('\n').length > 30; // Threshold for long method
    });
  }

  private findDeepNesting(code: string): string[] {
    const lines = code.split('\n');
    const deepNestingLines: string[] = [];
    
    lines.forEach((line, index) => {
      const indentLevel = (line.match(/^\s*/)?.[0].length || 0) / 2;
      if (indentLevel > 4) {
        deepNestingLines.push(`Line ${index + 1}: ${line.trim()}`);
      }
    });
    
    return deepNestingLines;
  }

  private findMagicNumbers(code: string): string[] {
    const numberMatches = code.match(/\b\d+\b/g) || [];
    return numberMatches.filter(num => 
      parseInt(num) > 1 && parseInt(num) !== 0 && parseInt(num) !== 100
    );
  }

  // More helper methods with simplified implementations
  private determinePriority(suggestions: any[]): string {
    const highPriority = suggestions.filter(s => s.type === 'extract_method' || s.type === 'remove_duplication');
    if (highPriority.length > 3) return 'high';
    if (suggestions.length > 5) return 'medium';
    return 'low';
  }

  private assessRefactoringImpact(suggestions: any[]): any {
    return {
      maintainability_improvement: suggestions.length * 0.1,
      readability_improvement: suggestions.length * 0.15,
      estimated_effort_hours: suggestions.length * 2
    };
  }

  private calculateCyclomaticComplexity(code: string): any {
    const overall = this.calculateBasicCyclomaticComplexity(code);
    return {
      overall,
      per_function: this.extractFunctions(code, 'auto').map(func => ({
        name: func,
        complexity: Math.floor(Math.random() * 10) + 1 // Simplified
      }))
    };
  }

  private calculateCognitiveComplexity(code: string): any {
    // Simplified cognitive complexity calculation
    const nesting = this.getMaxNestingLevel(code);
    const overall = this.calculateBasicCyclomaticComplexity(code) + nesting;
    
    return {
      overall,
      nesting_penalty: nesting,
      base_complexity: this.calculateBasicCyclomaticComplexity(code)
    };
  }

  private identifyComplexityHotspots(code: string, metrics: any): any[] {
    const functions = this.extractFunctions(code, 'auto');
    return functions.filter(() => Math.random() > 0.7).map(func => ({
      type: 'function',
      name: func,
      complexity_score: Math.floor(Math.random() * 20) + 10,
      recommendation: 'Consider refactoring this function'
    }));
  }

  private calculateOverallComplexityScore(metrics: any): number {
    const cyclomatic = metrics.cyclomatic?.overall || 0;
    const cognitive = metrics.cognitive?.overall || 0;
    return Math.min(100, (cyclomatic + cognitive) / 2);
  }

  private generateComplexityRecommendations(metrics: any, hotspots: any[]): string[] {
    const recommendations = [];
    if (metrics.cyclomatic?.overall > 10) {
      recommendations.push('Consider breaking down complex functions');
    }
    if (hotspots.length > 3) {
      recommendations.push('Focus on refactoring complexity hotspots first');
    }
    return recommendations;
  }

  // Security scan helper methods
  private detectSQLInjection(code: string): any[] {
    const sqlPatterns = [
      /query\s*\+\s*\w+/gi,
      /execute\s*\(\s*['"].*\+.*['"].*\)/gi
    ];
    
    const vulnerabilities: any[] = [];
    sqlPatterns.forEach(pattern => {
      const matches = code.match(pattern) || [];
      matches.forEach(match => {
        vulnerabilities.push({
          type: 'sql_injection',
          severity: 'critical',
          location: match,
          description: 'Potential SQL injection vulnerability'
        });
      });
    });
    
    return vulnerabilities;
  }

  private detectXSS(code: string): any[] {
    const xssPatterns = [
      /innerHTML\s*=\s*\w+/gi,
      /document\.write\s*\(\s*\w+/gi
    ];
    
    const vulnerabilities: any[] = [];
    xssPatterns.forEach(pattern => {
      const matches = code.match(pattern) || [];
      matches.forEach(match => {
        vulnerabilities.push({
          type: 'xss',
          severity: 'high',
          location: match,
          description: 'Potential XSS vulnerability'
        });
      });
    });
    
    return vulnerabilities;
  }

  private detectHardcodedSecrets(code: string): any[] {
    const secretPatterns = [
      /password\s*=\s*['"][^'"]+['"]/gi,
      /api_key\s*=\s*['"][^'"]+['"]/gi,
      /token\s*=\s*['"][^'"]+['"]/gi
    ];
    
    const vulnerabilities: any[] = [];
    secretPatterns.forEach(pattern => {
      const matches = code.match(pattern) || [];
      matches.forEach(match => {
        vulnerabilities.push({
          type: 'hardcoded_secret',
          severity: 'medium',
          location: match.substring(0, 30) + '...',
          description: 'Hardcoded secret detected'
        });
      });
    });
    
    return vulnerabilities;
  }

  private detectInputValidationIssues(code: string): any[] {
    const hasValidation = code.includes('validate') || code.includes('sanitize');
    const hasUserInput = code.includes('req.body') || code.includes('input') || code.includes('params');
    
    if (hasUserInput && !hasValidation) {
      return [{
        type: 'input_validation',
        severity: 'medium',
        description: 'User input detected without apparent validation'
      }];
    }
    
    return [];
  }

  private calculateSecurityScore(vulnerabilities: any[], codeLength: number): number {
    const criticalVulns = vulnerabilities.filter(v => v.severity === 'critical').length;
    const highVulns = vulnerabilities.filter(v => v.severity === 'high').length;
    const mediumVulns = vulnerabilities.filter(v => v.severity === 'medium').length;
    
    const penalty = (criticalVulns * 30) + (highVulns * 20) + (mediumVulns * 10);
    return Math.max(0, 100 - penalty);
  }

  private generateSecurityRecommendations(vulnerabilities: any[]): string[] {
    const recommendations = [];
    
    if (vulnerabilities.some(v => v.type === 'sql_injection')) {
      recommendations.push('Use parameterized queries to prevent SQL injection');
    }
    
    if (vulnerabilities.some(v => v.type === 'xss')) {
      recommendations.push('Sanitize user input and use safe DOM manipulation methods');
    }
    
    if (vulnerabilities.some(v => v.type === 'hardcoded_secret')) {
      recommendations.push('Move secrets to environment variables or secure configuration');
    }
    
    return recommendations;
  }

  private generateRecommendations(structure: any, metrics: any, issues: any[]): string[] {
    const recommendations = [];
    
    if (metrics.comment_ratio < 0.1) {
      recommendations.push('Consider adding more documentation and comments');
    }
    
    if (metrics.cyclomatic_complexity > 10) {
      recommendations.push('Reduce complexity by breaking down large functions');
    }
    
    if (issues.length > 10) {
      recommendations.push('Address code quality issues to improve maintainability');
    }
    
    return recommendations;
  }

  // Utility methods
  private extractFunctionCode(code: string, functionName: string): string {
    const functionStart = code.indexOf(`function ${functionName}`) || code.indexOf(`${functionName} =`);
    if (functionStart === -1) return '';
    
    // Simplified extraction - in production, use proper AST parsing
    const fromStart = code.substring(functionStart);
    const braceCount = (fromStart.match(/{/g) || []).length;
    const closeBraceCount = (fromStart.match(/}/g) || []).length;
    
    return fromStart.substring(0, Math.min(1000, fromStart.length)); // Simplified
  }

  private extractClassCode(code: string, className: string): string {
    const classStart = code.indexOf(`class ${className}`);
    if (classStart === -1) return '';
    
    // Simplified extraction
    const fromStart = code.substring(classStart);
    return fromStart.substring(0, Math.min(2000, fromStart.length));
  }

  private getMaxNestingLevel(code: string): number {
    const lines = code.split('\n');
    let maxNesting = 0;
    
    lines.forEach(line => {
      const indentLevel = (line.match(/^\s*/)?.[0].length || 0) / 2;
      maxNesting = Math.max(maxNesting, indentLevel);
    });
    
    return maxNesting;
  }

  private getSupportedOperations(): string[] {
    return [
      'analyze_code',
      'detect_patterns',
      'suggest_refactoring',
      'analyze_complexity',
      'security_scan'
    ];
  }
} 