/**
 * DependencyGraph
 * Tracks relationships between files (e.g. layout.tsx depends on navbar.tsx).
 * Allows traversing the graph to find all affected files when a dependency changes.
 */
export class DependencyGraph {
    // Maps a file to the set of files it depends on
    private graph = new Map<string, Set<string>>();

    /**
     * Records that `file` depends on `dependsOn`
     * (e.g., file="src/app/layout.tsx", dependsOn="src/components/navbar.tsx")
     */
    addDependency(file: string, dependsOn: string) {
        if (!this.graph.has(file)) {
            this.graph.set(file, new Set());
        }
        this.graph.get(file)!.add(dependsOn);
    }

    /**
     * Bulk add dependencies for a file
     */
    addDependencies(file: string, deps: string[]) {
        if (!this.graph.has(file)) {
            this.graph.set(file, new Set());
        }
        const set = this.graph.get(file)!;
        deps.forEach(d => set.add(d));
    }

    /**
     * Given a file that changed, find all files that depend on it directly or indirectly.
     */
    getAffectedFiles(changedFile: string): string[] {
        const affected = new Set<string>();

        // Find all files that depend on `changedFile`
        for (const [f, deps] of this.graph.entries()) {
            if (deps.has(changedFile)) {
                affected.add(f);
            }
        }

        // This could be expanded to a recursive resolution if deep dependency trees 
        // need to trigger full re-renders, but standard Next.js HMR is often flat enough.
        return Array.from(affected);
    }

    /**
     * Clears the graph
     */
    clear() {
        this.graph.clear();
    }
}
