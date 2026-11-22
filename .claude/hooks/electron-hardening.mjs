// PostToolUse hook (Edit|Write): flags insecure Electron patterns in src/main and src/preload (SPEC §10, rules/security.md).
// A fast early warning, not a proof of security — electron-security-reviewer does the real review.
// Exit 2 = feedback shown to Claude (the edit is already applied — fix it or justify with an `// security-ok: <reason>` comment). Exit 0 = fine.
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
if (!/^src\/(main|preload)\/.+\.tsx?$/.test(rel)) process.exit(0);

const RULES = [
  [/nodeIntegration\s*:\s*true/, 'nodeIntegration: true — must stay false'],
  [/nodeIntegrationInWorker\s*:\s*true/, 'nodeIntegrationInWorker: true — must stay false'],
  [/contextIsolation\s*:\s*false/, 'contextIsolation: false — must stay true'],
  [/sandbox\s*:\s*false/, 'sandbox: false — must stay true'],
  [/webSecurity\s*:\s*false/, 'webSecurity: false — must stay true'],
  [/allowRunningInsecureContent\s*:\s*true/, 'allowRunningInsecureContent: true'],
  [/webviewTag\s*:\s*true/, 'webviewTag: true — no webviews'],
  [/experimentalFeatures\s*:\s*true/, 'experimentalFeatures: true'],
  [/\.executeJavaScript\s*\(/, 'executeJavaScript — no dynamic code in renderers'],
  [/shell\.openExternal\s*\(\s*(?!['"`]https:\/\/)/, 'shell.openExternal with a non-literal URL — go through the https allow-list helper'],
  [/from\s+['"](node:)?child_process['"]|require\(\s*['"](node:)?child_process['"]\s*\)/, 'child_process — only the allow-listed git/gh execFile wrapper may use it'],
  [/(?<![.\w])exec(Sync)?\s*\(/, 'exec/execSync — shell interpolation; use execFile with an argument array'],
  [/listen\s*\([^)]*['"]0\.0\.0\.0['"]/, 'server bound to 0.0.0.0 — local servers bind to 127.0.0.1 only'],
  [/exposeInMainWorld\s*\([^)]*ipcRenderer\s*[,)]/, 'exposes ipcRenderer itself — expose named typed functions only'],
  [/\beval\s*\(|new\s+Function\s*\(/, 'eval / new Function'],
];

const problems = [];
readFileSync(filePath, 'utf8')
  .split(/\r?\n/)
  .forEach((line, i) => {
    if (/security-ok:/.test(line)) return;
    const code = line.replace(/(^|[^:])\/\/.*$/, '$1'); // strip line comments, keep URLs like https://
    if (/^\s*(\*|\/\*)/.test(code)) return;
    for (const [re, why] of RULES) if (re.test(code)) problems.push(`  ${rel}:${i + 1} ${why}`);
  });

if (problems.length) {
  process.stderr.write(
    `electron-hardening: insecure pattern(s) in main/preload (CLAUDE.md, .claude/rules/security.md):\n${problems.join('\n')}\n` +
      'Fix it, or if this is a reviewed exception add `// security-ok: <reason>` on that line.\n',
  );
  process.exit(2);
}
process.exit(0);
