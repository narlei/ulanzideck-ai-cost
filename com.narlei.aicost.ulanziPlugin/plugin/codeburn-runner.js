import { spawn, spawnSync } from 'child_process';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CODEBURN_CLI = path.join(__dirname, '..', 'node_modules', 'codeburn', 'dist', 'cli.js');
const SPAWN_TIMEOUT_MS = 120_000;
const MIN_NODE_MAJOR = 22;

// process.execPath is UlanziDeck's bundled Node.js (v20) which is too old for codeburn (>=22.13).
// We skip it and probe for a system Node.js instead.
const NODE_CANDIDATES = [
  '/opt/homebrew/bin/node',
  '/usr/local/bin/node',
  '/opt/local/bin/node',
  '/usr/bin/node',
  'node',
];

export const ErrorKind = Object.freeze({
  NODE_NOT_FOUND: 'NODE_NOT_FOUND',
  CODEBURN_FAILED: 'CODEBURN_FAILED',
  TIMEOUT: 'TIMEOUT',
});

let _nodeBin = null;

function nodeMajorVersion(bin) {
  try {
    const r = spawnSync(bin, ['--version'], { encoding: 'utf8', timeout: 5000 });
    if (r.status !== 0 || !r.stdout) return 0;
    const m = r.stdout.trim().match(/^v(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  } catch {
    return 0;
  }
}

function findNode() {
  if (_nodeBin) return _nodeBin;
  for (const candidate of NODE_CANDIDATES) {
    if (!candidate) continue;
    if (candidate !== 'node' && !existsSync(candidate)) continue;
    if (nodeMajorVersion(candidate) >= MIN_NODE_MAJOR) {
      _nodeBin = candidate;
      return _nodeBin;
    }
  }
  return null;
}

export function run(period = 'today') {
  return new Promise((resolve) => {
    const nodeBin = findNode();
    if (!nodeBin) {
      return resolve({ ok: false, kind: ErrorKind.NODE_NOT_FOUND, message: 'Node.js not found' });
    }

    if (!existsSync(CODEBURN_CLI)) {
      return resolve({
        ok: false,
        kind: ErrorKind.CODEBURN_FAILED,
        message: `codeburn cli not found at ${CODEBURN_CLI}`,
      });
    }

    const args = [CODEBURN_CLI, 'status', '--format', 'menubar-json', '--provider', 'all', '--period', period];
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const child = spawn(nodeBin, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PATH: [
          '/opt/homebrew/bin',
          '/usr/local/bin',
          '/usr/bin',
          '/bin',
          process.env.PATH || '',
        ].join(':'),
      },
    });

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, SPAWN_TIMEOUT_MS);

    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (timedOut) {
        return resolve({ ok: false, kind: ErrorKind.TIMEOUT, message: 'codeburn timed out' });
      }
      if (code !== 0) {
        return resolve({
          ok: false,
          kind: ErrorKind.CODEBURN_FAILED,
          message: `exit ${code}: ${stderr.slice(0, 200)}`,
        });
      }
      try {
        const json = JSON.parse(stdout);
        return resolve({ ok: true, data: json });
      } catch (e) {
        return resolve({
          ok: false,
          kind: ErrorKind.CODEBURN_FAILED,
          message: `JSON parse failed: ${e.message}`,
        });
      }
    });

    child.on('error', (e) => {
      clearTimeout(timer);
      resolve({ ok: false, kind: ErrorKind.CODEBURN_FAILED, message: e.message });
    });
  });
}
