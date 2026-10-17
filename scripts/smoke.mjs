import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { chromium } from 'playwright';
import { distDir, selectScenarios } from './shared.mjs';

const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.ico': 'image/x-icon',
};

function serve(dir) {
  const server = createServer((request, response) => {
    const path = normalize(decodeURIComponent(new URL(request.url, 'http://x').pathname));
    let file = join(dir, path);
    if (!file.startsWith(dir) || !existsSync(file) || statSync(file).isDirectory()) {
      file = join(dir, 'index.html');
    }
    response.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(response);
  });
  return new Promise((resolvePromise) =>
    server.listen(0, '127.0.0.1', () => resolvePromise(server)),
  );
}

async function runStep(page, step) {
  if (step.click) {
    await page.locator(step.click).click({ timeout: 2000 });
  } else if (step.press) {
    await page.keyboard.press(step.press);
  } else if (step.type) {
    await page.keyboard.type(step.type);
  } else if (step.expect) {
    const deadline = Date.now() + 2000;
    let count = await page.locator(step.expect).count();
    while (count !== step.count && Date.now() < deadline) {
      await page.waitForTimeout(50);
      count = await page.locator(step.expect).count();
    }
    if (count !== step.count) {
      throw new Error(`expected ${step.count} × ${step.expect}, found ${count}`);
    }
  } else if (step.text) {
    const deadline = Date.now() + 2000;
    let text = (await page.locator(step.text).textContent())?.trim();
    while (text !== step.equals && Date.now() < deadline) {
      await page.waitForTimeout(50);
      text = (await page.locator(step.text).textContent())?.trim();
    }
    if (text !== step.equals) {
      throw new Error(`expected ${step.text} to read "${step.equals}", got "${text}"`);
    }
  } else if (step.focused) {
    const focused = await page
      .locator(step.focused)
      .evaluate((element) => element === document.activeElement);
    if (!focused) {
      throw new Error(`expected focus on ${step.focused}`);
    }
  }
}

const scenarios = selectScenarios(process.argv.slice(2));
const browser = await chromium.launch();
let failures = 0;

for (const scenario of scenarios) {
  const dir = join(distDir, scenario.id, 'browser');
  if (!existsSync(join(dir, 'index.html'))) {
    console.log(`skip ${scenario.id} (not built)`);
    continue;
  }
  const server = await serve(dir);
  const page = await browser.newPage();
  const errors = [];
  page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
  page.on('pageerror', (error) => errors.push(error.message));
  let failure = null;
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.locator('bench-scenario').waitFor({ state: 'attached' });
    await page.waitForFunction(
      () => document.querySelector('bench-scenario')?.childElementCount > 0,
    );
    for (const [index, step] of scenario.pattern.probe.entries()) {
      try {
        await runStep(page, step);
      } catch (error) {
        failure = `step ${index + 1} ${JSON.stringify(step)}: ${error.message.split('\n')[0]}`;
        break;
      }
    }
  } catch (error) {
    failure = error.message.split('\n')[0];
  }
  if (!failure && errors.length > 0) {
    failure = `console errors: ${errors.join(' | ')}`;
  }
  console.log(`${failure ? 'FAIL' : 'ok  '} ${scenario.id}${failure ? `\n     ${failure}` : ''}`);
  failures += failure ? 1 : 0;
  await page.close();
  server.close();
}

await browser.close();
process.exit(failures > 0 ? 1 : 0);
