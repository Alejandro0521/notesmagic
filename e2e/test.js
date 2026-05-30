const puppeteer = require('puppeteer');
const http = require('http');
const net = require('net');
const { spawn } = require('child_process');

let PORT = process.env.PORT || 0; // 0 means pick a free port if not provided
let SERVER_URL = `http://localhost:${PORT || ''}/`;

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, () => {
      const p = srv.address().port;
      srv.close(err => {
        if (err) return reject(err);
        resolve(p);
      });
    });
    srv.on('error', reject);
  });
}

function waitForServer(url, timeout = 10000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    (function ping() {
      http.get(url, res => {
        resolve();
      }).on('error', () => {
        if (Date.now() - start > timeout) return reject(new Error('Server did not start in time'));
        setTimeout(ping, 200);
      });
    })();
  });
}

(async () => {
  // Determine port and start static server
  if (!process.env.PORT) {
    try {
      PORT = await getFreePort();
    } catch (err) {
      console.error('Failed to find free port, falling back to 8002', err);
      PORT = 8002;
    }
  }
  SERVER_URL = `http://localhost:${PORT}/`;

  const server = spawn('node', ['server.js'], { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, PORT: String(PORT) } });
  server.stdout.on('data', d => {
    process.stdout.write('[server] ' + d.toString());
  });
  server.stderr.on('data', d => {
    process.stderr.write('[server-err] ' + d.toString());
  });

  try {
    await waitForServer(SERVER_URL, 15000);
  } catch (err) {
    console.error('Server failed to start:', err);
    server.kill();
    process.exit(2);
  }

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true,
    protocolTimeout: 60000,
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(60000);

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  page.on('pageerror', err => {
    consoleErrors.push(err.message);
  });

  await page.goto(SERVER_URL, { waitUntil: 'networkidle2', timeout: 60000 });

  // Basic checks
  const selectors = ['#paint-canvas', '#btn-add-notebook', '#notebook-list'];
  for (const sel of selectors) {
    const el = await page.$(sel);
    if (!el) {
      console.error('Missing selector:', sel);
      await browser.close();
      server.kill();
      process.exit(3);
    }
  }

  // Try to open create notebook modal using DOM click to avoid CDP input timeouts
  await page.waitForSelector('#btn-add-notebook', { visible: true, timeout: 10000 });
  await page.evaluate(() => { const el = document.querySelector('#btn-add-notebook'); if (el) el.click(); });
  await page.waitForSelector('#create-notebook-modal', { visible: true, timeout: 5000 }).catch(() => {});

  // Create a notebook via modal if present
  const nameInput = await page.$('#create-notebook-name');
  if (nameInput) {
    await nameInput.click({ clickCount: 3 });
    await nameInput.type('E2E Test Notebook');
    await page.waitForSelector('#btn-confirm-create', { visible: true, timeout: 5000 });
    await page.evaluate(() => { const el = document.querySelector('#btn-confirm-create'); if (el) el.click(); });
    // wait a moment for UI update
    await page.waitForTimeout(500);
  }

  // Collect any console errors
  if (consoleErrors.length > 0) {
    console.error('Console errors detected:');
    consoleErrors.forEach(e => console.error(' -', e));
    await browser.close();
    server.kill();
    process.exit(4);
  }

  console.log('E2E checks passed — no console errors and key selectors present.');

  await browser.close();
  server.kill();
  process.exit(0);
})();
