#!/usr/bin/env node

/**
 * Test Docker deployment for frontend + FastAPI via nginx proxy
 *
 * Checks:
 * 1) Frontend serves onboarding page at /
 * 2) Student creation via POST /api/studyplanner/onboarding/students works through frontend proxy
 *
 * Usage:
 *   node scripts/test_docker_deployment.js [--host HOST] [--port PORT] [--timeout MS]
 * Defaults:
 *   HOST=localhost, PORT=3000, TIMEOUT=30000
 */

const assert = require('assert');
const { setTimeout: sleep } = require('timers/promises');

const DEFAULT_HOST = process.env.FRONTEND_HOST || 'localhost';
const DEFAULT_PORT = Number(process.env.FRONTEND_PORT || 3000);
const DEFAULT_TIMEOUT_MS = Number(process.env.TEST_TIMEOUT_MS || 30000);

function parseArgs(argv) {
  const args = { host: DEFAULT_HOST, port: DEFAULT_PORT, timeout: DEFAULT_TIMEOUT_MS };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if ((a === '--host' || a === '-h') && i + 1 < argv.length) args.host = argv[++i];
    else if ((a === '--port' || a === '-p') && i + 1 < argv.length) args.port = Number(argv[++i]);
    else if ((a === '--timeout' || a === '-t') && i + 1 < argv.length) args.timeout = Number(argv[++i]);
  }
  return args;
}

function now() { return new Date().toISOString(); }

async function waitForHttpOk(url, { timeoutMs, intervalMs = 1000, expectTextIncludes } = {}) {
  const start = Date.now();
  let lastErr;
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { redirect: 'follow' });
      if (res.ok) {
        if (expectTextIncludes) {
          const text = await res.text();
          if (text.toLowerCase().includes(expectTextIncludes.toLowerCase())) return { ok: true, status: res.status };
        } else {
          return { ok: true, status: res.status };
        }
      } else {
        lastErr = new Error(`HTTP ${res.status}`);
      }
    } catch (e) {
      lastErr = e;
    }
    await sleep(intervalMs);
  }
  throw lastErr || new Error(`Timeout waiting for ${url}`);
}

async function verifyOnboardingPage(baseUrl) {
  // Try several likely entry points based on nginx.conf
  const candidates = [
    '/',
    '/onboarding',
    '/onboarding/',
    '/studyplanner',
    '/studyplanner/',
  ];
  let firstErr;
  for (const path of candidates) {
    const url = `${baseUrl}${path}`;
    process.stdout.write(`[${now()}] Checking onboarding page at ${url} ... `);
    try {
      const res = await fetch(url, { redirect: 'follow' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const ct = res.headers.get('content-type') || '';
      const body = await res.text();
      // Heuristic: HTML with some expected tokens
      if (ct.includes('text/html') || body.includes('<html')) {
        console.log('OK');
        return { path, status: res.status };
      }
      throw new Error(`Unexpected content-type: ${ct}`);
    } catch (e) {
      console.log(`failed (${e.message})`);
      firstErr = firstErr || e;
    }
  }
  throw firstErr || new Error('Onboarding page not served on expected routes');
}

function randomStudentBackground() {
  const n = Math.floor(Math.random() * 1e6);
  return {
    name: `Test User ${n}`,
    phone: '9999999999',
    email: `test${n}@example.com`,
    city: 'Metropolis',
    state: 'KA',
    graduation_stream: 'Engineering',
    college: 'Test Institute',
    graduation_year: 2022,
    about: 'Automated test user'
  };
}

async function createStudentThroughFrontend(baseUrl) {
  const url = `${baseUrl}/api/studyplanner/onboarding/students`;
  process.stdout.write(`[${now()}] POST ${url} ... `);
  const payload = randomStudentBackground();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  let json;
  try { json = JSON.parse(text); } catch (e) { throw new Error(`Invalid JSON response: ${text}`); }
  // Expect { student_id: string, created: true }
  assert.ok(json && typeof json.student_id === 'string' && json.student_id.length > 0, 'student_id missing');
  assert.strictEqual(json.created, true, 'created flag should be true');
  console.log('OK');
  return json.student_id;
}

async function main() {
  const { host, port, timeout } = parseArgs(process.argv);
  const baseUrl = `http://${host}:${port}`;

  console.log(`[${now()}] Starting docker deployment test against ${baseUrl}`);

  // 1) Wait for frontend to be up (health and home)
  await waitForHttpOk(`${baseUrl}/health`, { timeoutMs: timeout }).catch(() => Promise.resolve()); // health may not exist in prod
  await waitForHttpOk(baseUrl, { timeoutMs: timeout }).catch(() => Promise.resolve());

  // 2) Verify onboarding page is served
  await verifyOnboardingPage(baseUrl);

  // 3) Verify student creation via frontend proxy
  const studentId = await createStudentThroughFrontend(baseUrl);

  console.log(`[${now()}] All checks passed. student_id=${studentId}`);
}

main().catch(err => {
  console.error(`[${now()}] Deployment test FAILED:`, err.message);
  process.exit(1);
});
