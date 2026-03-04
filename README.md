# Forex Quotes Chrome Extension

A lightweight Chrome extension that fetches live forex exchange rates daily and displays them in a popup with the EURUSD value on the icon.

## Features

- **Daily Auto-Updates**: Fetches currency quotes once per day automatically
- **Icon Badge**: Shows EURUSD exchange rate on the extension icon
- **Quick Popup**: Click the icon to view all tracked currencies
- **Configurable Currencies**: Choose which currencies to track via settings page
- **Manual Refresh**: Button to refresh quotes on demand
- **Timestamps**: Shows when quotes were last updated

## Files Structure

```
Quotes/
├── manifest.json       # Extension configuration
├── background.js       # Fetches quotes daily
├── popup.html          # Popup UI
├── popup.js            # Popup logic
├── popup.css           # Popup styling
├── options.html        # Settings page
├── options.js          # Settings logic
├── options.css         # Settings styling
├── icons/
│   ├── icon_16.svg
│   ├── icon_48.svg
│   └── icon_128.svg
└── README.md
```

## APIs Used

- **Forex Rates**: [ExchangeRate-API](https://www.exchangerate-api.com/) - Free tier (1500 requests/month)
- **Bitcoin Price**: [CoinGecko API](https://www.coingecko.com/en/api) - Free, no authentication required

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `Quotes` folder
5. The extension icon will appear in your Chrome toolbar!

## Usage

1. **View Quotes**: Click the extension icon to open the popup
2. **Refresh**: Click "Refresh Now" to manually fetch updated quotes
3. **Icon Badge**: Check the extension icon badge for the current EURUSD rate

## How it Works

- **Automatic Updates**: Extension sets a 24-hour alarm to fetch quotes daily
- **First Load**: Quotes are fetched immediately when extension is installed
- **Storage**: Quotes are stored in Chrome's local storage with timestamps
- **Badge**: The EURUSD value is always displayed on the extension icon

## Available Currencies

By default, the extension tracks these 5 currency pairs:
- **EURUSD** - Euro to US Dollar
- **EURRUB** - Euro to Russian Ruble
- **USDRUB** - US Dollar to Russian Ruble
- **CADRUB** - Canadian Dollar to Russian Ruble
- **BTCUSD** - Bitcoin to US Dollar

Additional currencies available to enable in settings:
- **GBPUSD** - British Pound to US Dollar
- **JPYUSD** - Japanese Yen to US Dollar
- **AUDUSD** - Australian Dollar to US Dollar

**Configure Currencies:**
1. Right-click the extension icon
2. Select "Options" or click the ⚙️ Settings button in the popup
3. Check/uncheck currencies to customize your selection
4. Click "Save Settings"
5. Quotes will refresh immediately with your new selection

## Permissions

- `storage`: To save quotes locally
- `alarms`: To schedule daily updates
- `https://api.exchangerate-api.com/*`: To fetch forex rates
- `https://api.coingecko.com/*`: To fetch Bitcoin price

## Notes

- The extension respects API rate limits
- Quotes update once per 24 hours automatically
- Manual refresh fetches the latest data immediately
- All data is stored locally in your browser

## Troubleshooting

**No data showing**: Click "Refresh Now" to fetch quotes
**API errors**: Check your internet connection, APIs may have temporary issues
**Icon not updating**: Hard refresh the extension by toggling and reloading on chrome://extensions/

## License

Free to use and modify personal use.
