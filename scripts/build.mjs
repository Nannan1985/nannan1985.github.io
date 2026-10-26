import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

export const projectRoot = fileURLToPath(new URL('../', import.meta.url));

export function normalizeBase(value = '/') {
  if (value === '') return '/'; // configure-pages returns an empty base_path for a user site.
  if (typeof value !== 'string' || !/^\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]*\/?$/.test(value)) throw new Error('basePath must be / or a simple absolute path such as /portfolio/.');
  return value === '/' ? '/' : `${value.replace(/\/$/, '')}/`;
}
export function normalizeSiteUrl(value = '') {
  if (!value) return '';
  const parsed = new URL(value);
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.pathname !== '/' || parsed.search || parsed.hash || parsed.username || parsed.password) throw new Error('siteUrl must be an HTTP(S) origin only. Use basePath for the repository path.');
  return parsed.origin;
}

export async function build(options = {}) {
  const suffix = `?build=${Date.now()}-${Math.random()}`;
  const [{ site: sourceSite }, { projects }, { article }, { renderPages }] = await Promise.all([
    import(new URL('../config/site.mjs', import.meta.url) + suffix),
    import(new URL('../content/projects.mjs', import.meta.url) + suffix),
    import(new URL('../content/notes/cinechroma-atlas.mjs', import.meta.url) + suffix),
    import(new URL('../src/templates.mjs', import.meta.url) + suffix)
  ]);
  const site = { ...sourceSite, basePath: normalizeBase(options.basePath ?? process.env.SITE_BASE_PATH ?? sourceSite.basePath), siteUrl: normalizeSiteUrl(options.siteUrl ?? process.env.SITE_URL ?? sourceSite.siteUrl) };
  const outDir = path.resolve(options.outDir || path.join(projectRoot, 'dist'));
  const relative = path.relative(projectRoot, outDir);
  // Only dedicated generated-output trees can ever be cleared by this script.
  if (!/^(dist|\.test-output|test-results)(?:[\\/]|$)/.test(relative) || relative.split(/[\\/]/).includes('..')) throw new Error('Output must stay in dist/, .test-output/ or test-results/ inside this project.');
  if (!projects.length) throw new Error('At least one project is required.');
  for (const item of projects) {
    const link = new URL(item.url || site.links[item.linkKey]);
    if (!['https:', 'http:'].includes(link.protocol)) throw new Error('Project links must use HTTP(S).');
  }
  for (const link of site.contactLinks) {
    if (!/^(https?:|mailto:)/.test(link.url)) throw new Error('Contact links must use HTTPS, HTTP or mailto.');
  }
  const pages = renderPages(site, projects, article);
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  await cp(path.join(projectRoot, 'public'), outDir, { recursive: true });
  for (const [file, html] of pages) {
    const target = path.join(outDir, file);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, html, 'utf8');
  }
  await writeFile(path.join(outDir, '.nojekyll'), '');
  if (site.siteUrl) {
    const home = `${site.siteUrl}${site.basePath}`;
    await writeFile(path.join(outDir, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${home}sitemap.xml\n`);
    const escapeXml = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    const entries = [...pages.keys()].filter(file => file.endsWith('index.html')).map(file => `<url><loc>${escapeXml(home + file.replace(/index\.html$/, ''))}</loc></url>`).join('');
    await writeFile(path.join(outDir, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</urlset>`);
  }
  return { outDir, basePath: site.basePath, siteUrl: site.siteUrl };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const result = await build();
  console.log(`Static build ready: ${result.outDir}\nBase: ${result.basePath}\nCanonical origin: ${result.siteUrl || '(unset — local review)'}`);
}
