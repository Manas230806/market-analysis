const axios = require("axios");
const https = require("https");

// Cache
let cache = {
  KLC: {},
  CBOT: {},
  lastUpdated: null
};

// Browser-like headers (bypasses TradingView datacenter blocking)
const TV_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Origin": "https://www.tradingview.com",
  "Referer": "https://www.tradingview.com/markets/futures/",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  "Content-Type": "application/json",
  "sec-ch-ua": '"Chromium";v="124", "Google Chrome";v="124"',
  "sec-ch-ua-platform": '"Windows"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-site"
};

// SSL fix for Render / cloud environments
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// Retry helper — retries up to `retries` times with delay
async function withRetry(fn, retries = 3, delayMs = 1000) {
  for (let i = 0; i < retries; i++) {
    const result = await fn();
    if (result) return result;
    if (i < retries - 1) {
      console.log(`⏳ Retry ${i + 1}/${retries - 1}...`);
      await new Promise(res => setTimeout(res, delayMs));
    }
  }
  return null;
}

// Generic TradingView fetch
async function fetchSymbol(symbol) {
  try {
    const url = "https://scanner.tradingview.com/global/scan";

    const response = await axios.post(url, {
      symbols: {
        tickers: [symbol],
        query: { types: [] }
      },
      columns: ["close", "change"]
    }, {
      headers: TV_HEADERS,
      httpsAgent,
      timeout: 10000  // 10 second timeout
    });

    if (!response.data.data || response.data.data.length === 0) {
      console.log("⚠️ No data:", symbol);
      return null;
    }

    const d = response.data.data[0].d;

    if (d[0] == null) {
      console.log("⚠️ Null price for:", symbol);
      return null;
    }

    return {
      price: d[0].toFixed(2),
      change: d[1] != null ? d[1].toFixed(2) : "0.00"
    };

  } catch (err) {
    console.log("❌ Error:", symbol, "-", err.message);
    return null;
  }
}

// Safe fetch with fallback + retry
async function safeFetch(symbol, fallback) {
  // Try primary symbol with retry
  let data = await withRetry(() => fetchSymbol(symbol));

  if (!data) {
    console.log("↩️ Fallback used for:", symbol);
    // Try fallback symbol with retry
    data = await withRetry(() => fetchSymbol(fallback));
  }

  return data || { price: "-", change: "-" };
}

// MAIN FUNCTION
async function refreshData() {
  console.log("🔄 Fetching contract data...");

  const fallbackKLC  = "MYX:FCPO1!";
  const fallbackCBOT = "CBOT:ZL1!";

  cache = {
    KLC: {
      MAY:  await safeFetch("MYX:FCPOK2026", fallbackKLC),
      JUN:  await safeFetch("MYX:FCPOM2026", fallbackKLC),
      JULY: await safeFetch("MYX:FCPON2026", fallbackKLC),
      AUG:  await safeFetch("MYX:FCPOQ2026", fallbackKLC),
      SEP:  await safeFetch("MYX:FCPOU2026", fallbackKLC)
    },

    CBOT: {
      MAY:  await safeFetch("CBOT:ZLK2026", fallbackCBOT),
      JULY: await safeFetch("CBOT:ZLN2026", fallbackCBOT),
      AUG:  await safeFetch("CBOT:ZLQ2026", fallbackCBOT),
      SEP:  await safeFetch("CBOT:ZLU2026", fallbackCBOT)
    },

    lastUpdated: new Date()
  };

  console.log("✅ Updated:", JSON.stringify(cache, null, 2));
}

// Auto refresh — 3s delay on start to let Render network stabilize
function startAutoRefresh() {
  console.log("⏳ Waiting 3s for network to stabilize...");
  setTimeout(() => {
    refreshData();
    setInterval(refreshData, 5000);
  }, 3000);
}

// Export
function getData() {
  return cache;
}

module.exports = {
  startAutoRefresh,
  getData
};
