// Available currencies
const AVAILABLE_CURRENCIES = [
  { name: 'EURUSD', label: 'Euro to US Dollar', default: true },
  { name: 'EURRUB', label: 'Euro to Russian Ruble', default: true },
  { name: 'USDRUB', label: 'US Dollar to Russian Ruble', default: true },
  { name: 'CADRUB', label: 'Canadian Dollar to Russian Ruble', default: true },
  { name: 'BTCUSD', label: 'Bitcoin to US Dollar', default: true },
  { name: 'GBPUSD', label: 'British Pound to US Dollar', default: false },
  { name: 'JPYUSD', label: 'Japanese Yen to US Dollar', default: false },
  { name: 'AUDUSD', label: 'Australian Dollar to US Dollar', default: false },
];

// Load and display settings
function loadSettings() {
  chrome.storage.sync.get(['selectedCurrencies'], (result) => {
    let selectedCurrencies = result.selectedCurrencies || [];
    
    // If no saved selection, use defaults
    if (selectedCurrencies.length === 0) {
      selectedCurrencies = AVAILABLE_CURRENCIES
        .filter(c => c.default)
        .map(c => c.name);
    }

    displayCurrencies(selectedCurrencies);
  });
}

// Display currency checkboxes
function displayCurrencies(selectedCurrencies) {
  const grid = document.getElementById('currenciesGrid');
  grid.innerHTML = '';

  AVAILABLE_CURRENCIES.forEach(currency => {
    const isSelected = selectedCurrencies.includes(currency.name);
    const label = document.createElement('label');
    label.className = 'checkbox-label';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.name = 'currency';
    checkbox.value = currency.name;
    checkbox.checked = isSelected;
    checkbox.className = 'checkbox-input';

    const labelText = document.createElement('span');
    labelText.className = 'checkbox-text';
    labelText.innerHTML = `<strong>${currency.name}</strong><br><small>${currency.label}</small>`;

    label.appendChild(checkbox);
    label.appendChild(labelText);
    grid.appendChild(label);
  });
}

// Save settings
document.getElementById('saveBtn').addEventListener('click', () => {
  const checkboxes = document.querySelectorAll('input[name="currency"]:checked');
  const selectedCurrencies = Array.from(checkboxes).map(cb => cb.value);

  if (selectedCurrencies.length === 0) {
    showMessage('Please select at least one currency.', 'error');
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
  const defaults = AVAILABLE_CURRENCIES
    .filter(c => c.default)
    .map(c => c.name);
  
  displayCurrencies(defaults);
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
