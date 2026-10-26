import http from 'node:http';
import path from 'node:path';
import { readFile, stat } from 'node:fs/promises';
import { watch } from 'node:fs';
import { build, normalizeBase, projectRoot } from './build.mjs';
import { site } from '../config/site.mjs';

const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const dev = args.includes('--dev');
const port = Number(option('--port', '4173'));
const basePath = normalizeBase(option('--base', process.env.SITE_BASE_PATH || site.basePath));
const root = path.resolve(option('--dir', path.join(projectRoot, 'dist')));
let pending = dev ? build({ outDir: root, basePath }) : Promise.resolve();
await pending;
try { await stat(path.join(root, 'index.html')); } catch { throw new Error('No built site. Run node scripts/build.mjs first, or use --dev.'); }
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8' };
const server = http.createServer(async (req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, { Allow: 'GET, HEAD' }); res.end(); return; }
  try {
    await pending;
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (basePath !== '/' && pathname === basePath.slice(0, -1)) { res.writeHead(308, { Location: basePath }); res.end(); return; }
    if (!pathname.startsWith(basePath) || pathname.includes('\\') || pathname.includes('\0')) throw new Error('Missing');
    let file = path.resolve(root, pathname.slice(basePath.length));
    const relative = path.relative(root, file);
    if (relative.startsWith('..') || path.isAbsolute(relative) || relative.split(/[\\/]/).some(part => part.startsWith('.'))) throw new Error('Missing');
    const info = await stat(file);
    if (info.isDirectory()) {
      if (!pathname.endsWith('/')) { res.writeHead(308, { Location: `${pathname}/${new URL(req.url, 'http://localhost').search}` }); res.end(); return; }
      file = path.join(file, 'index.html');
    }
    const buffer = await readFile(file);
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Content-Length': buffer.length, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : buffer);
  } catch {
    const errorPage = await readFile(path.join(root, '404.html')).catch(() => Buffer.from('Not found'));
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(req.method === 'HEAD' ? undefined : errorPage);
  }
});
server.listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${port}${basePath}\n${dev ? 'Watching source files; refresh browser after edits.' : 'Serving static build.'} Press Ctrl+C to stop.`));
if (dev) {
  let timer;
  for (const folder of ['config', 'content', 'src', 'public']) {
    watch(path.join(projectRoot, folder), { recursive: true }, () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        pending = pending.catch(() => {}).then(() => build({ outDir: root, basePath })).then(() => console.log('Rebuilt. Refresh browser.')).catch(error => { console.error(error.message); });
      }, 150);
    });
  }
}
