/**
 * AgentOps observability extractor — scan.ts
 * Discovers valid session directories under rootDir matching FEAT-* pattern.
 */

import { type Dirent, promises as fsp } from 'fs';
import path from 'path';

/**
 * Scans rootDir for subdirectories matching FEAT-* that contain at least a
 * session.yml file. Returns absolute paths sorted by name (ascending) for
 * idempotency. Tolerates rootDir not existing (returns []).
 */
export async function scan(rootDir: string): Promise<string[]> {
  let entries: Dirent[];
  try {
    entries = await fsp.readdir(rootDir, { withFileTypes: true });
  } catch {
    // rootDir does not exist or is not readable
    return [];
  }

  const candidates = entries
    .filter((e) => e.isDirectory() && e.name.startsWith('FEAT-'))
    .map((e) => path.resolve(rootDir, e.name));

  const valid: string[] = [];
  await Promise.all(
    candidates.map(async (sessionPath) => {
      const sessionYmlPath = path.join(sessionPath, 'session.yml');
      try {
        await fsp.access(sessionYmlPath);
        valid.push(sessionPath);
      } catch {
        // No session.yml — skip
      }
    }),
  );

  return valid.sort();
}
