// Currency pairs to track - defaults
const DEFAULT_CURRENCIES = ['EURUSD', 'EURRUB', 'USDRUB', 'CADRUB', 'BTCUSD', 'BRENTUSD'];

// Alarm name for daily updates
const ALARM_NAME = 'dailyQuoteUpdate';

// Initialize on installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed, fetching initial quotes...');
  fetchQuotes();
  
  // Set up daily alarm
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: 24 * 60 });
});

// Fetch quotes when alarm triggers
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    console.log('Daily alarm triggered, fetching quotes...');
    fetchQuotes();
  }
});

// Fetch quotes from exchangerate-api.com
async function fetchQuotes() {
  try {
    const result = await chrome.storage.sync.get(['selectedCurrencies']);
    const selectedCurrencies = result.selectedCurrencies || DEFAULT_CURRENCIES;
    const quotes = {};

    async function getRate(from, to) {
      try {
        const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${from}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        return data.rates[to] || null;
      } catch (error) {
        console.error(`Error fetching ${from}${to}:`, error);
        return null;
      }
    }

    for (const pair of selectedCurrencies) {
      if (pair === 'EURUSD') {
        const rate = await getRate('EUR', 'USD');
        if (rate) quotes[pair] = rate;
      } else if (pair === 'EURRUB') {
        const rate = await getRate('EUR', 'RUB');
        if (rate) quotes[pair] = rate;
      } else if (pair === 'USDRUB') {
        const rate = await getRate('USD', 'RUB');
        if (rate) quotes[pair] = rate;
      } else if (pair === 'CADRUB') {
        const rate = await getRate('CAD', 'RUB');
        if (rate) quotes[pair] = rate;
      } else if (pair === 'BTCUSD') {
        const rate = await fetchBitcoinPrice();
        if (rate) quotes[pair] = rate;
      } else if (pair === 'BRENTUSD') {
        const rate = await fetchBrentOilPrice();
        if (rate) quotes[pair] = rate;
      } else if (pair === 'GBPUSD') {
        const rate = await getRate('GBP', 'USD');
        if (rate) quotes[pair] = rate;
      } else if (pair === 'JPYUSD') {
        const rate = await getRate('JPY', 'USD');
        if (rate) quotes[pair] = rate;
      } else if (pair === 'AUDUSD') {
        const rate = await getRate('AUD', 'USD');
        if (rate) quotes[pair] = rate;
      }
    }

    const data = {
      quotes,
      timestamp: Date.now()
    };

    await chrome.storage.local.set(data);
    console.log('Quotes saved:', data);
    updateBadge(quotes);

    return { success: true, quotes, timestamp: data.timestamp };
  } catch (error) {
    console.error('Error fetching quotes:', error);
    return { success: false, error: error.message };
  }
}

// Fetch Bitcoin price from CoinGecko (free API, no auth needed)
async function fetchBitcoinPrice() {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return data.bitcoin?.usd || null;
  } catch (error) {
    console.error('Error fetching Bitcoin price:', error);
    return null;
  }
}

// Fetch Brent oil price from Yahoo Finance
async function fetchBrentOilPrice() {
  try {
    const response = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/BZ=F?interval=1d&range=1d');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return data.chart?.result?.[0]?.meta?.regularMarketPrice || null;
  } catch (error) {
    console.error('Error fetching Brent oil price:', error);
    return null;
  }
}

// Update badge with EURUSD value
function updateBadge(quotes) {
  if (quotes['EURUSD']) {
    const eurusdValue = quotes['EURUSD'].toFixed(4);
    chrome.action.setBadgeText({ text: eurusdValue });
    chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

// Handle messages from popup and options
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchQuotes' || request.action === 'settingsChanged') {
    (async () => {
      const result = await fetchQuotes();
      sendResponse(result);
    })();

    return true;
  }

  return false;
});

// Fetch quotes when extension loads (if data exists)
chrome.storage.local.get(['quotes'], (result) => {
  if (result.quotes) {
    updateBadge(result.quotes);
  } else {
    // No data yet, fetch immediately
    fetchQuotes();
  }
});
