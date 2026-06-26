// Registry of all supported AI platforms.
// id      → unique internal key (used in settings.provider)
// jsonKey → key in codeburn's current.providers object (lowercase, may have spaces)
// label   → display name on button
// brand   → accent color (hex) — used on value text when no limit is set
// logoFile → file in resources/logos/
// isTotal  → reads current.cost instead of providers[jsonKey]

export const PROVIDERS = [
  {
    id: 'total',
    jsonKey: null,
    label: 'Total',
    brand: '#6366f1',
    logoFile: 'resources/logos/total.svg',
    isTotal: true,
  },
  { id: 'aider',        jsonKey: 'aider',         label: 'Aider',         brand: '#14b014', logoFile: 'resources/logos/aider.svg' },
  { id: 'antigravity',  jsonKey: 'antigravity',   label: 'Antigravity',   brand: '#a78bfa', logoFile: 'resources/logos/antigravity.svg' },
  { id: 'claude',       jsonKey: 'claude',         label: 'Claude',        brand: '#D97706', logoFile: 'resources/logos/claude.svg' },
  { id: 'codex',        jsonKey: 'codex',          label: 'Codex',         brand: '#10b981', logoFile: 'resources/logos/codex.svg' },
  { id: 'continue',     jsonKey: 'continue',       label: 'Continue',      brand: '#0ea5e9', logoFile: 'resources/logos/continue.svg' },
  { id: 'copilot',      jsonKey: 'copilot',        label: 'Copilot',       brand: '#24292e', logoFile: 'resources/logos/copilot.svg' },
  { id: 'cursor',       jsonKey: 'cursor',         label: 'Cursor',        brand: '#3b82f6', logoFile: 'resources/logos/cursor.svg' },
  { id: 'cursor agent', jsonKey: 'cursor agent',   label: 'Cursor Agent',  brand: '#3b82f6', logoFile: 'resources/logos/cursor.svg' },
  { id: 'gemini',       jsonKey: 'gemini',         label: 'Gemini',        brand: '#4285F4', logoFile: 'resources/logos/gemini.svg' },
  { id: 'supermaven',   jsonKey: 'supermaven',     label: 'Supermaven',    brand: '#58C4FF', logoFile: 'resources/logos/supermaven.svg' },
  { id: 'windsurf',     jsonKey: 'windsurf',       label: 'Windsurf',      brand: '#06b6d4', logoFile: 'resources/logos/windsurf.svg' },
];

const BY_ID = new Map(PROVIDERS.map((p) => [p.id, p]));

export function providerById(id) {
  return BY_ID.get(id) || null;
}

export function resolveProvider(settings) {
  if (settings?.provider) {
    return BY_ID.get(settings.provider) || BY_ID.get('claude');
  }
  return BY_ID.get('claude');
}

export function costForProvider(provider, current) {
  if (!current) return null;
  if (provider.isTotal) return typeof current.cost === 'number' ? current.cost : null;
  const v = current.providers?.[provider.jsonKey];
  return typeof v === 'number' ? v : null;
}
