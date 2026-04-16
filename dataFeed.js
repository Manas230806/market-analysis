const axios = require("axios");

// Cache
let cache = {
  KLC: {},
  CBOT: {},
  lastUpdated: null
};

// 🔥 Generic TradingView fetch
async function fetchSymbol(symbol) {
  try {
    const url = "https://scanner.tradingview.com/global/scan";

    const response = await axios.post(url, {
      symbols: {
        tickers: [symbol],
        query: { types: [] }
      },
      columns: ["close", "change"]
    });

    if (!response.data.data || response.data.data.length === 0) {
      console.log("⚠️ No data:", symbol);
      return null;
    }

    const d = response.data.data[0].d;

    return {
      price: d[0]?.toFixed(2),
      change: d[1]?.toFixed(2)
    };

  } catch (err) {
    console.log("❌ Error:", symbol);
    return null;
  }
}

// 🔥 Safe fetch with fallback
async function safeFetch(symbol, fallback) {
  let data = await fetchSymbol(symbol);

  if (!data) {
    console.log("↩️ Fallback used for:", symbol);
    data = await fetchSymbol(fallback);
  }

  return data || { price: "-", change: "-" };
}

// 🔥 MAIN FUNCTION
async function refreshData() {
  console.log("🔄 Fetching SMART contract data...");

  const fallbackKLC = "MYX:FCPO1!";
  const fallbackCBOT = "CBOT:ZL1!";

  cache = {
    KLC: {
      MAY: await safeFetch("MYX:FCPOK2026", fallbackKLC),
      JUN: await safeFetch("MYX:FCPOM2026", fallbackKLC),
      JULY: await safeFetch("MYX:FCPON2026", fallbackKLC),
      AUG: await safeFetch("MYX:FCPOQ2026", fallbackKLC),
      SEP: await safeFetch("MYX:FCPOU2026", fallbackKLC)
    },

    CBOT: {
      MAY: await safeFetch("CBOT:ZLK2026", fallbackCBOT),
      JULY: await safeFetch("CBOT:ZLN2026", fallbackCBOT),
      AUG: await safeFetch("CBOT:ZLQ2026", fallbackCBOT),
      SEP: await safeFetch("CBOT:ZLU2026", fallbackCBOT)
    },

    lastUpdated: new Date()
  };

  console.log("✅ Updated:", cache);
}

// Auto refresh
function startAutoRefresh() {
  refreshData();
  setInterval(refreshData, 5000);
}

// Export
function getData() {
  return cache;
}

module.exports = {
  startAutoRefresh,
  getData
};
