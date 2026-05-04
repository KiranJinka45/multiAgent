// scripts/sre-causal/global-scm.js
const SCM = require('./scm').constructor;

/**
 * Global Structural Causal Model (G-SCM).
 * Extends local reasoning to include cross-region and global infrastructure causal paths.
 * Essential for managing 'Planet-Scale' autonomous state.
 */
class GlobalSCM extends SCM {
  constructor() {
    super();
    this.regions = ['us-east-1', 'eu-west-1', 'ap-southeast-1'];
    this.globalVars = {
        GLB_Congestion: 0,
        BackboneLatency: 20, // ms
        CrossRegionReplicationLag: 50 // ms
    };
  }

  /**
   * Structural Equations for Global Interaction
   */
  calculateGlobal(regionMetrics = {}, globalInputs = {}, regionalInterventions = {}) {
    const g = { ...this.globalVars, ...globalInputs };
    const results = {};

    this.regions.forEach(r => {
        const local = { ...regionMetrics[r] } || { ErrorRate: 0, Latency: 100, DBHealth: 1.0, WorkerLoad: 0.5 };
        const intervention = regionalInterventions[r] || {};

        // 1. Local Latency is affected by Global Backbone and GLB Congestion
        local.Latency += (g.BackboneLatency * 0.5) + (g.GLB_Congestion * 50);

        // 2. Replication Lag affects local ErrorRate in secondary regions
        if (r !== 'us-east-1') { // Assume us-east-1 is Primary
            local.ErrorRate += (g.CrossRegionReplicationLag > 500) ? 0.05 : 0;
        }

        results[r] = this.calculate(local, intervention); // Run local SCM equations with interventions
    });

    return { regions: results, global: g };
  }

  /**
   * Global do-operator: Predicting effects of cross-region actions.
   */
  doGlobal(action, region, allMetrics) {
    const globalInterventions = {};
    const localInterventions = {};

    switch (action) {
      case 'DRAIN_REGION':
        // Draining a region increases load on others
        this.regions.filter(r => r !== region).forEach(r => {
            localInterventions[r] = { WorkerLoad: 0.9 }; // Spike load in peer regions
        });
        globalInterventions.GLB_Congestion = 0.2; // Slight congestion increase
        break;
      
      case 'PROMOTE_DATABASE':
        // Promoting a database resets replication lag but causes global latency spike
        globalInterventions.CrossRegionReplicationLag = 0;
        globalInterventions.BackboneLatency = 100; // Temporary re-routing overhead
        break;

      default:
        break;
    }

    return this.calculateGlobal(allMetrics, globalInterventions, localInterventions);
  }
}

module.exports = new GlobalSCM();
