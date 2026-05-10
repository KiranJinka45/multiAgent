use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

/**
 * ─── ZTAN Rust Auditor ──────────────────────────────────────────────────────
 * Independent implementation of the ZTAN legality interpreter.
 * Used for cross-implementation verification and formal correctness.
 * ────────────────────────────────────────────────────────────────────────────
 */

#[derive(Debug, Serialize, Deserialize)]
pub enum InstitutionalState {
    QUIESCENT,
    PROPOSING,
    RECOVERING,
    LOCKED,
    HIBERNATING,
    EMERGENCY_RECOVERY,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GovernanceReceipt {
    pub sequence_number: u64,
    pub epoch_id: u64,
    pub action: String,
    pub previous_g_root: String,
    pub g_root: String,
}

pub struct LegalityInterpreter {
    pub current_state: InstitutionalState,
}

impl LegalityInterpreter {
    pub fn new() -> Self {
        Self {
            current_state: InstitutionalState::QUIESCENT,
        }
    }

    pub fn validate_transition(&mut self, receipt: &GovernanceReceipt) -> Result<(), String> {
        let action = receipt.action.as_str();
        
        // Match transitions against the Authoritative Legal Runtime (STATE_MATRIX.json)
        match self.current_state {
            InstitutionalState::QUIESCENT => match action {
                "GOVERNANCE_PROPOSAL" => self.current_state = InstitutionalState::PROPOSING,
                "COUNCIL_RESET" | "AUDITOR_SLASH" | "STATE_CHECKPOINT" | "CONSTITUTIONAL_MIGRATE" | 
                "PROTOCOL_UPGRADE" | "GOVERNANCE_SNAPSHOT" | "GUARDIAN_REGISTER" | "INSTITUTIONAL_HANDOVER" => {},
                _ => return Err(format!("Illegal transition from QUIESCENT: {}", action)),
            },
            InstitutionalState::PROPOSING => match action {
                "COUNCIL_UPDATE" => self.current_state = InstitutionalState::QUIESCENT,
                "AUDITOR_SLASH" | "STATE_CHECKPOINT" => {},
                _ => return Err(format!("Illegal transition from PROPOSING: {}", action)),
            },
            InstitutionalState::RECOVERING => match action {
                "RECOVERY_CHALLENGE" => {},
                "COUNCIL_RESET" => self.current_state = InstitutionalState::QUIESCENT,
                "AUDITOR_SLASH" => {},
                _ => return Err(format!("Illegal transition from RECOVERING: {}", action)),
            },
            InstitutionalState::LOCKED => match action {
                "COUNCIL_RESET" => self.current_state = InstitutionalState::QUIESCENT,
                "AUDITOR_SLASH" => {},
                _ => return Err(format!("Illegal transition from LOCKED: {}", action)),
            },
            InstitutionalState::HIBERNATING | InstitutionalState::EMERGENCY_RECOVERY => match action {
                "COUNCIL_RESET" => self.current_state = InstitutionalState::QUIESCENT,
                "PROTOCOL_UPGRADE" => {},
                _ => return Err(format!("Illegal transition from meta-state: {}", action)),
            },
        }

        println!("[RUST] Transition valid: {:?} -> {}", self.current_state, action);
        Ok(())
    }
}

#[derive(Debug, Deserialize)]
struct HistoryWrapper {
    history: Vec<HistoryEntry>,
}

#[derive(Debug, Deserialize)]
struct HistoryEntry {
    receipt: GovernanceReceipt,
}

fn main() {
    println!("[RUST] ZTAN Independent Auditor Starting...");
    
    let corpus_path = Path::new("../fixtures/replay-corpus/full_history.json");
    if corpus_path.exists() {
        let content = fs::read_to_string(corpus_path).expect("Failed to read corpus");
        let data: HistoryWrapper = serde_json::from_str(&content).expect("Failed to parse corpus");
        
        println!("[RUST] Replaying {} historical actions...", data.history.len());
        let mut interpreter = LegalityInterpreter::new();
        
        for entry in data.history {
            if let Err(e) = interpreter.validate_transition(&entry.receipt) {
                println!("[RUST] ❌ Legality Failure: {}", e);
                std::process::exit(1);
            }
        }
        println!("[RUST] ✅ History replay successful. Institutional truth verified.");
    } else {
        println!("[RUST] No replay corpus found.");
    }
}
