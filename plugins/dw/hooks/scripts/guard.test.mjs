import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, splitSegments } from './guard.mjs';

const IS_WIN = process.platform === 'win32';
const ROOT = IS_WIN ? 'C:\\work\\repo' : '/work/repo';
const OUTSIDE = IS_WIN ? 'C:\\work\\other' : '/work/other';

function ctx({ dw = true, current = 'ENG-12-login', base = 'main' } = {}) {
  return {
    isDwProject: () => dw,
    repoRoot: () => ROOT,
    baseBranch: () => base,
    currentBranch: () => current,
  };
}

const bash = (command, c = ctx()) => evaluate({ tool_name: 'Bash', tool_input: { command }, cwd: ROOT }, c);
const ps = (command, c = ctx()) => evaluate({ tool_name: 'PowerShell', tool_input: { command }, cwd: ROOT }, c);
const mcp = (tool_name, c = ctx()) => evaluate({ tool_name, tool_input: {}, cwd: ROOT }, c);

test('tokenizer splits on separators and keeps quoted text', () => {
  assert.deepEqual(splitSegments('git add -A && git commit -m "a && b"; echo ok'), [
    ['git', 'add', '-A'],
    ['git', 'commit', '-m', 'a && b'],
    ['echo', 'ok'],
  ]);
});

test('force pushes are denied', () => {
  for (const cmd of [
    'git push --force origin ENG-12-login',
    'git push -f',
    'git push -uf origin ENG-12-login',
    'git push --force-with-lease',
    'git push --force-with-lease=ENG-12-login origin ENG-12-login',
    'git push origin +ENG-12-login',
    'git push --mirror origin',
    'npm test && git push -f origin x',
    'git -C . push --force',
  ]) {
    assert.match(bash(cmd) ?? '', /force push/, cmd);
  }
});

test('pushes to the base branch are denied, explicitly or implicitly', () => {
  assert.match(bash('git push origin main') ?? '', /base branch/);
  assert.match(bash('git push origin HEAD:main') ?? '', /base branch/);
  assert.match(bash('git push origin feature:refs/heads/main') ?? '', /base branch/);
  assert.match(bash('git push origin :main') ?? '', /base branch/);
  assert.match(bash('git push --delete origin main') ?? '', /base branch/);
  assert.match(bash('git push --all origin') ?? '', /base branch/);
  assert.match(bash('git push', ctx({ current: 'main' })) ?? '', /base branch/);
  assert.match(bash('git push origin HEAD', ctx({ current: 'main' })) ?? '', /base branch/);
  assert.match(bash('git push origin develop', ctx({ base: 'develop' })) ?? '', /base branch/);
});

test('normal ticket pushes are allowed', () => {
  assert.equal(bash('git push -u origin ENG-12-login'), null);
  assert.equal(bash('git push origin ENG-12-login'), null);
  assert.equal(bash('git push'), null);
  assert.equal(bash('git push origin main-ish-branch'), null);
  assert.equal(bash('git fetch origin && git pull --ff-only origin main'), null);
  assert.equal(bash('echo "git push --force"'), null);
});

test('deletions outside the repository are denied', () => {
  assert.match(bash(`rm -rf ${OUTSIDE.replace(/\\/g, '/')}`) ?? '', /outside the repository/);
  assert.match(bash('rm -rf ../other') ?? '', /outside the repository/);
  assert.match(bash('rm -rf ~/projects') ?? '', /outside the repository/);
  assert.match(bash('rm -rf /') ?? '', /outside the repository/);
  assert.match(bash('cd .. && rm -rf repo2') ?? '', /outside the repository/);
  assert.match(bash('rm -rf $SOME_DIR/x') ?? '', /cannot verify/);
  assert.match(bash('rm -rf .') ?? '', /repository root/);
  assert.match(ps(`Remove-Item -Recurse -Force "${OUTSIDE}"`) ?? '', /outside the repository/);
  assert.match(ps(`Remove-Item -LiteralPath ${OUTSIDE}`) ?? '', /outside the repository/);
});

test('deletions inside the repository are allowed', () => {
  assert.equal(bash('rm -rf node_modules dist'), null);
  assert.equal(bash('rm -f apps/api/tmp.log'), null);
  assert.equal(bash('rm -- -weird-name'), null);
  assert.equal(ps('Remove-Item -Recurse -Force .\\apps\\web\\.next'), null);
});

test('forge merge tools are denied, read and create tools allowed', () => {
  assert.match(mcp('mcp__plugin_dw_github__merge_pull_request') ?? '', /never merges/);
  assert.match(mcp('mcp__forge__merge_merge_request') ?? '', /never merges/);
  assert.match(mcp('mcp__gitlab__accept_merge_request') ?? '', /never merges/);
  assert.match(mcp('mcp__claude_ai_GitHub__merge_pull_request') ?? '', /never merges/);
  assert.match(mcp('mcp__github__enable_auto_merge') ?? '', /never merges/);
  assert.equal(mcp('mcp__plugin_dw_github__create_pull_request'), null);
  assert.equal(mcp('mcp__gitlab__list_merge_requests'), null);
  assert.equal(mcp('mcp__plugin_dw_linear__list_issues'), null);
});

test('rules are scoped to dw projects, except merges on dw servers', () => {
  const outside = ctx({ dw: false });
  assert.equal(bash('git push --force', outside), null);
  assert.equal(mcp('mcp__github__merge_pull_request', outside), null);
  assert.match(mcp('mcp__plugin_dw_github__merge_pull_request', outside) ?? '', /never merges/);
});
