// Display quotes in popup
function displayQuotes() {
  chrome.storage.local.get(['quotes', 'timestamp'], (result) => {
    const quotesList = document.getElementById('quotesList');
    const timestampEl = document.getElementById('timestamp');
    
    if (result.quotes && Object.keys(result.quotes).length > 0) {
      // Build HTML for quotes
      let html = '';
      const currencyOrder = ['EURUSD', 'EURRUB', 'USDRUB', 'CADRUB', 'BTCUSD'];
      
      for (const pair of currencyOrder) {
        if (result.quotes[pair]) {
          const value = result.quotes[pair].toFixed(4);
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
}

// Refresh button handler
document.getElementById('refreshBtn').addEventListener('click', () => {
  const btn = document.getElementById('refreshBtn');
  btn.disabled = true;
  btn.textContent = 'Fetching...';
  
  // Send message to background script to fetch immediately
  chrome.runtime.sendMessage({ action: 'fetchQuotes' }, () => {
    // Wait a moment for data to be saved, then refresh display
    setTimeout(() => {
      displayQuotes();
      btn.disabled = false;
      btn.textContent = 'Refresh Now';
    }, 500);
  });
});

// Display quotes when popup opens
displayQuotes();
