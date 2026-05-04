// scripts/sre-ai/incident-store.js
const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "../../data/incidents.json");

function saveIncident(incident) {
  const data = fs.existsSync(FILE)
    ? JSON.parse(fs.readFileSync(FILE))
    : [];

  data.push({
    id: incident.postMortem?.incidentId || `INC-${Date.now()}`,
    timestamp: new Date().toISOString(),
    ...incident
  });
  
  // Keep only last 1000 incidents for context
  if (data.length > 1000) data.shift();
  
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

function loadIncidents() {
  return fs.existsSync(FILE)
    ? JSON.parse(fs.readFileSync(FILE))
    : [];
}

module.exports = { saveIncident, loadIncidents };
