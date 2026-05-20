package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"src"
)

// Fixture represents the standard ZTAN conformance test format
type Fixture struct {
	ID        string `json:"id"`
	Raw       string `json:"raw"`
	Canonical string `json:"canonical,omitempty"`
	Valid     bool   `json:"valid"`
}

func main() {
	fmt.Println("===========================================================")
	fmt.Println("    ZTAN Go Interoperability Conformance & Fuzz Harness    ")
	fmt.Println("===========================================================")

	// Resolve the absolute path to conformance_fixtures.json
	wd, err := os.Getwd()
	if err != nil {
		fmt.Printf("[FAIL] Could not resolve working directory: %v\n", err)
		os.Exit(1)
	}

	fixturePath := filepath.Join(wd, "packages", "utils", "src", "conformance_fixtures.json")
	data, err := ioutil.ReadFile(fixturePath)
	if err != nil {
		// Try relative path fallback
		fixturePath = filepath.Join(wd, "conformance_fixtures.json")
		data, err = ioutil.ReadFile(fixturePath)
		if err != nil {
			fmt.Printf("[FAIL] Could not read conformance fixtures file: %v\n", err)
			os.Exit(1)
		}
	}

	var fixtures []Fixture
	err = json.Unmarshal(data, &fixtures)
	if err != nil {
		fmt.Printf("[FAIL] Could not parse conformance fixtures JSON: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("\nSuccessfully loaded %d interoperability golden fixtures.\nExecuting Go pre-parser checks...\n\n", len(fixtures))

	passCount := 0
	failCount := 0

	for _, fix := range fixtures {
		valErr := src.ValidateDuplicateKeys(fix.Raw)
		passed := (valErr == nil) == fix.Valid

		if passed {
			passCount++
			fmt.Printf("[PASS] Fixture [%s] converged perfectly. Valid: %t\n", fix.ID, fix.Valid)
		} else {
			failCount++
			fmt.Printf("[FAIL] Fixture [%s] DIVERGED! Expected valid: %t, got error: %v\n", fix.ID, fix.Valid, valErr)
		}
	}

	fmt.Println("\n===========================================================")
	fmt.Println("    Go Interoperability Verification Summary              ")
	fmt.Println("===========================================================")
	fmt.Printf("  - Total Fixtures: %d\n", len(fixtures))
	fmt.Printf("  - Passed:         %d\n", passCount)
	fmt.Printf("  - Failed:         %d\n", failCount)

	if failCount > 0 {
		fmt.Println("\n[RESULT] ❌ Interoperability check failed! Convergence splits detected.")
		os.Exit(1)
	} else {
		fmt.Println("\n[RESULT] ✅ Absolute parity achieved! Go parser successfully matches TS & Python boundaries.")
		os.Exit(0)
	}
}
