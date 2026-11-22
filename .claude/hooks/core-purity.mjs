// PostToolUse hook (Edit|Write): keeps src/core pure and deterministic (SPEC §3, ADR 002).
// Cheap regex check until the ESLint boundary rules exist; it stays as a fast early warning afterwards.
// Exit 2 = feedback shown to Claude (the edit is already applied — fix it). Exit 0 = fine.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

let input;
try {
  input = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  process.exit(0);
}

const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
const filePath = input?.tool_input?.file_path;
if (!filePath || !existsSync(filePath)) process.exit(0);

const rel = path.relative(root, filePath).split(path.sep).join('/');
if (!/^src\/core\/.+\.tsx?$/.test(rel)) process.exit(0);

const RULES = [
  [/from\s+['"](electron|pixi\.js|@pixi\/|react|react-dom|zustand|systeminformation|get-windows|ai|@ai-sdk\/[\w-]+|ai-sdk-ollama|@modelcontextprotocol\/[\w-]+|electron-store|better-sqlite3)['"/]/, 'imports a platform / render / UI / AI package'],
  [/from\s+['"](node:[\w/]+|fs|path|os|child_process|http|https|net|crypto|events|worker_threads)['"]/, 'imports a Node built-in'],
  [/from\s+['"](\.\.\/)+(main|renderer|preload)\//, 'imports from main / renderer / preload'],
  [/\bDate\.now\s*\(|\bnew\s+Date\s*\(|\bperformance\.now\s*\(/, 'reads the clock — take `now` as a parameter'],
  [/\bMath\.random\s*\(/, 'uses Math.random — use the seeded RNG (core/rng.ts)'],
  [/\b(window|document|navigator|localStorage|sessionStorage|indexedDB|process)\s*[.[]/, 'touches a browser / process global'],
  [/\b(setTimeout|setInterval|setImmediate|requestAnimationFrame|queueMicrotask)\s*\(/, 'schedules timers — main drives the core with events'],
  [/\brequire\s*\(/, 'uses require — core is ESM and dependency-free'],
];

const problems = [];
readFileSync(filePath, 'utf8')
  .split(/\r?\n/)
  .forEach((line, i) => {
    const code = line.replace(/(^|[^:])\/\/.*$/, '$1'); // strip line comments, keep URLs like https://
    if (/^\s*(\*|\/\*)/.test(code)) return;
    for (const [re, why] of RULES) if (re.test(code)) problems.push(`  ${rel}:${i + 1} ${why}`);
  });

if (problems.length) {
  process.stderr.write(
    `core-purity: src/core must stay pure and deterministic (CLAUDE.md, .claude/rules/core.md):\n${problems.join('\n')}\n`,
  );
  process.exit(2);
}
process.exit(0);
