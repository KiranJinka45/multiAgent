import { DependencyGraph } from './dependency-graph';
import { ProjectMemory, projectMemory } from './project-memory';

/**
 * ImpactAnalyzer
 * Determines exactly which files need to be regenerated based on a user prompt.
 * Uses a combination of Semantic Vector Search (via ProjectMemory), 
 * Keyword Matching, and Graph Dependency traversal.
 */
export class ImpactAnalyzer {

    /**
     * Determine all files affected by a given prompt.
     */
    static async determineAffectedFiles(
        prompt: string,
        memory: ProjectMemory,
        graph: DependencyGraph
    ): Promise<string[]> {

        // 1. Get initial affected files from Project Memory (Semantic Search + Keyword constraints)
        const initialAffected = await projectMemory.getAffectedFiles(memory, prompt);

        // 2. Expand the impact radius using the Dependency Graph
        const expandedAffected = new Set<string>(initialAffected);

        for (const file of initialAffected) {
            const dependents = graph.getAffectedFiles(file);
            dependents.forEach(d => expandedAffected.add(d));
        }

        return Array.from(expandedAffected);
    }

    /**
     * Populates the DependencyGraph based on the current ProjectMemory manifest.
     */
    static buildGraphFromMemory(memory: ProjectMemory): DependencyGraph {
        const graph = new DependencyGraph();

        for (const file of memory.fileManifest) {
            // file.dependencies contains imports detected in the file
            if (file.dependencies && file.dependencies.length > 0) {
                graph.addDependencies(file.path, file.dependencies);
            }
        }

        return graph;
    }
}
