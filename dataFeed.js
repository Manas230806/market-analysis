const axios = require("axios");
const cheerio = require("cheerio");

let cache = {
  KLC: {},
  CBOT: {},
  lastUpdated: null
};

async function scrape(url) {
  try {
    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const $ = cheerio.load(data);

    const price = $('[data-test="instrument-price-last"]').text();
    const change = $('[data-test="instrument-price-change"]').text();

    return {
      price: price || "-",
      change: change || "-"
    };

  } catch (err) {
    console.log("Scrape error:", url);
    return { price: "-", change: "-" };
  }
}

async function refreshData() {
  console.log("🔄 Fetching from Investing...");

  const klc = await scrape("https://www.investing.com/commodities/palm-oil");
  const cbot = await scrape("https://www.investing.com/commodities/us-soybean-oil");

  cache = {
    KLC: {
      MAY: klc,
      JUN: klc,
      JULY: klc,
      AUG: klc,
      SEP: klc
    },
    CBOT: {
      MAY: cbot,
      JULY: cbot,
      AUG: cbot,
      SEP: cbot
    },
    lastUpdated: new Date()
  };

  console.log("✅ Updated:", cache);
}

function startAutoRefresh() {
  refreshData();
  setInterval(refreshData, 5000);
}

function getData() {
  return cache;
}

module.exports = {
  startAutoRefresh,
  getData
};
