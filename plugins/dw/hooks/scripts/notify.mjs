#!/usr/bin/env node
// dw notify — desktop notification when a human is needed.
// Usage:
//   node notify.mjs "<title>" "<message>"     explicit call from a dw skill (gate, escalation, end of run)
//   node notify.mjs --hook                    Notification hook: reads the event JSON on stdin,
//                                             only notifies inside dw projects (.claude/workflow.json)
// Never fails the caller: errors are swallowed, exit code is always 0.

import { spawn, execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

function projectRoot(cwd) {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 3000 }).trim();
  } catch {
    return process.env.CLAUDE_PROJECT_DIR || cwd;
  }
}

function isDwProject(cwd) {
  return existsSync(path.join(projectRoot(cwd), '.claude', 'workflow.json'));
}

function run(cmd, args, env) {
  try {
    const child = spawn(cmd, args, { stdio: 'ignore', detached: true, windowsHide: true, env: { ...process.env, ...env } });
    child.on('error', () => {});
    child.unref();
  } catch {
    // no notifier available: ignore
  }
}

export function notify(title, message) {
  const t = String(title || 'dw').slice(0, 120);
  const m = String(message || '').slice(0, 300);
  if (process.platform === 'win32') {
    // Values go through environment variables, never interpolated into the script.
    const script = [
      '$ErrorActionPreference = "SilentlyContinue"',
      '[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null',
      '$xml = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)',
      '$texts = $xml.GetElementsByTagName("text")',
      '$texts.Item(0).AppendChild($xml.CreateTextNode($env:DW_NOTIFY_TITLE)) > $null',
      '$texts.Item(1).AppendChild($xml.CreateTextNode($env:DW_NOTIFY_MESSAGE)) > $null',
      '$appId = "{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe"',
      '[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($appId).Show([Windows.UI.Notifications.ToastNotification]::new($xml))',
    ].join('; ');
    run('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script], {
      DW_NOTIFY_TITLE: t,
      DW_NOTIFY_MESSAGE: m,
    });
  } else if (process.platform === 'darwin') {
    run('osascript', ['-e', 'on run argv', '-e', 'display notification (item 2 of argv) with title (item 1 of argv)', '-e', 'end run', t, m]);
  } else {
    run('notify-send', [t, m]);
  }
  // Terminal bell as a fallback signal.
  try { process.stderr.write('\x07'); } catch { /* ignore */ }
}

async function readStdin() {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  return raw;
}

async function main() {
  try {
    if (process.argv[2] === '--hook') {
      const input = JSON.parse((await readStdin()) || '{}');
      if (!isDwProject(input.cwd || process.cwd())) return;
      notify(input.title || 'Claude Code — dw', input.message || 'Your input is needed.');
    } else {
      notify(process.argv[2], process.argv.slice(3).join(' '));
      process.stdout.write(`notified: ${process.argv[2] || 'dw'}\n`);
    }
  } catch {
    // never fail the caller
  }
}

main();
