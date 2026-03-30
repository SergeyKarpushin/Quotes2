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

// Display quotes in popup
function displayQuotes() {
  chrome.storage.local.get(['quotes', 'timestamp'], (result) => {
    chrome.storage.sync.get(['selectedCurrencies'], (syncResult) => {
      const quotesList = document.getElementById('quotesList');
      const timestampEl = document.getElementById('timestamp');
      
      const selectedCurrencies = syncResult.selectedCurrencies || ['EURUSD', 'EURRUB', 'USDRUB', 'CADRUB', 'BTCUSD', 'BRENTUSD'];
      
      if (result.quotes && Object.keys(result.quotes).length > 0) {
        let html = '';
        
        for (const pair of selectedCurrencies) {
          if (result.quotes[pair]) {
            const value = formatQuoteValue(pair, result.quotes[pair]);
            html += `
              <div class="quote-item">
                <span class="quote-pair">${pair}</span>
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
