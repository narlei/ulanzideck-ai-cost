// Generates REAL deck button SVGs using the plugin's own renderer.js,
// so the marketing images match exactly what shows on the Ulanzi deck.
import { writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { renderCost } from '../com.narlei.aicost.ulanziPlugin/plugin/renderer.js';
import { PROVIDERS, providerById } from '../com.narlei.aicost.ulanziPlugin/plugin/providers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'buttons');
import { mkdirSync } from 'fs';
mkdirSync(OUT, { recursive: true });

const now = Date.now();

// dataUrl -> raw svg string
function svgFromDataUrl(u) {
  const b64 = u.replace('data:image/svg+xml;base64,', '');
  return Buffer.from(b64, 'base64').toString('utf8');
}

function emit(name, dataUrl) {
  const svg = svgFromDataUrl(dataUrl);
  writeFileSync(path.join(OUT, name + '.svg'), svg);
}

const P = (id) => providerById(id);

// --- No-limit buttons (dark bg, brand stripe, logo, $ in brand color) ---
emit('claude', renderCost({ ...P('claude'),  logoFile: P('claude').logoFile,  label: 'Claude', value: 24.61, periodLabel: 'Today',      brand: P('claude').brand,  fetchedAt: now }));
emit('cursor', renderCost({ ...P('cursor'),  logoFile: P('cursor').logoFile,  label: 'Cursor', value: 707.75, periodLabel: 'Month',     brand: P('cursor').brand,  fetchedAt: now }));
emit('total',  renderCost({ ...P('total'),   logoFile: P('total').logoFile,   label: 'Total',  value: 781.78, periodLabel: 'All time',  brand: P('total').brand,   fetchedAt: now }));
emit('codex',  renderCost({ ...P('codex'),   logoFile: P('codex').logoFile,   label: 'Codex',  value: 48.90,  periodLabel: '7 days',    brand: P('codex').brand,   fetchedAt: now }));
emit('gemini', renderCost({ ...P('gemini'),  logoFile: P('gemini').logoFile,  label: 'Gemini', value: 21.05,  periodLabel: 'Month',     brand: P('gemini').brand,  fetchedAt: now }));
emit('copilot',renderCost({ ...P('copilot'), logoFile: P('copilot').logoFile, label: 'Copilot',value: 10.00,  periodLabel: 'Month',     brand: P('copilot').brand, fetchedAt: now }));
emit('windsurf',renderCost({ ...P('windsurf'), logoFile: P('windsurf').logoFile, label: 'Windsurf', value: 33.20, periodLabel: 'Month',  brand: P('windsurf').brand, fetchedAt: now }));

// --- Limit / progress-bar buttons (horizontal fill, threshold colors) ---
// limit 80 -> 25% green, 55% yellow, 80% orange, 100% red
emit('limit-25', renderCost({ ...P('claude'), logoFile: P('claude').logoFile, label: 'Claude', value: 20, periodLabel: 'Today', brand: P('claude').brand, fetchedAt: now, limit: 80 }));
emit('limit-55', renderCost({ ...P('claude'), logoFile: P('claude').logoFile, label: 'Claude', value: 44, periodLabel: 'Today', brand: P('claude').brand, fetchedAt: now, limit: 80 }));
emit('limit-80', renderCost({ ...P('claude'), logoFile: P('claude').logoFile, label: 'Claude', value: 64, periodLabel: 'Today', brand: P('claude').brand, fetchedAt: now, limit: 80 }));
emit('limit-100',renderCost({ ...P('claude'), logoFile: P('claude').logoFile, label: 'Claude', value: 80, periodLabel: 'Today', brand: P('claude').brand, fetchedAt: now, limit: 80 }));

console.log('done -> resources/buttons/*.svg');
