export type ReplayFailureClass = 
  | 'PROCESS_CRASH'         // Runtime aborted / segfault
  | 'TIMEOUT'               // Runtime stalled
  | 'MALFORMED_ARTIFACT'    // Serialization failure / Invalid JSON
  | 'SNAPSHOT_OVERFLOW'     // Budget exceeded
  
  // Semantic Taxonomic Failures
  | 'TRACE_MISMATCH'        // Semantic replay divergence
  | 'TRANSITION_MISMATCH'   // Evolution mismatch
  | 'CADENCE_ASYMMETRY'     // Snapshots count/layout drift but trace digests matched
  | 'TRANSITION_DENSITY_ASYMMETRY' // Same trace and layout, but radically different transition paths
  | 'NONE';                 // Successful convergence
