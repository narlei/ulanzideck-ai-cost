import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = path.join(__dirname, '..');

const SIZE = 200;
const BG = '#1a1a1e';
const TRACK = '#2c2c33';
const TEXT = '#ffffff';
const MUTED = '#888899';
const SHADOW = 'rgba(0,0,0,0.8)';
const MIN_BAR_RATIO = 0.04;

const THRESHOLD_COLORS = [
  { at: 0.95, fill: '#e3434c' },
  { at: 0.85, fill: '#e8893c' },
  { at: 0.60, fill: '#e3b341' },
  { at: 0.00, fill: '#3ecf6b' },
];

function thresholdColor(ratio) {
  for (const t of THRESHOLD_COLORS) {
    if (ratio >= t.at) return t.fill;
  }
  return THRESHOLD_COLORS[THRESHOLD_COLORS.length - 1].fill;
}

const logoCache = new Map();

function loadLogo(logoFile) {
  if (logoCache.has(logoFile)) return logoCache.get(logoFile);
  const abs = path.join(PLUGIN_ROOT, logoFile);
  if (!existsSync(abs)) { logoCache.set(logoFile, null); return null; }
  const data = readFileSync(abs);
  const ext = path.extname(abs).toLowerCase();
  const mime = ext === '.svg' ? 'image/svg+xml' : 'image/png';
  const b64 = `data:${mime};base64,${data.toString('base64')}`;
  logoCache.set(logoFile, b64);
  return b64;
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function svgDoc(body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}">${body}</svg>`;
}

function toDataUrl(svg) {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function text(t, x, y, fontSize, weight = '700', anchor = 'middle', fill = TEXT) {
  const escaped = escapeXml(t);
  return `<text x="${x}" y="${y}" font-family="-apple-system,Helvetica,Arial,sans-serif" font-size="${fontSize}" font-weight="${weight}" text-anchor="${anchor}" fill="${fill}">${escaped}</text>`;
}

function textShadowed(t, x, y, fontSize, weight = '700', anchor = 'middle', fill = TEXT) {
  const escaped = escapeXml(t);
  const f = `-apple-system,Helvetica,Arial,sans-serif`;
  return (
    `<text x="${x + 1}" y="${y + 1}" font-family="${f}" font-size="${fontSize}" font-weight="${weight}" text-anchor="${anchor}" fill="${SHADOW}">${escaped}</text>` +
    `<text x="${x}" y="${y}" font-family="${f}" font-size="${fontSize}" font-weight="${weight}" text-anchor="${anchor}" fill="${fill}">${escaped}</text>`
  );
}

function formatCost(value) {
  if (value === null || value === undefined) return '—';
  if (value === 0) return '$0.00';
  if (value > 0 && value < 0.005) return '<$0.01';
  return `$${value.toFixed(2)}`;
}

function formatAgo(fetchedAt) {
  if (!fetchedAt) return '';
  const diffMin = Math.floor((Date.now() - fetchedAt) / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  return `${Math.floor(diffMin / 60)}h ago`;
}

function logoEl(logoFile, cx, cy, size) {
  const dataUrl = logoFile ? loadLogo(logoFile) : null;
  if (!dataUrl) return '';
  const half = size / 2;
  return `<image href="${dataUrl}" x="${cx - half}" y="${cy - half}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet"/>`;
}

function accentStripe(brand) {
  return `<rect x="0" y="0" width="${SIZE}" height="4" fill="${escapeXml(brand)}"/>`;
}

export function renderCost({ logoFile, label, value, periodLabel, brand, fetchedAt, stale, limit }) {
  const hasLimit = typeof limit === 'number' && limit > 0;
  const costStr = formatCost(value);
  const agoStr = fetchedAt ? formatAgo(fetchedAt) : '';
  const nameStr = periodLabel ? `${label} ${periodLabel}` : label;

  let bgEl, valueColor;

  if (hasLimit) {
    const safeValue = typeof value === 'number' ? value : 0;
    const ratio = Math.min(safeValue / limit, 1);
    const fillRatio = Math.max(ratio, MIN_BAR_RATIO);
    const barW = Math.round(SIZE * fillRatio);
    const barColor = thresholdColor(ratio);

    bgEl = [
      `<rect x="0" y="0" width="${SIZE}" height="${SIZE}" fill="${BG}"/>`,
      `<rect x="0" y="0" width="${SIZE}" height="${SIZE}" fill="${TRACK}"/>`,
      `<rect x="0" y="0" width="${barW}" height="${SIZE}" fill="${barColor}"/>`,
    ].join('');
    valueColor = TEXT;
  } else {
    bgEl = [
      `<rect x="0" y="0" width="${SIZE}" height="${SIZE}" fill="${BG}"/>`,
      accentStripe(brand),
    ].join('');
    valueColor = brand;
  }

  const staleIndicator = stale
    ? `<circle cx="${SIZE - 14}" cy="14" r="5" fill="#e3b341" stroke="${BG}" stroke-width="1.5"/>`
    : '';

  const body = [
    bgEl,
    logoEl(logoFile, SIZE / 2, 36, 42),
    textShadowed(nameStr, SIZE / 2, 88, 22, '600'),
    textShadowed(costStr, SIZE / 2, 138, 40, '700', 'middle', valueColor),
    agoStr ? textShadowed(agoStr, SIZE / 2, 185, 20, '400') : '',
    staleIndicator,
  ].join('');

  return toDataUrl(svgDoc(body));
}

export function renderLoading({ label, brand = '#6366f1' }) {
  const body = [
    `<rect x="0" y="0" width="${SIZE}" height="${SIZE}" fill="${BG}"/>`,
    accentStripe(brand),
    text('…', SIZE / 2, SIZE / 2 + 20, 52, '400', 'middle', MUTED),
    textShadowed(label, SIZE / 2, 158, 22, '600'),
  ].join('');
  return toDataUrl(svgDoc(body));
}

export function renderSetupError({ label }) {
  const body = [
    `<rect x="0" y="0" width="${SIZE}" height="${SIZE}" fill="${BG}"/>`,
    `<rect x="0" y="0" width="${SIZE}" height="4" fill="#e3b341"/>`,
    text('⚠', SIZE / 2, 90, 52, '400', 'middle', '#e3b341'),
    textShadowed('Setup', SIZE / 2, 136, 26, '700'),
    text(label, SIZE / 2, 162, 18, '500', 'middle', MUTED),
    text('Click for guide', SIZE / 2, 186, 13, '400', 'middle', '#e3b341'),
  ].join('');
  return toDataUrl(svgDoc(body));
}

export function renderNoData({ label, brand = '#4a4a52', logoFile }) {
  const body = [
    `<rect x="0" y="0" width="${SIZE}" height="${SIZE}" fill="${BG}"/>`,
    accentStripe(brand),
    logoEl(logoFile, SIZE / 2, 58, 46),
    textShadowed(label, SIZE / 2, 102, 22, '600'),
    text('—', SIZE / 2, 150, 44, '400', 'middle', MUTED),
    text('no data', SIZE / 2, 176, 16, '400', 'middle', MUTED),
  ].join('');
  return toDataUrl(svgDoc(body));
}
