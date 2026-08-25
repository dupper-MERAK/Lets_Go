const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const matter = require('gray-matter');

const repoRoot = path.resolve(__dirname, '..');
const caseDir = path.join(repoRoot, '_case_studies');
const previewPath = path.join(repoRoot, 'preview.html');
const layoutPath = path.join(repoRoot, '_layouts', 'case_study_detailed.html');
const templatePath = path.join(repoRoot, 'scripts', 'preview-template.html');

function escapeHtml(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function metaCards(metrics) {
  if (!Array.isArray(metrics)) return '';
  return metrics.map((m) => `<div><strong>${escapeHtml(m.value)}</strong><span>${escapeHtml(m.label)}</span></div>`).join('\n');
}

function blockList(items) {
  if (!Array.isArray(items)) return '';
  return items.map((i) => `<div><h3>${escapeHtml(i.title)}</h3><p>${escapeHtml(i.text)}</p></div>`).join('\n');
}

function resultCards(items) {
  if (!Array.isArray(items)) return '';
  return items.map((i) => `<div><strong>${escapeHtml(i.value)}</strong><span>${escapeHtml(i.label)}</span></div>`).join('\n');
}

function galleryHtml(items, title) {
  if (!Array.isArray(items)) return '';
  return items.map((img) => `<figure><img src="${escapeHtml(img)}" alt="${escapeHtml(title)} interface detail"></figure>`).join('\n');
}

function renderFromTemplate(frontMatter) {
  const source = fs.existsSync(templatePath)
    ? fs.readFileSync(templatePath, 'utf8')
    : fs.existsSync(layoutPath)
      ? fs.readFileSync(layoutPath, 'utf8')
      : null;

  if (!source) return null;

  let html = source;

  const replacements = [
    ['{{ page.title }}', escapeHtml(frontMatter.title || '')],
    ['{{ page.summary }}', escapeHtml(frontMatter.summary || '')],
    ['{{ page.category }}', escapeHtml(frontMatter.category || 'Case study')],
    ['{{ page.hero_image }}', escapeHtml(frontMatter.hero_image || '/assets/images/seph-case-study.png')],
    ['{{ page.challenge_title }}', escapeHtml(frontMatter.challenge_title || '')],
    ['{{ page.challenge }}', escapeHtml(frontMatter.challenge || '')],
    ['{{ page.discovery_title }}', escapeHtml(frontMatter.discovery_title || '')],
    ['{{ page.solution_title }}', escapeHtml(frontMatter.solution_title || '')],
    ['{{ page.solution }}', escapeHtml(frontMatter.solution || '')],
    ['{{ page.approach_title }}', escapeHtml(frontMatter.approach_title || '')],
    ['{{ page.quote }}', escapeHtml(frontMatter.quote || '')],
    ['{{ page.quote_attribution }}', escapeHtml(frontMatter.quote_attribution || '')],
    ['{{ page.results_title }}', escapeHtml(frontMatter.results_title || '')],
    ['{{ site.title }}', 'MERAK'],
  ];

  for (const [pattern, value] of replacements) {
    html = html.replace(new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
  }

  html = html.replace(/\{\%\s*for\s+m\s+in\s+page\.metrics[^\%]*\%\}([\s\S]*?)\{\%\s*endfor\s*\%\}/g, metaCards(frontMatter.metrics));
  html = html.replace(/\{\%\s*for\s+item\s+in\s+page\.discovery_points[^\%]*\%\}([\s\S]*?)\{\%\s*endfor\s*\%\}/g, blockList(frontMatter.discovery_points));
  html = html.replace(/\{\%\s*for\s+item\s+in\s+page\.approach_points[^\%]*\%\}([\s\S]*?)\{\%\s*endfor\s*\%\}/g, blockList(frontMatter.approach_points));
  html = html.replace(/\{\%\s*for\s+img\s+in\s+page\.gallery[^\%]*\%\}([\s\S]*?)\{\%\s*endfor\s*\%\}/g, galleryHtml(frontMatter.gallery, frontMatter.title || 'Case Study'));
  html = html.replace(/\{\%\s*for\s+result\s+in\s+page\.results[^\%]*\%\}([\s\S]*?)\{\%\s*endfor\s*\%\}/g, resultCards(frontMatter.results));

  html = html.replace(/\{\{\s*page\.[^\}]+\s*\}\}/g, '');
  html = html.replace(/\{\%[\s\S]*?\%\}/g, '');

  return html;
}

function buildPreviewFromFile(mdPath) {
  try {
    const raw = fs.readFileSync(mdPath, 'utf8');
    const parsed = matter(raw);
    const front = parsed.data || {};

    const rendered = renderFromTemplate(front);
    if (rendered) {
      fs.writeFileSync(previewPath, rendered, 'utf8');
      console.log(`Built preview.html from ${path.basename(mdPath)} using layout/template`);
      return;
    }

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(front.title || 'Case study')}</title>
  <link rel="stylesheet" href="assets/css/main.css">
</head>
<body>
  <article class="case-study-detailed">
    <header class="cs-nav">
      <a class="cs-logo" href="preview.html" aria-label="MERAK home">MERAK<span>Systems</span></a>
      <nav aria-label="Main navigation">
        <a href="#services">Services</a><a href="#work">Our Work</a><a href="#about">About Us</a><a href="#blog">Blog</a>
      </nav>
      <a class="cs-contact" href="mailto:hello@merak.ca">Let's Talk</a>
    </header>
    <main>
      <section class="cs-intro">
        <div class="cs-container cs-intro-grid">
          <div class="cs-intro-copy">
            <p class="cs-kicker">${escapeHtml(front.category || 'Case study')}</p>
            <h1>${escapeHtml(front.title || '')}</h1>
            <p class="cs-lead">${escapeHtml(front.summary || '')}</p>
            <div class="cs-meta">${metaCards(front.metrics)}</div>
          </div>
          <figure class="cs-intro-visual"><img src="${escapeHtml(front.hero_image || '/assets/images/seph-case-study.png')}" alt="${escapeHtml(front.title || 'Case study')} project preview"></figure>
        </div>
      </section>
      <section class="cs-challenge"><div class="cs-container narrow"><p class="cs-kicker">The challenge</p><h2>${escapeHtml(front.challenge_title || '')}</h2><p>${escapeHtml(front.challenge || '')}</p></div></section>
      <section class="cs-discovery section"><div class="cs-container"><p class="cs-kicker">Discovery &amp; planning</p><h2>${escapeHtml(front.discovery_title || '')}</h2><div class="cs-columns">${blockList(front.discovery_points)}</div></div></section>
      <section class="cs-solution"><div class="cs-container"><p class="cs-kicker">The solution</p><h2>${escapeHtml(front.solution_title || '')}</h2><p class="cs-section-lead">${escapeHtml(front.solution || '')}</p><div class="cs-gallery">${galleryHtml(front.gallery, front.title || 'Case Study')}</div></div></section>
      <section class="cs-approach section"><div class="cs-container"><p class="cs-kicker">Our approach</p><h2>${escapeHtml(front.approach_title || '')}</h2><div class="cs-approach-grid"><img src="${escapeHtml(front.hero_image || '/assets/images/seph-case-study.png')}" alt="${escapeHtml(front.title || 'Case study')} project interface"><div>${blockList(front.approach_points)}</div></div></div></section>
      <section class="cs-quote"><div class="cs-container"><blockquote>“${escapeHtml(front.quote || '')}”</blockquote><cite>${escapeHtml(front.quote_attribution || '')}</cite></div></section>
      <section class="cs-results"><div class="cs-container"><p class="cs-kicker">The impact</p><h2>${escapeHtml(front.results_title || '')}</h2><div class="cs-result-grid">${resultCards(front.results)}</div></div></section>
    </main>
    <footer class="cs-footer"><div class="cs-container cs-footer-grid"><div><strong>MERAK</strong><p>17A-218 Silvercreek Parkway N.<br>Suite 356<br>Guelph, Ontario, N1H 8E8</p><p>+1 519.767.1292</p></div><div class="cs-footer-links"><a href="#services">Services</a><a href="#work">Our Work</a><a href="#about">About Us</a><a href="#blog">Blog</a></div><div class="cs-footer-mark">MERAK<span>Systems Corporation</span></div></div><div class="cs-copyright"><div class="cs-container">Copyright 1994 - 2026 MERAK Systems Corporation. All rights reserved.</div></div></footer>
  </article>
</body>
</html>`;

    fs.writeFileSync(previewPath, html, 'utf8');
    console.log(`Built preview.html from ${path.basename(mdPath)}`);
  } catch (err) {
    console.error('Error building preview:', err);
  }
}

function buildDefault() {
  const defaultFile = path.join(caseDir, 'seph-case-study.md');
  if (fs.existsSync(defaultFile)) buildPreviewFromFile(defaultFile);
}

function handleSourceChange(filePath) {
  if (filePath.endsWith('.md')) {
    buildPreviewFromFile(filePath);
    return;
  }

  if (filePath.endsWith('.html')) {
    buildDefault();
  }
}

const previewOnly = process.argv.includes('--once') || process.env.ONCE === '1';

// Preview-only mode writes preview.html and exits. It never starts a watcher and never
// touches src/scss or assets/css, so it cannot overwrite the main stylesheet.
buildDefault();
if (previewOnly) {
  console.log('Built preview (one-off) — preview-only mode exits without starting watchers.');
  process.exit(0);
}

const watchPaths = [
  path.join(caseDir, '**/*.md'),
  path.join(repoRoot, '_layouts', '**/*.html'),
  path.join(repoRoot, '_includes', '**/*.html'),
  path.join(repoRoot, '*.html'),
  path.join(repoRoot, 'scripts', '**/*.html')
];

const watcher = chokidar.watch(watchPaths, {
  ignoreInitial: true,
  ignored: [path.join(repoRoot, '_site')]
});
watcher.on('add', handleSourceChange);
watcher.on('change', handleSourceChange);
watcher.on('unlink', () => buildDefault());

console.log('Watching case-study markdown and all layout HTML files for changes.');
