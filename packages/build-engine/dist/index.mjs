// src/build-cache-manager.ts
import fs from "fs-extra";
import path from "path";
import crypto from "crypto";
import logger from "@packages/utils";
import { redis } from "@packages/utils";
var BuildCacheManager = class {
  static casRoot = path.join(process.cwd(), ".cache", "cas");
  static async init() {
    await fs.ensureDir(this.casRoot);
  }
  /**
   * Store a file or directory in CAS.
   * Returns the hash of the content.
   */
  static async putBlob(sourcePath) {
    if (!await fs.pathExists(sourcePath)) return "";
    const stat = await fs.stat(sourcePath);
    let hash;
    if (stat.isDirectory()) {
      const files = await fs.readdir(sourcePath);
      const manifest = {};
      for (const f of files) {
        manifest[f] = await this.putBlob(path.join(sourcePath, f));
      }
      const manifestContent = JSON.stringify(manifest);
      hash = crypto.createHash("sha256").update(manifestContent).digest("hex") + ".dir";
      const blobPath = path.join(this.casRoot, hash);
      if (!await fs.pathExists(blobPath)) {
        await fs.writeJSON(blobPath, manifest);
      }
    } else {
      const content = await fs.readFile(sourcePath);
      hash = crypto.createHash("sha256").update(content).digest("hex");
      const blobPath = path.join(this.casRoot, hash);
      if (!await fs.pathExists(blobPath)) {
        await fs.copy(sourcePath, blobPath);
      }
    }
    return hash;
  }
  /**
   * Restore a blob from CAS to a target path.
   */
  static async getBlob(hash, targetPath) {
    const blobPath = path.join(this.casRoot, hash);
    if (!await fs.pathExists(blobPath)) return false;
    if (hash.endsWith(".dir")) {
      try {
        const manifest = await fs.readJSON(blobPath);
        await fs.ensureDir(targetPath);
        for (const [rel, fileHash] of Object.entries(manifest)) {
          await this.getBlob(fileHash, path.join(targetPath, rel));
        }
        return true;
      } catch (err) {
        logger.error({ err, hash }, "[BuildCacheManager] Directory manifest corrupted");
        return false;
      }
    } else {
      await fs.ensureDir(path.dirname(targetPath));
      await fs.copy(blobPath, targetPath);
      return true;
    }
  }
  /**
   * High-level: Save project sandbox state to CAS.
   */
  static async save(projectId, sourcePath) {
    await this.init();
    const hash = await this.putBlob(sourcePath);
    if (hash) {
      await redis.set(`build:cache:${projectId}`, hash, "EX", 86400 * 7);
      logger.info({ projectId, hash }, "[BuildCacheManager] Project state saved to CAS");
    }
    return hash;
  }
  /**
   * High-level: Restore project sandbox state from CAS.
   */
  static async restore(projectId, targetPath) {
    await this.init();
    const hash = await redis.get(`build:cache:${projectId}`);
    if (!hash) return false;
    logger.info({ projectId, hash }, "[BuildCacheManager] Restoring project state from CAS...");
    return await this.getBlob(hash, targetPath);
  }
};

// src/build-graph-engine.ts
import fs2 from "fs-extra";
import path2 from "path";
import crypto2 from "crypto";
import logger2 from "@packages/utils";
var BuildGraphEngine = class {
  static graphFile = ".multiagent-graph.json";
  /**
   * Analyze a project and determine affected files.
   */
  static async getAffectedNodes(projectDir) {
    const currentGraph = await this.buildGraph(projectDir);
    const previousGraph = await this.loadGraph(projectDir);
    if (!previousGraph) {
      logger2.info("[BuildGraphEngine] No previous graph found. Full build required.");
      await this.saveGraph(projectDir, currentGraph);
      return Object.keys(currentGraph);
    }
    const affected = /* @__PURE__ */ new Set();
    for (const [file, node] of Object.entries(currentGraph)) {
      const prevNode = previousGraph[file];
      if (!prevNode || prevNode.hash !== node.hash) {
        affected.add(file);
      }
    }
    const finalAffected = new Set(affected);
    let changed = true;
    while (changed) {
      changed = false;
      for (const [file, node] of Object.entries(currentGraph)) {
        if (!finalAffected.has(file)) {
          const hasAffectedDep = node.dependencies.some((dep) => finalAffected.has(dep));
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
  static async buildGraph(projectDir) {
    const graph = {};
    const scanDirs = ["src", "app", "components", "lib"];
    const allFiles = [];
    for (const dir of scanDirs) {
      const fullDir = path2.join(projectDir, dir);
      if (await fs2.pathExists(fullDir)) {
        allFiles.push(...await this.walk(fullDir));
      }
    }
    for (const file of allFiles) {
      const relativePath = path2.relative(projectDir, file);
      const content = await fs2.readFile(file, "utf-8");
      const imports = this.extractImports(content);
      const resolvedDeps = imports.map((imp) => this.resolveDep(relativePath, imp, allFiles, projectDir));
      graph[relativePath] = {
        file: relativePath,
        hash: crypto2.createHash("sha256").update(content).digest("hex"),
        dependencies: resolvedDeps.filter((d) => d !== null)
      };
    }
    return graph;
  }
  static extractImports(content) {
    const importRegex = /import\s+.*\s+from\s+['"](.*)['"]/g;
    const matches = [];
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      matches.push(match[1]);
    }
    return matches;
  }
  static resolveDep(sourceFile, importPath, allFiles, projectDir) {
    if (!importPath.startsWith(".")) return null;
    const absoluteImport = path2.resolve(path2.dirname(path2.join(projectDir, sourceFile)), importPath);
    const extensions = [".ts", ".tsx", ".js", ".jsx"];
    for (const ext of extensions) {
      const candidate = absoluteImport + ext;
      if (allFiles.includes(candidate)) return path2.relative(projectDir, candidate);
    }
    for (const ext of extensions) {
      const candidate = path2.join(absoluteImport, "index" + ext);
      if (allFiles.includes(candidate)) return path2.relative(projectDir, candidate);
    }
    return null;
  }
  static async walk(dir) {
    let results = [];
    const list = await fs2.readdir(dir);
    for (const file of list) {
      const fullPath = path2.join(dir, file);
      const stat = await fs2.stat(fullPath);
      if (stat.isDirectory()) {
        results = results.concat(await this.walk(fullPath));
      } else {
        results.push(fullPath);
      }
    }
    return results;
  }
  static async loadGraph(projectDir) {
    const filePath = path2.join(projectDir, this.graphFile);
    if (await fs2.pathExists(filePath)) {
      return fs2.readJSON(filePath);
    }
    return null;
  }
  static async saveGraph(projectDir, graph) {
    const filePath = path2.join(projectDir, this.graphFile);
    await fs2.writeJSON(filePath, graph);
  }
};
export {
  BuildCacheManager,
  BuildGraphEngine
};
//# sourceMappingURL=index.mjs.map