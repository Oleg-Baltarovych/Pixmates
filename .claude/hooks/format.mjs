// PostToolUse hook (Edit|Write): runs Prettier on the edited file only.
// Silently does nothing until Prettier is installed in the project. Never blocks.
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

let input;
try {
  input = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  process.exit(0);
}

const filePath = input?.tool_input?.file_path;
if (!filePath || !/\.(ts|tsx|js|mjs|cjs|json|css|ya?ml)$/.test(filePath)) process.exit(0);
// Generated or byte-exact files: character sheets, DB fixtures, pack fixtures, palettes.
if (/[\\/](resources[\\/]characters|tests[\\/]fixtures|assets-src[\\/]palettes|skins-local)[\\/]/.test(filePath)) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
const bin = path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'prettier.cmd' : 'prettier');
if (!existsSync(bin)) process.exit(0);

spawnSync(bin, ['--write', '--log-level', 'warn', filePath], {
  cwd: root,
  stdio: 'ignore',
  shell: process.platform === 'win32',
  timeout: 20_000,
});
process.exit(0);
