function formatQuoteValue(pair, value) {
  if (pair === 'BTCUSD' || pair === 'BRENTUSD') {
    return value.toFixed(2);
  }

  return value.toFixed(4);
}

function getDetailsUrl(pair) {
  if (pair === 'BRENTUSD') {
    return 'https://www.investing.com/commodities/brent-oil';
  }

  const base = pair.slice(0, 3).toLowerCase();
  const quote = pair.slice(3).toLowerCase();
  return `https://www.investing.com/currencies/${base}-${quote}`;
}

function extractHistoryValues(history) {
  if (!history || history.length === 0) return [];
  if (typeof history[0] === 'object' && history[0] !== null && history[0].rate != null) {
    return history.map((item) => item.rate).filter((value) => value != null);
  }
  return history.filter((value) => typeof value === 'number');
}

function createSparkline(values) {
  const numericValues = extractHistoryValues(values);
  if (numericValues.length === 0) return '';

  const width = 100;
  const height = 24;
  const padding = 2;
  const min = Math.min(...numericValues);
  const max = Math.max(...numericValues);
  const range = max - min || 1;
  const points = numericValues.map((value, index) => {
    const x = padding + (index / (numericValues.length - 1 || 1)) * (width - padding * 2);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  const color = numericValues[numericValues.length - 1] >= numericValues[0] ? '#28a745' : '#e74c3c';
  return `
    <svg viewBox="0 0 ${width} ${height}" class="sparkline" role="img" aria-label="30-day history for this symbol">
      <polyline fill="none" stroke="${color}" stroke-width="2" points="${points}" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  `;
}

// Display quotes in popup
function displayQuotes() {
  chrome.storage.local.get(['quotes', 'timestamp', 'historical'], (result) => {
    chrome.storage.sync.get(['selectedCurrencies'], (syncResult) => {
      const quotesList = document.getElementById('quotesList');
      const timestampEl = document.getElementById('timestamp');
      const selectedCurrencies = syncResult.selectedCurrencies || ['EURUSD', 'EURRUB', 'USDRUB', 'CADRUB', 'BTCUSD', 'BRENTUSD'];

      if (result.quotes && Object.keys(result.quotes).length > 0) {
        let html = '';

        for (const pair of selectedCurrencies) {
          if (result.quotes[pair]) {
            const value = formatQuoteValue(pair, result.quotes[pair]);
            const history = result.historical?.[pair];
            const sparkline = history ? createSparkline(history) : '<span class="sparkline-placeholder">Loading history…</span>';

            html += `
              <div class="quote-item">
                <div class="quote-left">
                  <span class="quote-pair">${pair}</span>
                  <span class="sparkline-wrapper">${sparkline}</span>
                </div>
                <span class="quote-value">${value}</span>
              </div>
            `;
          }
        }

        if (html) {
          quotesList.innerHTML = html;

          document.querySelectorAll('.quote-pair').forEach(el => {
            el.style.cursor = 'pointer';
            el.addEventListener('click', () => {
              const pair = el.textContent;
              chrome.tabs.create({ url: getDetailsUrl(pair) });
            });
          });
        } else {
          quotesList.innerHTML = '<p class="error">No quotes available. Click Refresh to fetch.</p>';
        }

        // Update timestamp
        if (result.timestamp) {
          const date = new Date(result.timestamp);
          const timeStr = date.toLocaleTimeString();
          const dateStr = date.toLocaleDateString();
          timestampEl.textContent = `Last updated: ${dateStr} ${timeStr}`;
        }
      } else {
        quotesList.innerHTML = '<p class="loading">No data available. Click Refresh to fetch.</p>';
      }
    });
  });
}

// Refresh button handler
document.getElementById('refreshBtn').addEventListener('click', () => {
  const btn = document.getElementById('refreshBtn');
  btn.disabled = true;
  btn.textContent = 'Fetching...';

  chrome.runtime.sendMessage({ action: 'fetchQuotes' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Refresh failed:', chrome.runtime.lastError.message);
    } else if (response?.success) {
      displayQuotes();
    } else {
      console.error('Refresh failed:', response?.error || 'Unknown error');
    }

    btn.disabled = false;
    btn.textContent = 'Refresh Now';
  });
});

// Display quotes when popup opens
displayQuotes();
