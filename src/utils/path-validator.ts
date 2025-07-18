/**
 * Path validation utilities to prevent directory traversal attacks
 */

import path from 'path';
import { promises as fs } from 'fs';

/**
 * Validates that a path is within the allowed directory
 */
export function isPathSafe(targetPath: string, allowedBase: string): boolean {
  // Resolve both paths to absolute
  const resolvedTarget = path.resolve(targetPath);
  const resolvedBase = path.resolve(allowedBase);

  // Check if the target path starts with the allowed base path
  return resolvedTarget.startsWith(resolvedBase + path.sep) || resolvedTarget === resolvedBase;
}

/**
 * Sanitizes a filename to prevent directory traversal
 */
export function sanitizeFilename(filename: string): string {
  // Remove any path separators and parent directory references
  return filename
    .replace(/[\/\\]/g, '_') // Replace slashes with underscores
    .replace(/\.\./g, '_') // Replace .. with underscore
    .replace(/^\./, '_') // Replace leading dot
    .replace(/[\x00-\x1f\x80-\x9f]/g, '') // Remove control characters
    .replace(/[<>:"|?*]/g, '_'); // Replace invalid filename chars
}

/**
 * Safely joins paths and validates the result
 */
export function safeJoin(basePath: string, ...paths: string[]): string {
  const joined = path.join(basePath, ...paths);
  const resolved = path.resolve(joined);
  const resolvedBase = path.resolve(basePath);

  if (!isPathSafe(resolved, resolvedBase)) {
    throw new Error(`Path traversal attempt detected: ${joined}`);
  }

  return resolved;
}

/**
 * Validates that a path exists and is within allowed directory
 */
export async function validatePath(
  targetPath: string,
  allowedBase: string,
  mustExist: boolean = false
): Promise<string> {
  const resolved = path.resolve(targetPath);
  const resolvedBase = path.resolve(allowedBase);

  if (!isPathSafe(resolved, resolvedBase)) {
    throw new Error(`Path traversal attempt detected: ${targetPath}`);
  }

  if (mustExist) {
    try {
      await fs.access(resolved);
    } catch {
      throw new Error(`Path does not exist: ${targetPath}`);
    }
  }

  return resolved;
}

/**
 * Creates a directory safely within allowed base
 */
export async function safeCreateDirectory(dirPath: string, allowedBase: string): Promise<void> {
  const validated = await validatePath(dirPath, allowedBase, false);
  await fs.mkdir(validated, { recursive: true });
}

/**
 * Reads a file safely within allowed base
 */
export async function safeReadFile(
  filePath: string,
  allowedBase: string,
  encoding: BufferEncoding = 'utf8'
): Promise<string> {
  const validated = await validatePath(filePath, allowedBase, true);
  return fs.readFile(validated, encoding);
}

/**
 * Writes a file safely within allowed base
 */
export async function safeWriteFile(
  filePath: string,
  content: string,
  allowedBase: string
): Promise<void> {
  const validated = await validatePath(filePath, allowedBase, false);

  // Ensure directory exists
  const dir = path.dirname(validated);
  await fs.mkdir(dir, { recursive: true });

  await fs.writeFile(validated, content, 'utf8');
}

/**
 * Lists directory contents safely
 */
export async function safeReadDir(dirPath: string, allowedBase: string): Promise<string[]> {
  const validated = await validatePath(dirPath, allowedBase, true);
  return fs.readdir(validated);
}
