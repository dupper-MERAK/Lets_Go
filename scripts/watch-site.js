const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;

const repoRoot = path.resolve(__dirname, '..');
const siteDir = path.join(repoRoot, '_site');
const previewPath = path.join(repoRoot, 'preview.html');
let building = false;
let queued = false;

async function copyDirRecursive(src, dest) {
  await fsp.mkdir(dest, { recursive: true });
  const entries = await fsp.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) await copyDirRecursive(srcPath, destPath);
    else if (entry.isFile()) await fsp.copyFile(srcPath, destPath);
  }
}

async function syncSiteToBuildOutput() {
  console.log('Syncing source files into _site');
  try {
    await fsp.mkdir(siteDir, { recursive: true });
    await fsp.mkdir(path.join(siteDir, 'assets'), { recursive: true }).catch(() => {});

    const htmlFiles = [];
    for (const base of [repoRoot, path.join(repoRoot, '_layouts'), path.join(repoRoot, '_includes')]) {
      if (!fs.existsSync(base)) continue;
      const entries = await fsp.readdir(base, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.html')) {
          htmlFiles.push(path.join(base, entry.name));
        }
      }
    }
    const rootEntries = await fsp.readdir(repoRoot, { withFileTypes: true });
    for (const entry of rootEntries) {
      if (entry.isFile() && entry.name.endsWith('.html')) {
        htmlFiles.push(path.join(repoRoot, entry.name));
      }
    }

    const seen = new Set();
    for (const file of htmlFiles) {
      const resolved = path.resolve(file);
      if (seen.has(resolved)) continue;
      seen.add(resolved);
      const target = path.join(siteDir, path.basename(file));
      if (fs.existsSync(file)) await fsp.copyFile(file, target);
    }

    if (fs.existsSync(previewPath)) {
      await fsp.copyFile(previewPath, path.join(siteDir, 'preview.html'));
    }

    const assetsSrc = path.join(repoRoot, 'assets');
    if (fs.existsSync(assetsSrc)) {
      await copyDirRecursive(assetsSrc, path.join(siteDir, 'assets'));
    }

    const cssSrc = path.join(repoRoot, 'assets', 'css');
    if (fs.existsSync(cssSrc)) {
      await copyDirRecursive(cssSrc, path.join(siteDir, 'assets', 'css'));
    }

    console.log('Site sync complete');
    return true;
  } catch (err) {
    console.error('Site sync failed:', err);
    return false;
  }
}

async function runBuild() {
  if (building) { queued = true; return; }
  building = true; queued = false;
  try {
    await syncSiteToBuildOutput();
  } catch (err) {
    console.error('Error during site sync:', err);
  } finally {
    building = false;
    if (queued) runBuild();
  }
}

let debounceTimer = null;
function scheduleBuild() { if (debounceTimer) clearTimeout(debounceTimer); debounceTimer = setTimeout(() => runBuild(), 250); }

const watchGlobs = [
  path.join(repoRoot, '**/*.html'),
  path.join(repoRoot, '_case_studies', '**/*.md'),
  path.join(repoRoot, 'assets', '**/*'),
  path.join(repoRoot, 'src', 'scss', '**/*')
];

console.log('Watching all HTML/layout files, markdown, and Sass changes...');
const watcher = chokidar.watch(watchGlobs, {
  ignoreInitial: true,
  ignored: [siteDir]
});
watcher.on('add', p => { console.log('add', p); scheduleBuild(); });
watcher.on('change', p => { console.log('change', p); scheduleBuild(); });
watcher.on('unlink', p => { console.log('unlink', p); scheduleBuild(); });

runBuild();
