// Assemble fully self-contained marketing HTML (inline button CSS + inline icon),
// so Chrome headless renders with zero local-file subresources.
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUILD = path.join(__dirname, '.build');
mkdirSync(BUILD, { recursive: true });

const buttonsCss = readFileSync(path.join(__dirname, 'buttons', 'buttons.css'), 'utf8');
const iconSvg = readFileSync(path.join(__dirname, '..', 'com.narlei.aicost.ulanziPlugin', 'resources', 'icon.svg'));
const iconDataUri = `data:image/svg+xml;base64,${iconSvg.toString('base64')}`;

const pages = ['cover', 'banner1', 'banner2', 'banner3'];
for (const p of pages) {
  let html = readFileSync(path.join(__dirname, p + '.html'), 'utf8');
  // inline buttons.css
  html = html.replace(
    /<link rel="stylesheet" href="buttons\/buttons.css">/,
    `<style>${buttonsCss}</style>`
  );
  // inline icon file path -> data uri (handles the ../com.narlei... url)
  html = html.replace(/url\(\.\.\/com\.narlei[^)]*icon\.svg\)/g, `url(${iconDataUri})`);
  writeFileSync(path.join(BUILD, p + '.html'), html);
}
console.log('built ->', BUILD, pages.join(', '));
