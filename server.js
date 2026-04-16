const express = require("express");
const cors = require("cors");
const path = require("path");
const axios = require("axios");
const fs = require("fs");

const { startAutoRefresh, getData } = require("./dataFeed");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend
app.use(express.static(path.join(__dirname)));

// Start background data
startAutoRefresh();

// 📁 Tariff JSON file
const DATA_FILE = "./tariffData.json";

// ✅ Read tariff data
function readTariffData() {
  try {
    const raw = fs.readFileSync(DATA_FILE);
    return JSON.parse(raw);
  } catch (err) {
    console.log("❌ Error reading tariff file");
    return {};
  }
}

// ✅ Write tariff data
function writeTariffData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ✅ USD API (cached)
let cachedUSD = 83;

async function getUSDINR() {
  try {
    const res = await axios.get("https://api.exchangerate-api.com/v4/latest/USD");
    cachedUSD = res.data.rates.INR;
    return cachedUSD;
  } catch (err) {
    console.log("❌ USD fetch error, using last value");
    return cachedUSD;
  }
}

// Home route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

// ✅ MARKET API
app.get("/api/prices", (req, res) => {
  const data = getData();

  if (!data || !data.KLC || !data.CBOT) {
    return res.json({
      KLC: {},
      CBOT: {},
      lastUpdated: null
    });
  }

  res.json(data);
});

// ✅ DASHBOARD API
app.get("/api/dashboard", async (req, res) => {
  try {
    const market = getData();
    const usd = await getUSDINR();
    const tariffData = readTariffData();

    const result = {};

    const cpoPrice = market?.KLC?.MAY?.price || 0;
    const soyPrice = market?.CBOT?.MAY?.price || 0;

    const mapping = {
      CPO: cpoPrice,
      SOY: soyPrice,
      RBD: cpoPrice
    };

    for (let key in tariffData) {
      const tariff_usd = tariffData[key]?.tariff_usd || 0;
      const duty = tariffData[key]?.duty || 0;
      const market_price = mapping[key] || 0;

      const tariff_inr = tariff_usd * usd;
      const duty_inr = tariff_inr * duty / 100;

      let insight = "🟡 Waiting Data";

      if (market_price > 0) {
        if (market_price > tariff_usd + 20) {
          insight = "🔴 Strong Import Pressure";
        } else if (market_price < tariff_usd - 20) {
          insight = "🟢 Import Advantage";
        } else {
          insight = "🟡 Neutral";
        }
      }

      result[key] = {
        market_price,
        tariff_usd,
        usd,
        tariff_inr,
        duty,
        duty_inr,
        insight
      };
    }

    res.json(result);

  } catch (err) {
    console.log("❌ Dashboard error:", err);
    res.status(500).json({ error: "Dashboard failed" });
  }
});

// ✅ ADMIN: GET tariff
app.get("/api/tariff", (req, res) => {
  const data = readTariffData();
  res.json(data);
});

// ✅ ADMIN: UPDATE tariff
app.post("/api/tariff", (req, res) => {
  try {
    const newData = req.body;
    const fs = require("fs");
    const TARIF_FILE = "./tariffData.json";
    writeTariffData(newData);
    res.json({ message: "✅ Tariff updated successfully" });
  } catch (err) {
    console.log("❌ Tariff update error:", err);
    res.status(500).json({ error: "Update failed" });
  }
});

// Start server
const PORT = 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
