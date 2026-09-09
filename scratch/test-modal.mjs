import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import os from 'os';
import path from 'path';

const tempDir = path.join(os.tmpdir(), 'chrome-modal-' + Date.now());
const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new',
  '--window-size=1440,900',
  '--remote-debugging-port=9666',
  '--user-data-dir=' + tempDir,
  '--disable-gpu',
  '--no-sandbox',
  'about:blank'
]);

await new Promise(r => setTimeout(r, 2000));

try {
  const targets = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9666/json', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  const page = targets.find(t => t.type === 'page');
  const ws = new globalThis.WebSocket(page.webSocketDebuggerUrl);

  await new Promise((resolve) => {
    ws.addEventListener('open', () => {
      ws.send(JSON.stringify({ id: 1, method: 'Page.enable' }));
      ws.send(JSON.stringify({ id: 2, method: 'Runtime.enable' }));
      ws.send(JSON.stringify({ id: 3, method: 'Page.navigate', params: { url: 'http://localhost:5173/#chat' } }));
      resolve();
    });
  });

  ws.addEventListener('message', (e) => {
    const msg = JSON.parse(e.data);
    if (msg.method === 'Runtime.consoleAPICalled') {
      console.log('Console:', msg.params.type, msg.params.args?.map(a => a.value || a.description).join(' '));
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      console.error('Exception:', msg.params.exceptionDetails?.text, msg.params.exceptionDetails?.exception?.description);
    }
  });

  await new Promise(r => setTimeout(r, 2500));

  // Click the Workspaces button
  ws.send(JSON.stringify({
    id: 5,
    method: 'Runtime.evaluate',
    params: {
      expression: `
        const btns = [...document.querySelectorAll('.beebotPillBtn')];
        const wsBtn = btns.find(b => b.textContent.includes('Workspaces'));
        if (wsBtn) wsBtn.click();
      `
    }
  }));

  await new Promise(r => setTimeout(r, 1000));

  // Capture screenshot of Workspaces modal
  ws.send(JSON.stringify({ id: 10, method: 'Page.captureScreenshot', params: { format: 'png' } }));

  const data = await new Promise((resolve) => {
    const handler = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id === 10) {
        ws.removeEventListener('message', handler);
        resolve(msg.result.data);
      }
    };
    ws.addEventListener('message', handler);
  });

  fs.writeFileSync('scratch/workspaces-modal-screenshot.png', Buffer.from(data, 'base64'));
  console.log('Workspaces modal screenshot saved!');
  ws.close();
} catch (e) {
  console.error('Error:', e);
} finally {
  chrome.kill();
}
