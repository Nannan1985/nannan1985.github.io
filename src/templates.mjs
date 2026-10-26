// Build-only import: refresh the editorial diagram module during watched rebuilds.
const { processFigure } = await import(`./process-figures.mjs?build=${Date.now()}`);
export const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

const { translator } = await import(`../content/ui.mjs?build=${Date.now()}`);
const english = await import(`../content/en.mjs?build=${Date.now()}`);

export function renderPages(site, projects, article) {
  const pages = renderLocale(site, projects, article, 'zh');
  const englishProjects = projects.map((project, index) => {
    if (index > 0) {
      if (!project.en) throw new Error(`English project copy is required for ${project.id}`);
      return { ...project, ...project.en };
    }
    const scenes = project.scenes.map(scene => {
      const copy = english.sceneCopy[scene.stem];
      if (!copy) throw new Error(`English scene copy is required for ${scene.stem}`);
      return { ...scene, ...copy, version: english.captureVersion };
    });
    return { ...project, ...english.projectCopy, scenes, overview: scenes[0], detail: scenes[3] };
  });
  const enSite = { ...site, ...english.siteCopy, locale: 'en', collectionSize: site.collectionSizeEn };
  for (const [route, html] of renderLocale(enSite, englishProjects, english.article, 'en')) pages.set(route, html);
  return pages;
}

function renderLocale(site, projects, article, locale) {
  const t = translator(locale);
  const prefix = locale === 'en' ? 'en/' : '';
  const e = escapeHtml;
  const assetUrl = path => `${site.basePath}${path}`;
  const url = path => assetUrl(prefix + path);
  const absolute = path => site.siteUrl ? `${site.siteUrl}${url(path)}` : url(path);
  const project = projects[0];
  const projectLink = item => item.url || site.links[item.linkKey];
  const paragraph = text => e(text.replaceAll('{collectionSize}', site.collectionSize));
  const icon = '<span aria-hidden="true">↗</span>';
  const contacts = site.contactLinks.map(link => `<a href="${e(link.url)}">${e(link.label)} ${icon}</a>`).join('');
  const notePath = `notes/${article.slug}/`;

  function header(isHome, isArticle = false) {
    const path = isArticle ? notePath : isHome ? '' : '404.html';
    const languages = `<nav class="language-switch" aria-label="${t('语言')}">${locale === 'en' ? `<a data-language-switch href="${assetUrl(path)}" lang="zh-CN" hreflang="zh-CN">中文</a><span lang="en" aria-current="true">EN</span>` : `<span lang="zh-CN" aria-current="true">中文</span><a data-language-switch href="${assetUrl('en/' + path)}" lang="en" hreflang="en">EN</a>`}</nav>`;
    return `<a class="skip-link" href="#main">${t('跳到主要内容')}</a>
<header class="site-header shell">
  <a class="brand" href="${url('')}" aria-label="${e(site.siteName)} ${t('首页')}"><span class="wordmark">${e(site.siteName)}</span><span class="brand-subtitle" lang="en">${e(site.subtitle)}</span></a>
  <nav class="primary-nav" aria-label="${t('主导航')}"><a href="${isHome ? '' : url('')}#works">${t('作品')}</a><a href="${isHome ? '' : url('')}#notes"${isArticle ? ' aria-current="page"' : ''}>${t('创作手记')}</a><a href="${isHome ? '' : url('')}#about">${t('关于')}</a>${contacts ? `<a href="${url('')}#contact">${t('联系')}</a>` : ''}</nav>${languages}
</header>`;
  }
  function footer() {
    return `<footer class="site-footer shell"><a href="${url('')}" class="footer-brand">${e(site.siteName)}</a><span>${t('个人观察与可视化尝试')}</span><span lang="en">by ${e(site.creatorDisplayName)}</span></footer>`;
  }
  function head(title, description, path, type = 'website') {
    return `<!doctype html>
<html lang="${e(site.locale)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#151615">
<title>${e(title)}</title>
<meta name="description" content="${e(description)}">
<meta name="author" content="${e(site.creatorDisplayName)}">
<meta property="og:site_name" content="${e(site.siteName)}">
<meta property="og:type" content="${type}">
<meta property="og:title" content="${e(title)}">
<meta property="og:description" content="${e(description)}">
<meta property="og:locale" content="${locale === 'en' ? 'en_US' : 'zh_CN'}">
<meta property="og:image" content="${e((site.siteUrl || '') + assetUrl(site.shareImage || 'images/share-preview.jpg'))}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="675">
<meta property="og:image:alt" content="${e(project.overview.alt)} ${e(project.overview.version)}">
<meta name="twitter:card" content="summary_large_image">
${site.siteUrl ? `<link rel="alternate" hreflang="zh-CN" href="${e(site.siteUrl + assetUrl(path))}">\n<link rel="alternate" hreflang="en" href="${e(site.siteUrl + assetUrl('en/' + path))}">\n<link rel="alternate" hreflang="x-default" href="${e(site.siteUrl + assetUrl(path))}">\n<link rel="canonical" href="${e(absolute(path))}">\n<meta property="og:url" content="${e(absolute(path))}">` : ''}
<link rel="icon" href="${assetUrl('assets/favicon.svg')}" type="image/svg+xml">
<link rel="stylesheet" href="${assetUrl('assets/site.css')}">
<script src="${assetUrl('assets/site.js')}" defer></script>
</head>`;
  }
  function picture(asset, { priority = false, size = '(min-width: 1680px) 1568px, (min-width: 720px) calc(100vw - 96px), calc(100vw - 32px)' } = {}) {
    const sources = (asset.widths || [640, 960, 1440, 1920]).map(w => `${assetUrl(`images/${asset.stem}-${w}.webp`)} ${w}w`).join(', ');
    return `<img src="${assetUrl(`images/${asset.stem}-960.webp`)}" srcset="${sources}" sizes="${size}" width="${asset.width}" height="${asset.height}" alt="${e(asset.alt)}" ${priority ? 'fetchpriority="high" loading="eager"' : 'loading="lazy"'} decoding="async">`;
  }
  function figure(asset, priority = false) {
    return `<figure class="work-figure"><button class="image-trigger" type="button" data-image="${assetUrl(`images/${asset.stem}-${asset.width}.webp`)}" data-alt="${e(asset.alt)}" data-caption="${e(asset.caption)} · ${e(asset.version)}" data-width="${asset.width}" data-height="${asset.height}" aria-label="${t('放大查看：')}${e(asset.caption)}" aria-haspopup="dialog">${picture(asset, { priority })}<span class="image-hint" aria-hidden="true">${t('查看大图')} <span>＋</span></span></button><figcaption><span>${e(asset.caption)}</span><span>${e(asset.version)}</span></figcaption></figure>`;
  }
  const dialog = `<dialog class="image-dialog" aria-labelledby="image-dialog-title"><div class="dialog-bar"><p id="image-dialog-title">${t('作品图')}</p><button class="dialog-zoom" data-original-label="${t('原始尺寸')}" data-fit-label="${t('适合窗口')}" type="button" aria-pressed="false">${t('原始尺寸')}</button><button class="dialog-close" type="button" aria-label="${t('关闭大图')}">${t('关闭')} <span aria-hidden="true">×</span></button></div><div class="dialog-image-wrap"><img id="dialog-image" width="1920" height="1080" alt=""></div><p class="dialog-help">${t('可使用浏览器缩放查看细节 · 按 Esc 或点击关闭返回')}</p></dialog>`;

  const home = `${head(`${site.siteName} — ${site.subtitle}`, site.description, '')}
<body>${header(true)}
<main id="main" tabindex="-1">
  <div class="site-intro shell"><p>${e(site.description)}</p><span lang="en">A personal place for curious eyes.</span></div>
  <section id="works" class="featured shell" aria-labelledby="work-title">
    <div class="section-kicker"><span lang="en">SELECTED WORK</span><span>01</span></div>
    <div class="work-heading"><div><p class="work-type">${e(project.type)}</p><h1 id="work-title">${e(project.title)}</h1>${locale === 'zh' ? `<p class="english-title" lang="en">${e(project.englishTitle)}</p>` : ''}</div><div class="work-introduction"><p>${e(project.description)}</p><p class="work-status"><span aria-hidden="true"></span>${e(project.status)}</p><div class="actions"><a class="button button-primary" href="${e(projectLink(project))}">${t('进入作品')} ${icon}</a><a class="text-link" href="${url(project.notePath)}">${t('阅读创作手记')} <span aria-hidden="true">→</span></a></div></div></div>
    <div class="scroll-story" data-scroll-story data-static-label="${t('静态阅读')}" data-motion-label="${t('恢复动效')}" data-reduced-label="${t('已减少动效')}" data-scroll-instruction="${t('向下滚动 · 六个关键视角 · 也可点选章节')}" data-static-instruction="${t('六个关键视角 · 作品内有完整 11 步导览')}">
      <div class="story-sticky">
        <div class="story-toolbar"><p class="story-instruction" data-story-instruction>${t('六个关键视角 · 作品内有完整 11 步导览')}</p><button class="motion-toggle" type="button" data-motion-toggle aria-pressed="false" hidden>${t('静态阅读')}</button></div>
        <nav class="story-chapters" aria-label="${t('作品介绍章节')}" hidden>${project.scenes.map((scene, i) => `<button type="button" data-story-jump="${i}"><span>${String(i + 1).padStart(2, '0')}</span> ${e(scene.label)}</button>`).join('')}</nav>
        <div class="story-scenes">
          ${project.scenes.map((scene, i) => `<section class="story-scene" data-scene="${i}" aria-labelledby="scene-title-${i}">
            ${figure(scene, i === 0)}
            <div class="story-copy"><span class="story-index">${String(i + 1).padStart(2, '0')} <span>/ ${e(scene.label)}</span></span><div><h2 id="scene-title-${i}">${e(scene.heading)}</h2><p>${e(scene.description)}</p></div></div>
          </section>`).join('')}
        </div>
        <div class="story-bottom"><div class="story-progress" aria-hidden="true"><span></span></div><a class="text-link" href="${e(projectLink(project))}">${t('亲自探索影色星图')} ${icon}</a></div>
      </div>
    </div>
  </section>
  ${projects.length > 1 ? `<section class="additional-work reading" aria-labelledby="more-work-title"><h2 id="more-work-title">${t('更多作品')}</h2>${projects.slice(1).map(item => `<article><h3><a class="text-link" href="${e(projectLink(item))}">${e(item.title)} ${icon}</a></h3><p>${e(item.description)}</p></article>`).join('')}</section>` : ''}
  <section id="notes" class="notes-section reading" aria-labelledby="notes-title"><div class="section-label"><span lang="en">FIELD NOTES</span><h2 id="notes-title">${t('创作手记')}</h2></div><article class="note-preview"><p class="note-category">${t('关于')} ${e(project.title)}</p><h3><a href="${url(notePath)}">${e(article.title)}</a></h3><p>${e(article.excerpt)}</p><a class="text-link" href="${url(notePath)}">${t('阅读手记')} <span aria-hidden="true">→</span></a></article></section>
  <section id="about" class="about-section reading" aria-labelledby="about-title"><div class="section-label"><span lang="en">ABOUT</span><h2 id="about-title">${t('关于这里')}</h2></div><p>${e(site.about)}</p><span class="signature" lang="en">${e(site.creatorDisplayName)}</span>${contacts ? `<div id="contact" class="contact-links" aria-label="${t('联系')}">${contacts}</div>` : ''}</section>
</main>${footer()}${dialog}</body></html>`;

  const note = `${head(`${article.title} — ${site.siteName}`, article.excerpt, notePath, 'article')}
<body class="article-page">${header(false, true)}<main id="main" tabindex="-1"><article>
<header class="article-header reading"><a class="back-link" href="${url('')}#notes"><span aria-hidden="true">←</span> ${t('返回主页')}</a><p class="eyebrow">${t('创作手记')} <span aria-hidden="true">/</span> ${e(project.englishTitle)}</p><h1>${e(article.title)}</h1><p class="article-byline" lang="en">by ${e(site.creatorDisplayName)}</p><p class="article-lead">${e(article.introduction)}</p></header>

<div class="article-body reading"><nav class="article-toc" aria-label="${t('文章目录')}"><span>${t('本文内容')}</span><ol>${article.sections.map(section => `<li><a href="#${e(section.id)}">${e(section.title)}</a></li>`).join('')}</ol></nav>${article.sections.map((section, i) => `<section id="${e(section.id)}"><span class="section-number" aria-hidden="true">0${i + 1}</span><h2>${e(section.title)}</h2>${processFigure(section.id, locale)}${section.paragraphs.map(text => `<p>${paragraph(text)}</p>`).join('')}</section>`).join('')}<div class="article-end"><p>${t('从文字回到图像。')}</p><div class="actions"><a class="button button-primary" href="${e(projectLink(project))}">${t('进入影色星图')} ${icon}</a><a class="text-link" href="${url('')}">${t('返回主页')} <span aria-hidden="true">→</span></a></div></div></div>
</article></main>${footer()}${dialog}</body></html>`;
  const notFound = `${head(`${t('页面未找到')} — ${site.siteName}`, `${site.siteName} · ${t('继续探索作品与创作手记。')}`, '404.html')}<body>${header(false)}<main id="main" tabindex="-1" class="reading not-found"><p class="eyebrow">404</p><h1>${t('这页暂时不在这里。')}</h1><p>${t('地址可能有误，可以从主页继续探索。')}</p><a class="button button-primary" href="${url('')}">${t('返回主页')} <span aria-hidden="true">→</span></a></main>${footer()}</body></html>`;
  return new Map([[`${prefix}index.html`, home], [`${prefix}${notePath}index.html`, note], [`${prefix}404.html`, notFound]]);
}
