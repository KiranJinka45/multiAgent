import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import { logger } from '@packages/observability';

export interface GraphNode {
    file: string;
    hash: string;
    dependencies: string[];
}

export class BuildGraphEngine {
    private static graphFile = '.multiagent-graph.json';

    /**
     * Analyze a project and determine affected files.
     */
    static async getAffectedNodes(projectDir: string): Promise<string[]> {
        const currentGraph = await this.buildGraph(projectDir);
        const previousGraph = await this.loadGraph(projectDir);

        if (!previousGraph) {
            logger.info('[BuildGraphEngine] No previous graph found. Full build required.');
            await this.saveGraph(projectDir, currentGraph);
            return Object.keys(currentGraph);
        }

        const affected: Set<string> = new Set();
        for (const [file, node] of Object.entries(currentGraph)) {
            const prevNode = previousGraph[file];
            if (!prevNode || prevNode.hash !== node.hash) {
                affected.add(file);
            }
        }

        // Transitive closure (recursive reverse dep marking)
        const finalAffected = new Set<string>(affected);
        let changed = true;
        while (changed) {
            changed = false;
            for (const [file, node] of Object.entries(currentGraph)) {
                if (!finalAffected.has(file)) {
                    const hasAffectedDep = node.dependencies.some(dep => finalAffected.has(dep));
                    if (hasAffectedDep) {
                        finalAffected.add(file);
                        changed = true;
                    }
                }
            }
        }

        await this.saveGraph(projectDir, currentGraph);
        return Array.from(finalAffected);
    }

    private static async buildGraph(projectDir: string): Promise<Record<string, GraphNode>> {
        const graph: Record<string, GraphNode> = {};
        const scanDirs = ['src', 'app', 'components', 'lib'];
        
        const allFiles = [];
        for (const dir of scanDirs) {
            const fullDir = path.join(projectDir, dir);
            if (await fs.pathExists(fullDir)) {
                allFiles.push(...(await this.walk(fullDir)));
            }
        }

        // Build the dependency graph
        for (const file of allFiles) {
            const relativePath = path.relative(projectDir, file);
            const content = await fs.readFile(file, 'utf-8');
            
            // Basic import extraction (regex-based for speed)
            const imports = this.extractImports(content);
            const resolvedDeps = imports.map(imp => this.resolveDep(relativePath, imp, allFiles, projectDir));

            graph[relativePath] = {
                file: relativePath,
                hash: crypto.createHash('sha256').update(content).digest('hex'),
                dependencies: resolvedDeps.filter(d => d !== null) as string[]
            };
        }
        return graph;
    }

    private static extractImports(content: string): string[] {
        const importRegex = /import\s+.*\s+from\s+['"](.*)['"]/g;
        const matches = [];
        let match;
        while ((match = importRegex.exec(content)) !== null) {
            matches.push(match[1]);
        }
        return matches;
    }

    private static resolveDep(sourceFile: string, importPath: string, allFiles: string[], projectDir: string): string | null {
        if (!importPath.startsWith('.')) return null; // Ignore external packages for now
        
        const absoluteImport = path.resolve(path.dirname(path.join(projectDir, sourceFile)), importPath);
        const extensions = ['.ts', '.tsx', '.js', '.jsx'];
        
        for (const ext of extensions) {
            const candidate = absoluteImport + ext;
            if (allFiles.includes(candidate)) return path.relative(projectDir, candidate);
        }

        // If it's a directory (index.ts)
        for (const ext of extensions) {
            const candidate = path.join(absoluteImport, 'index' + ext);
            if (allFiles.includes(candidate)) return path.relative(projectDir, candidate);
        }

        return null;
    }

    private static async walk(dir: string): Promise<string[]> {
        let results: string[] = [];
        const list = await fs.readdir(dir);
        for (const file of list) {
            const fullPath = path.join(dir, file);
            const stat = await fs.stat(fullPath);
            if (stat.isDirectory()) {
                results = results.concat(await this.walk(fullPath));
            } else {
                results.push(fullPath);
            }
        }
        return results;
    }

    private static async loadGraph(projectDir: string): Promise<Record<string, GraphNode> | null> {
        const filePath = path.join(projectDir, this.graphFile);
        if (await fs.pathExists(filePath)) {
            return fs.readJSON(filePath);
        }
        return null;
    }

    private static async saveGraph(projectDir: string, graph: Record<string, GraphNode>) {
        const filePath = path.join(projectDir, this.graphFile);
        await fs.writeJSON(filePath, graph);
    }
}
