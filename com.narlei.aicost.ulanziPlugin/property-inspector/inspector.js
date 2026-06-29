$UD.connect();

let currentSettings = {};

$UD.onConnected(() => {
  document.querySelector('.udpi-wrapper').classList.remove('hidden');
  $UD.getSettings();
});

$UD.onParamFromPlugin((msg) => {
  const settings = msg?.payload || msg?.param || {};
  applySettings(settings);
});

$UD.onParamFromApp((msg) => {
  const settings = msg?.payload || msg?.param || {};
  applySettings(settings);
});

function applySettings(settings) {
  currentSettings = settings;
  if (settings.provider) {
    const sel = document.getElementById('provider');
    const opt = [...sel.options].find((o) => o.value === settings.provider);
    if (opt) sel.value = settings.provider;
  }
  if (settings.period) {
    document.getElementById('period').value = settings.period;
  }
  document.getElementById('limit').value = typeof settings.limit === 'number' ? settings.limit : 0;
}

function saveSettings() {
  const limitVal = parseFloat(document.getElementById('limit').value) || 0;
  currentSettings = {
    ...currentSettings,
    provider: document.getElementById('provider').value,
    period: document.getElementById('period').value,
    limit: limitVal,
  };
  $UD.setSettings(currentSettings);
}

document.getElementById('provider').addEventListener('change', saveSettings);
document.getElementById('period').addEventListener('change', saveSettings);
document.getElementById('limit').addEventListener('change', saveSettings);

// Delegated so it survives localizeUI() re-rendering the privacy note innerHTML.
document.addEventListener('click', (e) => {
  if (e.target && e.target.id === 'cb-link') e.preventDefault();
});
