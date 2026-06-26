import { spawn } from 'child_process';
import UlanziApi from './plugin-common-node/index.js';
import * as collector from './collector.js';
import { resolveProvider, costForProvider } from './providers.js';
import { renderCost, renderLoading, renderSetupError, renderNoData } from './renderer.js';
import { ErrorKind } from './codeburn-runner.js';

const PLUGIN_UUID = 'com.narlei.aicost.plugin';
const SETUP_GUIDE_URL = 'https://github.com/narlei/ulanzideck-ai-cost#setup';
const DEFAULT_PERIOD = 'today';

const $UD = new UlanziApi();
const INSTANCES = new Map();

function log(...args) {
  console.log('[ai-cost]', ...args);
}

function periodLabel(period) {
  if (period === 'today') return 'Today';
  if (period === 'week') return 'Last 7d';
  if (period === 'month') return 'This month';
  if (period === '30days') return 'Last 30 days';
  if (period === 'all') return 'All time';
  return period;
}

function pushIcon(context, dataUrl) {
  $UD.setBaseDataIcon(context, dataUrl);
}

function renderForInstance(inst) {
  const { context, provider, period } = inst;
  const limit = Number(inst.settings?.limit) || 0;

  if (!provider) {
    pushIcon(context, renderSetupError({ label: 'Unknown' }));
    return;
  }

  const cache = collector.getCache(period);

  if (!cache) {
    pushIcon(context, renderLoading({ label: provider.label, brand: provider.brand }));
    return;
  }

  if (cache.errorKind && !cache.current) {
    inst.state = 'error';
    inst.errorKind = cache.errorKind;
    pushIcon(context, renderSetupError({ label: provider.label }));
    return;
  }

  inst.state = 'ok';
  inst.errorKind = null;

  const value = costForProvider(provider, cache.current);

  if (value === null) {
    pushIcon(context, renderNoData({
      label: provider.label,
      brand: provider.brand,
      logoFile: provider.logoFile,
    }));
    return;
  }

  const stale = !!cache.errorKind;
  pushIcon(context, renderCost({
    logoFile: provider.logoFile,
    label: provider.label,
    value,
    periodLabel: periodLabel(period),
    brand: provider.brand,
    fetchedAt: cache.fetchedAt,
    stale,
    limit,
  }));
}

function onCollectorUpdate(period, _entry) {
  for (const inst of INSTANCES.values()) {
    if (inst.period === period && inst.active) {
      renderForInstance(inst);
    }
  }
}

collector.subscribe(onCollectorUpdate);

function ensureInstance(context, settings) {
  const period = settings?.period || DEFAULT_PERIOD;
  const provider = resolveProvider(settings);

  let inst = INSTANCES.get(context);
  if (!inst) {
    inst = {
      context,
      provider,
      period,
      settings: settings || {},
      active: true,
      state: 'loading',
      errorKind: null,
    };
    INSTANCES.set(context, inst);
    collector.register(period);
    renderForInstance(inst);
  } else {
    const prevPeriod = inst.period;
    inst.provider = provider;
    inst.period = period;
    inst.settings = settings || inst.settings;

    if (prevPeriod !== period) {
      collector.unregister(prevPeriod);
      collector.register(period);
    }
    renderForInstance(inst);
  }
  return inst;
}

$UD.connect(PLUGIN_UUID);

$UD.onConnected(() => log('connected'));

// Refresh display every 60s to update "Xm ago" without re-running codeburn
setInterval(() => {
  for (const inst of INSTANCES.values()) {
    if (inst.active && inst.state === 'ok') {
      renderForInstance(inst);
    }
  }
}, 60_000);

$UD.onAdd((msg) => {
  log('add', msg.context);
  ensureInstance(msg.context, msg.param || {});
});

$UD.onParamFromApp((msg) => {
  log('paramFromApp', msg.context, msg.param);
  ensureInstance(msg.context, msg.param || {});
});

$UD.onParamFromPlugin((msg) => {
  log('paramFromPlugin', msg.context, msg.param);
  ensureInstance(msg.context, msg.param || {});
});

$UD.onDidReceiveSettings((msg) => {
  log('didReceiveSettings', msg.context, msg.settings || msg.param);
  const settings = msg.settings || msg.param || {};
  ensureInstance(msg.context, settings);
});

$UD.onRun((msg) => {
  const inst = INSTANCES.get(msg.context);
  if (!inst) {
    ensureInstance(msg.context, msg.param || {});
    return;
  }

  if (inst.state === 'error') {
    log('click → open setup guide');
    spawn('open', [SETUP_GUIDE_URL]);
    return;
  }

  log('click → refresh', inst.period);
  if (inst.provider) {
    pushIcon(msg.context, renderLoading({ label: inst.provider.label, brand: inst.provider.brand }));
  }
  collector.refreshNow(inst.period);
});

$UD.onSetActive((msg) => {
  const inst = INSTANCES.get(msg.context);
  if (!inst) return;
  inst.active = !!msg.active;
  if (inst.active) renderForInstance(inst);
});

$UD.onClear((msg) => {
  if (!msg.param) return;
  for (const item of msg.param) {
    const ctx = item.context;
    const inst = INSTANCES.get(ctx);
    if (inst) {
      collector.unregister(inst.period);
      INSTANCES.delete(ctx);
      log('clear', ctx);
    }
  }
});

$UD.onError((err) => log('socket error', err));
$UD.onClose(() => log('socket closed'));
