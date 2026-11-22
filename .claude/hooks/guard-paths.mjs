// PreToolUse hook (Read|Edit|Write|NotebookEdit|Bash).
// Blocks: secrets, certificates and key files (any access); edits to generated character sheets;
// edits to committed DB fixtures; any agent write into skins-local/ (owner's personal packs, ADR 005).
// Exit 2 = block, stderr is shown to Claude. Exit 0 = no decision.
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

let input;
try {
  input = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  process.exit(0);
}

const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
const tool = input?.tool_name ?? '';

const block = (reason) => {
  process.stderr.write(`Blocked by .claude/hooks/guard-paths.mjs: ${reason}\n`);
  process.exit(2);
};

const SECRETS_HINT =
  'Secrets, API keys and certificates are off-limits. Use .env.example and ask the user to update local secrets.';
const CERT_RE = /\.(pfx|p12|p8|cer|pem|key)$/i;

// Bash: block commands that reference a .env file (anything but .env.example), a certificate/key file,
// or that write into skins-local/.
if (tool === 'Bash') {
  const command = String(input?.tool_input?.command ?? '');
  if (/(?:^|[\s'"=<>|;&(/\\])\.env(?:\.(?!example\b)[\w-]+)*(?=$|[\s'"<>|;&)])/.test(command)) {
    block(`command references a .env file. ${SECRETS_HINT}`);
  }
  if (/[\w-]+\.(?:pfx|p12|p8|cer|pem|key)\b/i.test(command)) {
    block(`command references a certificate / key file. ${SECRETS_HINT}`);
  }
  if (/skins-local[\\/]/.test(command) && /(>|\bcp\b|\bmv\b|\brm\b|\bmkdir\b|\btouch\b|\btee\b|Copy-Item|Move-Item|Remove-Item|New-Item|Set-Content|Out-File)/.test(command)) {
    block('skins-local/ holds the owner\'s personal packs (ADR 005). Agents never write there.');
  }
  process.exit(0);
}

const filePath = input?.tool_input?.file_path ?? input?.tool_input?.notebook_path;
if (!filePath) process.exit(0);

const rel = path.relative(root, filePath).split(path.sep).join('/');
const base = path.basename(filePath);

if (/^\.env(\..+)?$/.test(base) && base !== '.env.example') {
  block(`"${rel}" is a secrets file. ${SECRETS_HINT}`);
}
if (CERT_RE.test(base)) {
  block(`"${rel}" is a certificate / key file. ${SECRETS_HINT}`);
}

if (tool === 'Read') process.exit(0);

// Owner's personal packs — never authored or modified by agents (ADR 005).
if (/^skins-local\//.test(rel)) {
  block(`"${rel}" is in skins-local/ (owner's personal packs, ADR 005). Agents never write there.`);
}

// Generated output: character sheets are rebuilt from assets-src/ by `pnpm sprites`.
if (/^resources\/characters\//.test(rel)) {
  block(`"${rel}" is generated. Edit the source in assets-src/ and run \`pnpm sprites\` (see /sprite).`);
}

// DB fixtures are snapshots of real old schema versions. Once tracked by git they are immutable,
// otherwise migration tests stop proving anything. Add a new fixture instead (see /db-migration).
if (/^tests\/fixtures\/db\/.+/.test(rel) && existsSync(filePath)) {
  const tracked = spawnSync('git', ['ls-files', '--error-unmatch', '--', rel], { cwd: root, stdio: 'ignore' });
  // status 1 = untracked; anything else (tracked, or git unavailable) → treat as immutable.
  if (tracked.status !== 1) {
    block(`"${rel}" is a committed DB fixture. Add a new fixture for the new version instead (see /db-migration).`);
  }
}

process.exit(0);
