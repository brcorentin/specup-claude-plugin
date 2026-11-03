#!/usr/bin/env node
// dw guard — PreToolUse hook.
// Denies: force pushes, pushes to the base branch, deletions outside the repository
// (Bash / PowerShell tools, in dw projects), and forge MCP tools that merge.
// Reads the hook input JSON on stdin, prints a PreToolUse deny decision on stdout.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const IS_WIN = process.platform === 'win32';

// ---------------------------------------------------------------------------
// Tokenizer: splits a shell command line into segments of words.
// Handles quotes, escapes, and the separators ; && || | & and newlines.
// Command substitutions $(...) and backticks are scanned as separate segments.

export function splitSegments(command) {
  const segments = [];
  let words = [];
  let word = '';
  let hasWord = false;
  const pushWord = () => {
    if (hasWord) words.push(word);
    word = '';
    hasWord = false;
  };
  const pushSegment = () => {
    pushWord();
    if (words.length) segments.push(words);
    words = [];
  };

  for (let i = 0; i < command.length; i++) {
    const c = command[i];
    if (c === "'") {
      const end = command.indexOf("'", i + 1);
      word += end === -1 ? command.slice(i + 1) : command.slice(i + 1, end);
      hasWord = true;
      i = end === -1 ? command.length : end;
    } else if (c === '"') {
      let j = i + 1;
      while (j < command.length && command[j] !== '"') {
        if (command[j] === '\\' && DQ_ESCAPABLE.has(command[j + 1])) j++;
        word += command[j] ?? '';
        j++;
      }
      hasWord = true;
      i = j;
    } else if (c === '\\' && i + 1 < command.length && command[i + 1] === '\n') {
      i++; // line continuation
    } else if (c === '$' && command[i + 1] === '(') {
      let depth = 1;
      let j = i + 2;
      while (j < command.length && depth > 0) {
        if (command[j] === '(') depth++;
        else if (command[j] === ')') depth--;
        j++;
      }
      for (const s of splitSegments(command.slice(i + 2, j - 1))) segments.push(s);
      word += '$(...)';
      hasWord = true;
      i = j - 1;
    } else if (c === '`') {
      const end = command.indexOf('`', i + 1);
      const inner = end === -1 ? command.slice(i + 1) : command.slice(i + 1, end);
      for (const s of splitSegments(inner)) segments.push(s);
      word += '$(...)';
      hasWord = true;
      i = end === -1 ? command.length : end;
    } else if (c === ';' || c === '\n' || c === '|' || c === '&') {
      pushSegment();
      if ((c === '|' || c === '&') && command[i + 1] === c) i++;
    } else if (c === ' ' || c === '\t' || c === '\r') {
      pushWord();
    } else {
      word += c;
      hasWord = true;
    }
  }
  pushSegment();
  return segments;
}

// Inside double quotes a backslash only escapes these characters; elsewhere it is
// literal, which keeps Windows paths such as "C:\Users" intact.
const DQ_ESCAPABLE = new Set(['"', '\\', '$', '`']);

// ---------------------------------------------------------------------------
// Helpers

const WRAPPERS = new Set(['sudo', 'command', 'builtin', 'exec', 'time', 'nice', 'nohup', 'noglob', 'env', 'timeout', 'stdbuf']);

function stripPrefix(words) {
  let i = 0;
  while (i < words.length) {
    const w = words[i];
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(w)) { i++; continue; }
    if (WRAPPERS.has(w)) {
      i++;
      if (w === 'timeout') { while (i < words.length && words[i].startsWith('-')) i++; i++; }
      continue;
    }
    break;
  }
  return words.slice(i);
}

function exeName(word) {
  return path.basename(word.replace(/\\/g, '/')).toLowerCase().replace(/\.(exe|cmd|bat)$/, '');
}

function stripRefsHeads(ref) {
  return ref.replace(/^refs\/heads\//, '');
}

export function normalizePath(p) {
  let s = p.replace(/\\/g, '/');
  // Git Bash / MSYS form: /c/Users/... -> C:/Users/...
  const msys = /^\/([a-zA-Z])(\/|$)/.exec(s);
  if (IS_WIN && msys) s = `${msys[1].toUpperCase()}:/${s.slice(3)}`;
  s = path.posix.normalize(s);
  if (s.length > 1 && s.endsWith('/')) s = s.slice(0, -1);
  return IS_WIN ? s.toLowerCase() : s;
}

function isAbsoluteLike(p) {
  return p.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(p) || p.startsWith('\\\\');
}

function resolveTarget(target, cwd) {
  let t = target;
  if (t === '~' || t.startsWith('~/') || t.startsWith('~\\')) t = path.join(os.homedir(), t.slice(1));
  t = t.replace(/\$\{?(HOME|USERPROFILE)\}?|\$env:(USERPROFILE|HOME)|%(USERPROFILE|HOME)%/gi, () => os.homedir());
  t = t.replace(/\$\{?TMPDIR\}?|\$env:TEMP|%TEMP%|%TMP%/gi, () => os.tmpdir());
  if (/\$|%[A-Za-z_]+%/.test(t)) return null; // unresolved variable: cannot verify
  if (isAbsoluteLike(t)) return normalizePath(t);
  return normalizePath(path.posix.join(normalizePath(cwd), t.replace(/\\/g, '/')));
}

function isInside(child, parent) {
  return child === parent || child.startsWith(parent.endsWith('/') ? parent : `${parent}/`);
}

// ---------------------------------------------------------------------------
// Rules

const DELETE_COMMANDS = new Set(['rm', 'rmdir', 'unlink', 'shred', 'del', 'erase', 'rd', 'remove-item', 'ri']);
const PS_PATH_PARAMS = new Set(['-path', '-literalpath', '-lp']);

function checkGitPush(args, ctx, cwd) {
  // args: words after "git"
  let i = 0;
  let gitCwd = cwd;
  while (i < args.length && args[i].startsWith('-')) {
    const a = args[i];
    if (a === '-C' && args[i + 1]) { gitCwd = resolveTarget(args[i + 1], cwd) ?? cwd; i += 2; continue; }
    if (a === '-c' || a === '--git-dir' || a === '--work-tree' || a === '--namespace') { i += 2; continue; }
    i++;
  }
  if (args[i] !== 'push') return null;
  const rest = args.slice(i + 1);

  const positionals = [];
  let all = false;
  let deleting = false;
  for (let k = 0; k < rest.length; k++) {
    const a = rest[k];
    if (a === '--') { positionals.push(...rest.slice(k + 1)); break; }
    if (a.startsWith('--')) {
      const name = a.split('=')[0];
      if (['--force', '--force-with-lease', '--force-if-includes', '--mirror'].includes(name)) {
        return `force push is forbidden in dw projects (${name}). Push new commits instead.`;
      }
      if (name === '--all' || name === '--branches') all = true;
      if (name === '--delete') deleting = true;
      if (['--repo', '--receive-pack', '--exec', '--push-option', '--signed'].includes(name) && !a.includes('=')) k++;
      continue;
    }
    if (a.startsWith('-') && a.length > 1) {
      if (/^-[A-Za-z]+$/.test(a) && a.includes('f')) return 'force push is forbidden in dw projects (-f). Push new commits instead.';
      if (a.includes('d')) deleting = true;
      if (a === '-o') k++;
      continue;
    }
    positionals.push(a);
  }

  const base = ctx.baseBranch(gitCwd);
  const refspecs = positionals.slice(1);
  if (refspecs.some((r) => r.startsWith('+'))) return 'force push is forbidden in dw projects (+refspec). Push new commits instead.';
  if (all) return `git push --all would push the base branch "${base}". Push the ticket branch only.`;

  const current = () => ctx.currentBranch(gitCwd);
  const targets = refspecs.length
    ? refspecs.map((r) => {
        if (deleting) return stripRefsHeads(r);
        const dst = r.includes(':') ? r.split(':').pop() : r;
        if (dst === '') return null;
        if (dst === 'HEAD' || dst === '@') return current();
        return stripRefsHeads(dst);
      })
    : [current()];
  // "git push origin :main" deletes main
  for (const r of refspecs) if (r.startsWith(':') && stripRefsHeads(r.slice(1)) === base) targets.push(base);

  if (targets.includes(base)) {
    return `pushing to the base branch "${base}" is forbidden in dw projects. Push the ticket branch and open a PR.`;
  }
  return null;
}

function checkDelete(cmd, args, ctx, cwd) {
  const root = ctx.repoRoot(cwd);
  if (!root) return null;
  const targets = [];
  const isPs = cmd === 'remove-item' || cmd === 'ri';
  let endOfOptions = false;
  for (let k = 0; k < args.length; k++) {
    const a = args[k];
    if (!endOfOptions && a === '--') { endOfOptions = true; continue; }
    if (isPs && PS_PATH_PARAMS.has(a.toLowerCase())) { if (args[k + 1]) targets.push(...args[k + 1].split(',')); k++; continue; }
    if (!endOfOptions && a.startsWith('-')) continue;
    if ((cmd === 'del' || cmd === 'erase' || cmd === 'rd') && a.startsWith('/') && a.length <= 3) continue; // cmd.exe switches like /s /q
    targets.push(isPs ? a.split(',')[0] : a);
  }
  for (const t of targets) {
    if (!t) continue;
    const resolved = resolveTarget(t, cwd);
    if (resolved === null) return `cannot verify that "${t}" is inside the repository (unresolved variable). Use a path relative to the repo.`;
    if (!isInside(resolved, normalizePath(root))) {
      return `deleting "${t}" is forbidden: it is outside the repository (${root}).`;
    }
    if (resolved === normalizePath(root)) return 'deleting the repository root is forbidden.';
  }
  return null;
}

export function checkShell(command, ctx, startCwd) {
  let cwd = startCwd;
  for (const segment of splitSegments(command)) {
    const words = stripPrefix(segment);
    if (!words.length) continue;
    const cmd = exeName(words[0]);
    const args = words.slice(1);
    if (cmd === 'cd' || cmd === 'set-location' || cmd === 'sl' || cmd === 'pushd' || cmd === 'chdir') {
      const dest = args.find((a) => !a.startsWith('-'));
      cwd = dest ? resolveTarget(dest, cwd) ?? cwd : os.homedir();
      continue;
    }
    if (cmd === 'git') {
      const reason = checkGitPush(args, ctx, cwd);
      if (reason) return reason;
      continue;
    }
    if (DELETE_COMMANDS.has(cmd)) {
      const reason = checkDelete(cmd, args, ctx, cwd);
      if (reason) return reason;
    }
  }
  return null;
}

// Tools that merge or accept a pull/merge request, or enable auto-merge.
// Read tools such as list_merge_requests or get_merge_request stay allowed.
const MERGE_TOOL = /^(merge|accept)|auto_?merge/i;
const FORGE_SERVER = /^mcp__(plugin_dw_[A-Za-z0-9-]+|forge|[A-Za-z0-9_-]*?(?:github|gitlab|gitea|bitbucket|forgejo)[A-Za-z0-9-]*)__/i;

export function checkMcp(toolName) {
  if (!toolName.startsWith('mcp__')) return null;
  const server = FORGE_SERVER.exec(toolName);
  if (!server) return null;
  const tool = toolName.slice(server[0].length);
  if (MERGE_TOOL.test(tool)) return `the dw workflow never merges pull/merge requests (${toolName}). The human reviewer merges.`;
  return null;
}

export function evaluate(input, ctx) {
  const tool = input.tool_name ?? '';
  if (tool.startsWith('mcp__')) {
    // Merge tools are always blocked on dw's own servers, and on other forge servers in dw projects.
    if (!tool.startsWith('mcp__plugin_dw_') && !ctx.isDwProject(input.cwd)) return null;
    return checkMcp(tool);
  }
  if (tool === 'Bash' || tool === 'PowerShell') {
    if (!ctx.isDwProject(input.cwd)) return null;
    const command = input.tool_input?.command;
    if (typeof command !== 'string') return null;
    return checkShell(command, ctx, input.cwd || process.cwd());
  }
  return null;
}

// ---------------------------------------------------------------------------
// Real context (git + filesystem)

function git(cwd, args) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 4000 }).trim();
  } catch {
    return null;
  }
}

export function realContext() {
  const rootCache = new Map();
  const repoRoot = (cwd) => {
    if (!rootCache.has(cwd)) rootCache.set(cwd, git(cwd, ['rev-parse', '--show-toplevel']) || process.env.CLAUDE_PROJECT_DIR || null);
    return rootCache.get(cwd);
  };
  const workflow = (cwd) => {
    const root = repoRoot(cwd);
    if (!root) return null;
    const file = path.join(root, '.claude', 'workflow.json');
    if (!existsSync(file)) return null;
    try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return {}; }
  };
  return {
    repoRoot,
    isDwProject: (cwd) => workflow(cwd || process.cwd()) !== null,
    baseBranch: (cwd) => workflow(cwd)?.forge?.baseBranch || 'main',
    currentBranch: (cwd) => git(cwd, ['rev-parse', '--abbrev-ref', 'HEAD']),
  };
}

function deny(reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: `dw guard: ${reason}`,
    },
  }));
}

async function main() {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.stderr.write('dw guard: invalid hook input, skipped\n');
    process.exit(1);
  }
  try {
    const reason = evaluate(input, realContext());
    if (reason) deny(reason);
  } catch (err) {
    process.stderr.write(`dw guard: internal error, check skipped: ${err?.message ?? err}\n`);
    process.exit(1);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
