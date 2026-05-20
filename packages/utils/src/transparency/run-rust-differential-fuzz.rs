// Rust Differential and Interoperability Fuzzer (ZTAN Protocol v1.0.0-LTS)
// Compiles into a native binary to run differential checks against JSON golden fixtures

mod canonicalizer;
mod crypto_verify;

use std::fs;
use std::path::Path;
use std::process;
use serde::Deserialize;

#[derive(Deserialize, Debug)]
struct Fixture {
    id: String,
    raw: String,
    valid: bool,
}

fn main() {
    println!("===========================================================");
    println!("    ZTAN Rust Interoperability & Conformance Fuzzer       ");
    println!("===========================================================");

    // Resolve path to conformance_fixtures.json
    let fixture_path = Path::new("packages/utils/src/conformance_fixtures.json");
    if !fixture_path.exists() {
        eprintln!("[FAIL] Could not locate conformance_fixtures.json at {:?}", fixture_path);
        process::exit(1);
    }

    let data = match fs::read_to_string(fixture_path) {
        Ok(content) => content,
        Err(e) => {
            eprintln!("[FAIL] Failed to read fixture file: {}", e);
            process::exit(1);
        }
    };

    let fixtures: Vec<Fixture> = match serde_json::from_str(&data) {
        Ok(list) => list,
        Err(e) => {
            eprintln!("[FAIL] Failed to parse fixtures JSON: {}", e);
            process::exit(1);
        }
    };

    println!("[INIT] Loaded {} golden interoperability fixtures.", fixtures.len());

    let mut pass_count = 0;
    let mut fail_count = 0;

    for fix in fixtures {
        // Execute Rust PDA Duplicate Key Parser
        let parse_result = canonicalizer::validate_duplicate_keys(&fix.raw);
        let is_valid = parse_result.is_ok();
        
        let converged = is_valid == fix.valid;

        if converged {
            pass_count += 1;
            println!("[PASS] Fixture [{}] converged perfectly. Expected Valid: {}", fix.id, fix.valid);
        } else {
            fail_count += 1;
            eprintln!(
                "[FAIL] Fixture [{}] DIVERGED! Expected Valid: {}, Got: {:?}",
                fix.id, fix.valid, parse_result
            );
        }
    }

    println!("\n===========================================================");
    println!("    Rust Interoperability Summary                          ");
    println!("===========================================================");
    println!("  - Total Fixtures: {}", pass_count + fail_count);
    println!("  - Passed:         {}", pass_count);
    println!("  - Failed:         {}", fail_count);

    if fail_count > 0 {
        eprintln!("\n[RESULT] ❌ Interoperability check failed! Convergence splits detected.");
        process::exit(1);
    } else {
        println!("\n[RESULT] ✅ Absolute parity achieved! Rust parser matches specification boundaries.");
        process::exit(0);
    }
}
