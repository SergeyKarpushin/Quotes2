// Human-readable names for known currency / asset codes.
const CURRENCY_NAMES = {
  USD: 'US Dollar',
  EUR: 'Euro',
  GBP: 'British Pound',
  JPY: 'Japanese Yen',
  CHF: 'Swiss Franc',
  CAD: 'Canadian Dollar',
  AUD: 'Australian Dollar',
  NZD: 'New Zealand Dollar',
  RUB: 'Russian Ruble',
  CNY: 'Chinese Yuan',
  HKD: 'Hong Kong Dollar',
  SGD: 'Singapore Dollar',
  INR: 'Indian Rupee',
  BRL: 'Brazilian Real',
  MXN: 'Mexican Peso',
  ZAR: 'South African Rand',
  TRY: 'Turkish Lira',
  SEK: 'Swedish Krona',
  NOK: 'Norwegian Krone',
  DKK: 'Danish Krone',
  PLN: 'Polish Zloty',
  CZK: 'Czech Koruna',
  HUF: 'Hungarian Forint',
  KRW: 'South Korean Won',
  THB: 'Thai Baht',
  AED: 'UAE Dirham',
  ILS: 'Israeli Shekel',
};

// Forex pairs that can be fetched generically (base + quote ISO codes).
const FOREX_PAIRS = [
  'EURUSD', 'EURRUB', 'USDRUB', 'CADRUB', 'GBPUSD', 'JPYUSD', 'AUDUSD',
  'USDJPY', 'USDCHF', 'USDCAD', 'NZDUSD', 'USDCNY', 'USDHKD', 'USDSGD',
  'USDINR', 'USDBRL', 'USDMXN', 'USDZAR', 'USDTRY', 'USDSEK', 'USDNOK',
  'USDDKK', 'USDPLN', 'USDCZK', 'USDHUF', 'USDKRW', 'USDTHB', 'USDAED',
  'USDILS', 'EURGBP', 'EURJPY', 'EURCHF', 'EURCAD', 'EURAUD', 'GBPJPY',
  'GBPCHF', 'AUDJPY', 'CADJPY', 'EURRUB', 'GBPRUB',
];

// Build the full catalog of known symbols (forex pairs + special assets).
function buildCatalog() {
  const seen = new Set();
  const catalog = [];

  const add = (name, label) => {
    if (seen.has(name)) return;
    seen.add(name);
    catalog.push({ name, label });
  };

  FOREX_PAIRS.forEach((pair) => {
    const base = pair.slice(0, 3);
    const quote = pair.slice(3);
    const baseName = CURRENCY_NAMES[base] || base;
    const quoteName = CURRENCY_NAMES[quote] || quote;
    add(pair, `${baseName} to ${quoteName}`);
  });

  // Non-forex assets with dedicated data sources.
  add('BTCUSD', 'Bitcoin to US Dollar');
  add('BRENTUSD', 'Brent Crude Oil (USD/barrel)');

  return catalog.sort((a, b) => a.name.localeCompare(b.name));
}

const KNOWN_SYMBOLS = buildCatalog();
const SYMBOL_BY_NAME = new Map(KNOWN_SYMBOLS.map((s) => [s.name, s]));

const DEFAULT_CURRENCIES = ['EURUSD', 'EURRUB', 'USDRUB', 'CADRUB', 'BTCUSD', 'BRENTUSD'];

function labelFor(name) {
  if (SYMBOL_BY_NAME.has(name)) return SYMBOL_BY_NAME.get(name).label;
  // Fallback for symbols not in the catalog (e.g. saved from an older version).
  if (/^[A-Z]{6}$/.test(name)) {
    const base = name.slice(0, 3);
    const quote = name.slice(3);
    return `${CURRENCY_NAMES[base] || base} to ${CURRENCY_NAMES[quote] || quote}`;
  }
  return name;
}

// Load and display settings
function loadSettings() {
  chrome.storage.sync.get(['selectedCurrencies'], (result) => {
    let selectedCurrencies = result.selectedCurrencies || [];

    // If no saved selection, use defaults
    if (selectedCurrencies.length === 0) {
      selectedCurrencies = [...DEFAULT_CURRENCIES];
    }

    renderGrid(selectedCurrencies, new Set(selectedCurrencies));
    renderSearchResults('');
  });
}

// Read the symbols currently in the grid and which ones are checked.
function readGridState() {
  const labels = document.querySelectorAll('#currenciesGrid .checkbox-label');
  const symbols = [];
  const checked = new Set();
  labels.forEach((label) => {
    const checkbox = label.querySelector('input[name="currency"]');
    if (!checkbox) return;
    symbols.push(checkbox.value);
    if (checkbox.checked) checked.add(checkbox.value);
  });
  return { symbols, checked };
}

// Render the grid of tracked symbols as checkboxes.
function renderGrid(symbols, checkedSet) {
  const grid = document.getElementById('currenciesGrid');
  grid.innerHTML = '';

  if (symbols.length === 0) {
    grid.innerHTML = '<p class="info-text">No symbols tracked yet. Use the search box above to add some.</p>';
    return;
  }

  symbols.forEach((name) => {
    const label = document.createElement('label');
    label.className = 'checkbox-label';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.name = 'currency';
    checkbox.value = name;
    checkbox.checked = checkedSet.has(name);
    checkbox.className = 'checkbox-input';

    const labelText = document.createElement('span');
    labelText.className = 'checkbox-text';
    const small = document.createElement('small');
    small.textContent = labelFor(name);
    const strong = document.createElement('strong');
    strong.textContent = name;
    labelText.appendChild(strong);
    labelText.appendChild(small);

    label.appendChild(checkbox);
    label.appendChild(labelText);
    grid.appendChild(label);
  });
}

// Render search results for known symbols not already in the grid.
function renderSearchResults(query) {
  const resultsEl = document.getElementById('searchResults');
  const trimmed = query.trim();

  if (!trimmed) {
    resultsEl.innerHTML = '';
    resultsEl.classList.remove('visible');
    return;
  }

  const { symbols: tracked } = readGridState();
  const trackedSet = new Set(tracked);
  const needle = trimmed.toUpperCase();

  const matches = KNOWN_SYMBOLS.filter((symbol) => {
    if (trackedSet.has(symbol.name)) return false;
    return symbol.name.includes(needle) || symbol.label.toUpperCase().includes(needle);
  }).slice(0, 12);

  resultsEl.innerHTML = '';
  resultsEl.classList.add('visible');

  if (matches.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'search-empty';
    empty.textContent = `No known symbols match "${trimmed}".`;
    resultsEl.appendChild(empty);
    return;
  }

  matches.forEach((symbol) => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'search-result';
    row.dataset.symbol = symbol.name;

    const text = document.createElement('span');
    text.className = 'search-result-text';
    const strong = document.createElement('strong');
    strong.textContent = symbol.name;
    const small = document.createElement('small');
    small.textContent = symbol.label;
    text.appendChild(strong);
    text.appendChild(small);

    const add = document.createElement('span');
    add.className = 'search-result-add';
    add.textContent = '+ Add';

    row.appendChild(text);
    row.appendChild(add);
    row.addEventListener('click', () => addSymbol(symbol.name));
    resultsEl.appendChild(row);
  });
}

// Add a symbol to the grid (checked), preserving existing checkbox states.
function addSymbol(name) {
  const { symbols, checked } = readGridState();
  if (!symbols.includes(name)) {
    symbols.push(name);
  }
  checked.add(name);
  renderGrid(symbols, checked);

  // Refresh the search list so the just-added symbol drops off.
  renderSearchResults(document.getElementById('symbolSearch').value);
}

// Search input handler
document.getElementById('symbolSearch').addEventListener('input', (event) => {
  renderSearchResults(event.target.value);
});

// Save settings
document.getElementById('saveBtn').addEventListener('click', () => {
  const checkboxes = document.querySelectorAll('input[name="currency"]:checked');
  const selectedCurrencies = Array.from(checkboxes).map((cb) => cb.value);

  if (selectedCurrencies.length === 0) {
    showMessage('Please select at least one symbol.', 'error');
    return;
  }

  chrome.storage.sync.set({ selectedCurrencies }, () => {
    showMessage('Settings saved successfully!', 'success');

    // Notify background script to refresh quotes with new settings
    chrome.runtime.sendMessage({ action: 'settingsChanged' }, () => {
      console.log('Settings updated, requesting quote refresh');
    });
  });
});

// Reset to default
document.getElementById('resetBtn').addEventListener('click', () => {
  const defaults = [...DEFAULT_CURRENCIES];

  renderGrid(defaults, new Set(defaults));
  document.getElementById('symbolSearch').value = '';
  renderSearchResults('');

  chrome.storage.sync.set({ selectedCurrencies: defaults }, () => {
    showMessage('Reset to default currencies!', 'success');

    // Notify background script
    chrome.runtime.sendMessage({ action: 'settingsChanged' }, () => {
      console.log('Settings reset, requesting quote refresh');
    });
  });
});

// Show message
function showMessage(text, type) {
  const messageEl = document.getElementById('message');
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;

  // Auto-clear success messages after 3 seconds
  if (type === 'success') {
    setTimeout(() => {
      messageEl.textContent = '';
      messageEl.className = 'message';
    }, 3000);
  }
}

// Load settings on page load
document.addEventListener('DOMContentLoaded', loadSettings);
