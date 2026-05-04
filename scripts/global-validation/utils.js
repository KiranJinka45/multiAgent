// scripts/global-validation/utils.js
const axios = require("axios");

async function callRegion(baseUrl, path, payload) {
  try {
    const res = await axios.post(`${baseUrl}${path}`, payload, {
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return { ok: true, data: res.data };
  } catch (err) {
    return { ok: false, error: err.response?.data || err.message };
  }
}

function randomRegion(regions) {
  return regions[Math.floor(Math.random() * regions.length)];
}

module.exports = { callRegion, randomRegion };
