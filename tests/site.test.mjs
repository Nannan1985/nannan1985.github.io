import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { mkdtemp, mkdir, readFile, readdir, rm, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { build, normalizeBase, normalizeSiteUrl } from '../scripts/build.mjs';
import { site } from '../config/site.mjs';
import { projects } from '../content/projects.mjs';
import { article } from '../content/notes/cinechroma-atlas.mjs';
import { renderPages } from '../src/templates.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const testRoot = join(projectRoot, '.test-output');
const knownRoutes = ['index.html', 'notes/cinechroma-atlas/index.html', '404.html', 'en/index.html', 'en/notes/cinechroma-atlas/index.html', 'en/404.html'];
const origins = { local: 'http://local.test', deployed: 'https://stillrove.invalid' };
let runRoot;
let variants;

const attributes = (tag) => Object.fromEntries(
  [...tag.matchAll(/([\w:-]+)\s*=\s*(["'])([\s\S]*?)\2/g)]
    .map((match) => [match[1].toLowerCase(), match[3].replaceAll('&amp;', '&')])
);
const tags = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map(([tag]) => attributes(tag));
const escaped = (text) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => entry.isDirectory()
    ? filesUnder(join(directory, entry.name)) : join(directory, entry.name)));
  return nested.flat();
}

function routeURL(route, basePath) {
  return new URL(`${basePath}${route === 'index.html' ? '' : route.replace(/index\.html$/, '')}`, origins.local);
}

function localTarget(url, variant) {
  assert.ok(url.pathname.startsWith(variant.basePath), `Path escapes configured base: ${url.pathname}`);
  let pathname = decodeURIComponent(url.pathname.slice(variant.basePath.length));
  if (!pathname || pathname.endsWith('/')) pathname += 'index.html';
  const file = resolve(variant.outDir, pathname);
  const pathFromOutput = relative(variant.outDir, file);
  assert.ok(!isAbsolute(pathFromOutput) && pathFromOutput !== '..' && !pathFromOutput.startsWith(`..${sep}`), 'Resource escapes output directory');
  return file;
}

async function verifyReference(reference, pageUrl, variant, context) {
  if (!reference || /^(?:data:|mailto:|tel:)/i.test(reference)) return;
  const url = new URL(reference, pageUrl);
  if (url.origin !== origins.local) return;
  const target = localTarget(url, variant);
  assert.ok((await stat(target).catch(() => null))?.isFile(), `${context}: missing ${url.pathname}`);
  if (url.hash && extname(target) === '.html') {
    const targetHtml = await readFile(target, 'utf8');
    const ids = [...targetHtml.matchAll(/\bid\s*=\s*(["'])(.*?)\1/g)].map((match) => match[2]);
    assert.ok(ids.includes(decodeURIComponent(url.hash.slice(1))), `${context}: missing fragment ${url.hash}`);
  }
}

before(async () => {
  await mkdir(testRoot, { recursive: true });
  runRoot = await mkdtemp(join(testRoot, 'static-'));
  variants = [
    { outDir: join(runRoot, 'root'), basePath: '/', siteUrl: '' },
    { outDir: join(runRoot, 'subpath'), basePath: '/portfolio/', siteUrl: origins.deployed }
  ];
  for (const variant of variants) await build(variant);
});

after(async () => {
  if (!runRoot) return;
  const scope = relative(testRoot, runRoot);
  assert.ok(scope && scope !== '..' && !scope.startsWith(`..${sep}`) && !isAbsolute(scope));
  await rm(runRoot, { recursive: true, force: true });
});

test('root and project-path builds contain standalone pages and valid internal links/resources', async () => {
  for (const variant of variants) {
    for (const route of knownRoutes) {
      const html = await readFile(join(variant.outDir, route), 'utf8');
      const pageUrl = routeURL(route, variant.basePath);
      for (const [, tag] of html.matchAll(/(<[a-z][^>]*>)/gi)) {
        const attrs = attributes(tag);
        for (const key of ['href', 'src', 'poster', 'data-image']) {
          if (attrs[key]) await verifyReference(attrs[key], pageUrl, variant, `${route} ${key}`);
        }
        if (attrs.srcset) {
          for (const source of attrs.srcset.split(',')) {
            await verifyReference(source.trim().split(/\s+/)[0], pageUrl, variant, `${route} srcset`);
          }
        }
      }
    }
    for (const file of (await filesUnder(variant.outDir)).filter((name) => name.endsWith('.css'))) {
      const css = await readFile(file, 'utf8');
      const cssUrl = new URL(variant.basePath + relative(variant.outDir, file).split(sep).join('/'), origins.local);
      for (const [, , reference] of css.matchAll(/url\(\s*(["']?)([^)'"\s]+)\1\s*\)/g)) {
        await verifyReference(reference, cssUrl, variant, 'CSS url()');
      }
    }
  }
});

test('local pages omit invented deployment URLs; deployed pages use the origin plus base path', async () => {
  for (const route of knownRoutes) {
    const localHtml = await readFile(join(variants[0].outDir, route), 'utf8');
    assert.equal(tags(localHtml, 'link').filter((tag) => tag.rel === 'canonical').length, 0);
    assert.equal(tags(localHtml, 'meta').filter((tag) => tag.property === 'og:url').length, 0);
    assert.match(localHtml, /<title>[^<]+<\/title>/);
    assert.ok(tags(localHtml, 'meta').some((tag) => tag.name === 'description' && tag.content?.length > 15));
    assert.ok(tags(localHtml, 'link').some((tag) => tag.rel?.includes('icon') && tag.href));
    const deployedHtml = await readFile(join(variants[1].outDir, route), 'utf8');
    if (route === '404.html') continue;
    const expected = new URL(routeURL(route, variants[1].basePath).pathname, origins.deployed).href;
    assert.equal(tags(deployedHtml, 'link').find((tag) => tag.rel === 'canonical')?.href, expected);
    assert.equal(tags(deployedHtml, 'meta').find((tag) => tag.property === 'og:url')?.content, expected);
    const sharing = tags(deployedHtml, 'meta').find((tag) => tag.property === 'og:image')?.content;
    assert.ok(sharing?.startsWith(`${origins.deployed}/portfolio/`), 'Sharing image must use final deployment URL');
    const localShare = new URL(sharing);
    localShare.host = 'local.test';
    localShare.protocol = 'http:';
    await verifyReference(localShare.href, origins.local, variants[1], 'Sharing image');
  }
});

test('deployment inputs reject traversal and mixed origin/path settings', async () => {
  assert.equal(normalizeBase(''), '/', 'GitHub Pages root-site output uses an empty base_path');
  assert.equal(normalizeBase('/portfolio'), '/portfolio/');
  assert.equal(normalizeSiteUrl('https://stillrove.invalid/'), origins.deployed);
  assert.equal(normalizeSiteUrl(''), '');
  for (const base of ['/../', '/portfolio/../', '//outside.invalid/', 'portfolio', '/one?query=1/']) {
    assert.throws(() => normalizeBase(base), `Invalid base accepted: ${base}`);
  }
  for (const origin of ['javascript:alert(1)', 'file:///private', 'https://stillrove.invalid/portfolio/', 'https://stillrove.invalid/?query=1', 'https://user:password@stillrove.invalid']) {
    assert.throws(() => normalizeSiteUrl(origin), `Invalid origin accepted: ${origin}`);
  }
  await assert.rejects(build({ outDir: projectRoot }), /Output must stay/, 'Build must never clear its source directory');
});

test('language pairs share identity and use their respective captures, with matching switches and metadata', async () => {
  for (const variant of variants) {
    for (const path of ['', 'notes/cinechroma-atlas/']) {
      const zh = await readFile(join(variant.outDir, path, 'index.html'), 'utf8');
      const en = await readFile(join(variant.outDir, 'en', path, 'index.html'), 'utf8');
      assert.ok(zh.includes(`data-language-switch href="${variant.basePath}en/${path}"`));
      assert.ok(en.includes(`data-language-switch href="${variant.basePath}${path}"`));
      assert.equal(tags(en, 'meta').find(x => x.name === 'author').content, site.creatorDisplayName);
      assert.ok(en.includes(site.links.cinechroma));
      assert.doesNotMatch(en.replaceAll('中文', ''), /[\u4e00-\u9fff]/, 'English HTML must not leak untranslated UI or diagram labels');
      if (variant.siteUrl) {
        for (const html of [zh, en]) {
          const alternates = tags(html, 'link').filter(x => x.rel === 'alternate');
          assert.equal(alternates.find(x => x.hreflang === 'zh-CN')?.href, `${variant.siteUrl}${variant.basePath}${path}`);
          assert.equal(alternates.find(x => x.hreflang === 'en')?.href, `${variant.siteUrl}${variant.basePath}en/${path}`);
        }
      } else assert.equal(tags(en, 'link').filter(x => x.rel === 'alternate').length, 0);
      const zhImages = tags(zh, 'img').filter(x => x.src);
      const enImages = tags(en, 'img').filter(x => x.src);
      assert.deepEqual(zhImages.map(x => x.src.replace('atlas-hd-', 'atlas-en-hd-')), enImages.map(x => x.src));
      if (!path) {
        assert.equal(enImages.length, 6);
        assert.ok(en.includes('Captured 27 Oct 2026 · Live English interface'));
        assert.ok(zh.includes('2026-10-26 线上实录 · 中文界面'));
        assert.doesNotMatch(zh, /atlas-en-hd-/);
      }
      assert.ok(tags(en, 'meta').find(x => x.property === 'og:image').content.endsWith('/images/share-preview-en.jpg'));
    }
    const enNote = await readFile(join(variant.outDir, 'en/notes/cinechroma-atlas/index.html'), 'utf8');
    assert.ok(enNote.includes(site.collectionSizeEn));
    assert.equal((enNote.match(/class="process-figure /g) || []).length, 4);
    if (variant.siteUrl) {
      const sitemap = await readFile(join(variant.outDir, 'sitemap.xml'), 'utf8');
      assert.equal((sitemap.match(/<loc>/g) || []).length, 4);
      assert.ok(sitemap.includes(`${variant.siteUrl}${variant.basePath}en/notes/cinechroma-atlas/`));
    }
  }
});

test('content and identity come from independent editable sources without fabricated publication dates', async () => {
  const home = await readFile(join(variants[0].outDir, 'index.html'), 'utf8');
  const note = await readFile(join(variants[0].outDir, 'notes/cinechroma-atlas/index.html'), 'utf8');
  for (const html of [home, note]) {
    assert.ok(html.includes(escaped(site.creatorDisplayName)));
    assert.ok(html.includes(site.links[projects[0].linkKey]));
    assert.doesNotMatch(html, /Visual Works/);
    assert.doesNotMatch(html, /article:published_time|datePublished|<time\b/i);
  }
  assert.ok(home.includes(escaped(site.description)));
  assert.ok(home.includes(escaped(article.excerpt)));
  assert.ok(note.includes(escaped(article.title)));
  assert.ok(note.includes(escaped(site.collectionSize)));
  for (const section of article.sections) assert.ok(note.includes(escaped(section.title)));
  assert.equal(article.sections.length, 4);
  assert.doesNotMatch(home, /href=["']mailto:/i);
});

test('editing the configured identity, project link, and collection text changes rendered pages', () => {
  const editedSite = {
    ...site,
    creatorDisplayName: 'Test Author & Studio',
    siteName: 'Test Collection',
    collectionSize: '约 812 部',
    links: { ...site.links, [projects[0].linkKey]: 'https://work.invalid/atlas/' }
  };
  const rendered = renderPages(editedSite, projects, article);
  for (const route of ['index.html', 'notes/cinechroma-atlas/index.html']) {
    const html = rendered.get(route);
    assert.ok(html.includes(escaped(editedSite.creatorDisplayName)), `${route}: author did not update`);
    assert.ok(html.includes('https://work.invalid/atlas/'), `${route}: work URL did not update`);
  }
  assert.ok(rendered.get('notes/cinechroma-atlas/index.html').includes(editedSite.collectionSize));
});

test('pages expose semantic landmarks, readable image alternatives, and zoom-friendly viewport', async () => {
  for (const route of knownRoutes) {
    const html = await readFile(join(variants[0].outDir, route), 'utf8');
    assert.ok(html.includes(`<html lang="${route.startsWith('en/') ? 'en' : 'zh-CN'}">`));
    assert.equal(tags(html, 'main').length, 1);
    assert.equal(tags(html, 'h1').length, 1);
    assert.ok(tags(html, 'nav').length >= 1);
    assert.ok(tags(html, 'a').some((tag) => tag.href?.startsWith('#')), 'Page must offer a skip-to-content anchor');
    const viewport = tags(html, 'meta').find((tag) => tag.name === 'viewport')?.content;
    assert.ok(viewport?.includes('width=device-width'));
    assert.doesNotMatch(viewport, /user-scalable\s*=\s*no|maximum-scale\s*=\s*1(?:\D|$)/i);
    for (const image of tags(html, 'img')) {
      if (image.id === 'dialog-image' && !image.src) continue; // Filled from a described source before opening the dialog.
      assert.ok(image.alt?.trim(), `${route}: missing meaningful image alternative`);
      assert.ok(Number(image.width) > 0 && Number(image.height) > 0, `${route}: missing image dimensions`);
    }
  }
  const html = await readFile(join(variants[0].outDir, 'index.html'), 'utf8');
  const pictures = tags(html, 'img');
  assert.ok(pictures.length >= 2, 'Expected actual overview and detail image');
  assert.equal(pictures[0].fetchpriority, 'high');
  assert.notEqual(pictures[0].loading, 'lazy');
  assert.ok(pictures.slice(1).some((image) => image.loading === 'lazy'));
});

test('published output excludes private source and unsolicited external resource requests', async () => {
  const output = variants[0].outDir;
  for (const file of await filesUnder(output)) {
    const relativeFile = relative(output, file).split(sep).join('/');
    assert.doesNotMatch(relativeFile, /(?:^|\/)(?:node_modules|\.git|\.env|config|content|tests|docs|processor|exports)(?:\/|$)/);
    assert.doesNotMatch(relativeFile, /\.(?:mkv|mp4|mov|sqlite|pem|key|map)$/i);
    if (!/\.(?:html|css|js|json|svg|txt)$/.test(file)) continue;
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(source, /C:\\Users\\|C:\/Users\/|\/Users\/[^/]+\//i, `${relativeFile}: private path leaked`);
    assert.doesNotMatch(source, /github_pat_[A-Za-z0-9_]+|ghp_[A-Za-z0-9]+|AKIA[A-Z0-9]{16}|BEGIN (?:RSA |OPENSSH )?PRIVATE KEY/);
    if (!file.endsWith('.html')) continue;
    assert.doesNotMatch(source, /<iframe\b|<form\b|<video\b/i);
    for (const element of ['img', 'source', 'script', 'link']) {
      for (const tag of tags(source, element)) {
        const reference = tag.src || (element === 'link' && tag.rel !== 'canonical' ? tag.href : null);
        if (!reference || reference.startsWith('data:')) continue;
        assert.equal(new URL(reference, origins.local).origin, origins.local, `${relativeFile}: external ${element} resource`);
      }
    }
  }
});

async function unusedPort() {
  const listener = createServer();
  await new Promise((resolveListen, reject) => {
    listener.once('error', reject);
    listener.listen(0, '127.0.0.1', resolveListen);
  });
  const port = listener.address().port;
  await new Promise((resolveClose) => listener.close(resolveClose));
  return port;
}

test('preview serves direct article URLs, refreshes, assets, redirects, and real 404s under both bases', { timeout: 30000 }, async () => {
  for (const variant of variants) {
    const port = await unusedPort();
    const child = spawn(process.execPath, ['scripts/serve.mjs', '--dir', variant.outDir, '--base', variant.basePath, '--port', String(port)], {
      cwd: projectRoot, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']
    });
    let output = '';
    let spawnError;
    child.on('error', (error) => { spawnError = error; });
    child.stdout.on('data', (data) => { output += data; });
    child.stderr.on('data', (data) => { output += data; });
    const origin = `http://127.0.0.1:${port}`;
    try {
      let ready = false;
      for (let attempt = 0; attempt < 80; attempt += 1) {
        if (spawnError) throw spawnError;
        if (child.exitCode !== null) throw new Error(`Preview exited early: ${output}`);
        try { ready = (await fetch(origin + variant.basePath)).ok; } catch { /* Server may still be starting. */ }
        if (ready) break;
        await delay(100);
      }
      assert.ok(ready, `Preview did not start: ${output}`);
      for (const suffix of ['', 'notes/cinechroma-atlas/', 'notes/cinechroma-atlas/index.html', 'assets/site.css', 'assets/site.js']) {
        const response = await fetch(origin + variant.basePath + suffix);
        assert.equal(response.status, 200, `Preview route: ${variant.basePath}${suffix}`);
        if (suffix.includes('cinechroma-atlas')) assert.ok((await response.text()).includes(escaped(article.title)));
      }
      const refreshed = await fetch(origin + variant.basePath + 'notes/cinechroma-atlas/');
      assert.equal(refreshed.status, 200);
      const head = await fetch(origin + variant.basePath, { method: 'HEAD' });
      assert.equal(head.status, 200);
      assert.equal(await head.text(), '');
      assert.equal((await fetch(origin + variant.basePath, { method: 'POST' })).status, 405);
      const withoutSlash = await fetch(origin + variant.basePath + 'notes/cinechroma-atlas', { redirect: 'manual' });
      assert.ok([301, 302, 307, 308].includes(withoutSlash.status), 'Directory URL should redirect to its slash form');
      const missing = await fetch(origin + variant.basePath + 'this-page-does-not-exist/');
      assert.equal(missing.status, 404);
      assert.ok((await missing.text()).includes(site.creatorDisplayName));
      for (const privatePath of ['.env', '..%2Fconfig%2Fsite.mjs']) {
        const response = await fetch(origin + variant.basePath + privatePath);
        assert.equal(response.status, 404, 'Preview must not expose private or out-of-tree source files');
        assert.doesNotMatch(await response.text(), /export const site/);
      }
      if (variant.basePath !== '/') assert.equal((await fetch(origin + '/notes/cinechroma-atlas/')).status, 404);
    } finally {
      const stopped = new Promise((resolveStop) => child.once('exit', resolveStop));
      child.kill();
      if (child.exitCode === null) await stopped;
    }
  }
});

test('deployment configuration requires an explicit manual trigger and uploads only static output', async () => {
  const draft = await readFile(join(projectRoot, 'docs/deployment/github-pages.yml.example'), 'utf8');
  // The approved second phase may activate this file; that must not break CI.
  const active = await readFile(join(projectRoot, '.github/workflows/github-pages.yml'), 'utf8').catch((error) => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  for (const workflow of [draft, active].filter(Boolean)) {
    assert.match(workflow, /workflow_dispatch:/);
    assert.doesNotMatch(workflow, /^\s+(?:push|pull_request|schedule):/m);
    assert.match(workflow, /path: dist/);
    assert.match(workflow, /needs: build/);
  }
});
