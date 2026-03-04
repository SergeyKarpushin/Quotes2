// Currency pairs to track
const CURRENCIES = ['EURUSD', 'EURRUB', 'USDRUB', 'CADRUB', 'BTCUSD'];

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
    const quotes = {};
    
    // Helper function to convert currency pair to API calls
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

    // For EURUSD: EUR -> USD
    const eurusd = await getRate('EUR', 'USD');
    if (eurusd) quotes['EURUSD'] = eurusd;

    // For EURRUB: EUR -> RUB
    const eurrub = await getRate('EUR', 'RUB');
    if (eurrub) quotes['EURRUB'] = eurrub;

    // For USDRUB: USD -> RUB
    const usdrub = await getRate('USD', 'RUB');
    if (usdrub) quotes['USDRUB'] = usdrub;

    // For CADRUB: CAD -> RUB
    const cadrub = await getRate('CAD', 'RUB');
    if (cadrub) quotes['CADRUB'] = cadrub;

    // For BTCUSD: BTC -> USD (using alternate API since exchangerate-api might not have crypto)
    const btcusd = await fetchBitcoinPrice();
    if (btcusd) quotes['BTCUSD'] = btcusd;

    // Save to storage with timestamp
    const data = {
      quotes: quotes,
      timestamp: Date.now()
    };
    
    chrome.storage.local.set(data, () => {
      console.log('Quotes saved:', data);
      updateBadge(quotes);
    });

  } catch (error) {
    console.error('Error fetching quotes:', error);
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

// Update badge with EURUSD value
function updateBadge(quotes) {
  if (quotes['EURUSD']) {
    const eurusdValue = quotes['EURUSD'].toFixed(4);
    chrome.action.setBadgeText({ text: eurusdValue });
    chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
  }
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchQuotes') {
    fetchQuotes();
    sendResponse({ status: 'fetching' });
  }
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
