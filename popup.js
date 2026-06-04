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
  if (!history) return [];

  if (Array.isArray(history) && history.length > 0) {
    if (typeof history[0] === 'object' && history[0] !== null && history[0].rate != null) {
      return history.map((item) => item.rate).filter((value) => value != null);
    }
    return history.filter((value) => typeof value === 'number');
  }

  if (typeof history === 'object') {
    const entries = Object.entries(history);
    const sortedEntries = entries.sort(([a], [b]) => a.localeCompare(b));
    return sortedEntries
      .map(([, entry]) => (entry && typeof entry === 'object' ? entry.rate ?? Object.values(entry)[0] : entry))
      .filter((value) => typeof value === 'number');
  }

  return [];
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

function getMonthlyCandleStats(values) {
  const numericValues = extractHistoryValues(values);
  if (numericValues.length < 2) return null;

  return {
    open: numericValues[0],
    close: numericValues[numericValues.length - 1],
    high: Math.max(...numericValues),
    low: Math.min(...numericValues)
  };
}

function createCandlestickBar(values) {
  const stats = getMonthlyCandleStats(values);
  if (!stats) {
    return '<span class="chart-placeholder">No candle data</span>';
  }

  const { open, close, high, low } = stats;
  const color = close >= open ? '#28a745' : '#e74c3c';

  const width = 40;
  const height = 28;
  const padding = 4;
  const range = high - low || 1;
  const scaleY = (value) => padding + ((high - value) / range) * (height - padding * 2);
  const openY = scaleY(open);
  const closeY = scaleY(close);
  const bodyY = Math.min(openY, closeY);
  const bodyHeight = Math.max(2, Math.abs(openY - closeY));

  return `
    <svg viewBox="0 0 ${width} ${height}" class="candlestick" role="img" aria-label="Candle stick chart for this month">
      <line x1="${width / 2}" y1="${scaleY(high)}" x2="${width / 2}" y2="${scaleY(low)}" stroke="${color}" stroke-width="2" />
      <rect x="${width / 2 - 6}" y="${bodyY}" width="12" height="${bodyHeight}" fill="${color}" rx="2" />
    </svg>
  `;
}

function formatChartValue(pair, value) {
  return formatQuoteValue(pair, value);
}

// --- Drag-and-drop reordering of symbols ---
let draggedRow = null;

// Find the row that the dragged item should be inserted before, based on the
// pointer's vertical position; returns null when it belongs at the end.
function getDragAfterRow(container, y) {
  const rows = [...container.querySelectorAll('.quote-item:not(.dragging)')];
  let closest = { offset: Number.NEGATIVE_INFINITY, element: null };
  for (const row of rows) {
    const box = row.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      closest = { offset, element: row };
    }
  }
  return closest.element;
}

// Persist the current DOM order of symbols back to storage so it sticks.
function persistSymbolOrder(container) {
  const order = [...container.querySelectorAll('.quote-item')].map((row) => row.dataset.pair);
  if (order.length) {
    chrome.storage.sync.set({ selectedCurrencies: order });
  }
}

function enableDragReorder(quotesList) {
  quotesList.querySelectorAll('.quote-item').forEach((row) => {
    row.addEventListener('dragstart', (event) => {
      draggedRow = row;
      row.classList.add('dragging');
      event.dataTransfer.effectAllowed = 'move';
      try {
        event.dataTransfer.setData('text/plain', row.dataset.pair);
      } catch (_) {
        // Some browsers require setData; ignore if it throws.
      }
    });

    row.addEventListener('dragend', () => {
      row.classList.remove('dragging');
      draggedRow = null;
      persistSymbolOrder(quotesList);
    });
  });

  // Bind the container-level dragover only once, even across re-renders.
  if (quotesList.dataset.dragBound === 'true') return;
  quotesList.dataset.dragBound = 'true';

  quotesList.addEventListener('dragover', (event) => {
    if (!draggedRow) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const afterRow = getDragAfterRow(quotesList, event.clientY);
    if (afterRow == null) {
      quotesList.appendChild(draggedRow);
    } else if (afterRow !== draggedRow) {
      quotesList.insertBefore(draggedRow, afterRow);
    }
  });

  quotesList.addEventListener('drop', (event) => event.preventDefault());
}

// Display quotes in popup
function displayQuotes() {
  chrome.storage.local.get(['quotes', 'timestamp', 'historical'], (result) => {
    chrome.storage.sync.get(['selectedCurrencies'], (syncResult) => {
      const quotesList = document.getElementById('quotesList');
      const timestampEl = document.getElementById('timestamp');
      const selectedCurrencies = syncResult.selectedCurrencies || ['EURUSD', 'EURRUB', 'USDRUB', 'CADRUB', 'BTCUSD', 'BRENTUSD'];

      if (selectedCurrencies.length > 0) {
        const currentMonthName = new Date().toLocaleString('default', { month: 'long' });
        let html = `
          <div class="quote-header">
            <span>Symbol</span>
            <span>Month (${currentMonthName})</span>
            <span></span>
            <span>Open</span>
            <span>Low</span>
            <span>High</span>
            <span>Close</span>
          </div>
        `;

        for (const pair of selectedCurrencies) {
          const quote = result.quotes?.[pair];

          // Always show every tracked symbol. If its rate hasn't been
          // fetched yet, render a pending row instead of dropping it.
          if (quote == null) {
            html += `
              <div class="quote-item quote-item-pending" draggable="true" data-pair="${pair}">
                <span class="quote-pair">${pair}</span>
                <span class="month-column"><span class="sparkline-placeholder">Fetching…</span></span>
                <span class="candlestick-column"><span class="chart-placeholder">—</span></span>
                <span class="chart-value chart-detail chart-detail-open">–</span>
                <span class="chart-value chart-detail chart-detail-low">–</span>
                <span class="chart-value chart-detail chart-detail-high">–</span>
                <span class="chart-value chart-detail chart-detail-close">–</span>
              </div>
            `;
            continue;
          }

          const history = result.historical?.[pair];
          const sparkline = history ? createSparkline(history) : '<span class="sparkline-placeholder">Loading history…</span>';
          const candlestick = history ? createCandlestickBar(history) : '<span class="chart-placeholder">Loading candle…</span>';
          const stats = history ? getMonthlyCandleStats(history) : null;
          const openValue = stats ? formatChartValue(pair, stats.open) : '–';
          const lowValue = stats ? formatChartValue(pair, stats.low) : '–';
          const highValue = stats ? formatChartValue(pair, stats.high) : '–';
          const closeValue = stats ? formatChartValue(pair, stats.close) : '–';

          html += `
            <div class="quote-item" draggable="true" data-pair="${pair}">
              <span class="quote-pair">${pair}</span>
              <span class="month-column">
                ${sparkline}
              </span>
              <span class="candlestick-column">${candlestick}</span>
              <span class="chart-value chart-detail chart-detail-open">${openValue}</span>
              <span class="chart-value chart-detail chart-detail-low">${lowValue}</span>
              <span class="chart-value chart-detail chart-detail-high">${highValue}</span>
              <span class="chart-value chart-detail chart-detail-close">${closeValue}</span>
            </div>
          `;
        }

        quotesList.innerHTML = html;

        document.querySelectorAll('.quote-pair').forEach(el => {
          el.style.cursor = 'pointer';
          el.addEventListener('click', () => {
            const pair = el.textContent;
            chrome.tabs.create({ url: getDetailsUrl(pair) });
          });
        });

        enableDragReorder(quotesList);

        // Update timestamp
        if (result.timestamp) {
          const date = new Date(result.timestamp);
          const timeStr = date.toLocaleTimeString();
          const dateStr = date.toLocaleDateString();
          timestampEl.textContent = `Last updated: ${dateStr} ${timeStr}`;
        }
      } else {
        quotesList.innerHTML = '<p class="loading">No symbols selected. Open Settings to add some.</p>';
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
