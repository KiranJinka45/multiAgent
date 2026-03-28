"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  BuildCacheManager: () => BuildCacheManager,
  BuildGraphEngine: () => BuildGraphEngine
});
module.exports = __toCommonJS(index_exports);

// src/build-cache-manager.ts
var import_fs_extra = __toESM(require("fs-extra"));
var import_path = __toESM(require("path"));
var import_crypto = __toESM(require("crypto"));
var import_utils = __toESM(require("@packages/utils"));
var import_utils2 = require("@packages/utils");
var BuildCacheManager = class {
  static casRoot = import_path.default.join(process.cwd(), ".cache", "cas");
  static async init() {
    await import_fs_extra.default.ensureDir(this.casRoot);
  }
  /**
   * Store a file or directory in CAS.
   * Returns the hash of the content.
   */
  static async putBlob(sourcePath) {
    if (!await import_fs_extra.default.pathExists(sourcePath)) return "";
    const stat = await import_fs_extra.default.stat(sourcePath);
    let hash;
    if (stat.isDirectory()) {
      const files = await import_fs_extra.default.readdir(sourcePath);
      const manifest = {};
      for (const f of files) {
        manifest[f] = await this.putBlob(import_path.default.join(sourcePath, f));
      }
      const manifestContent = JSON.stringify(manifest);
      hash = import_crypto.default.createHash("sha256").update(manifestContent).digest("hex") + ".dir";
      const blobPath = import_path.default.join(this.casRoot, hash);
      if (!await import_fs_extra.default.pathExists(blobPath)) {
        await import_fs_extra.default.writeJSON(blobPath, manifest);
      }
    } else {
      const content = await import_fs_extra.default.readFile(sourcePath);
      hash = import_crypto.default.createHash("sha256").update(content).digest("hex");
      const blobPath = import_path.default.join(this.casRoot, hash);
      if (!await import_fs_extra.default.pathExists(blobPath)) {
        await import_fs_extra.default.copy(sourcePath, blobPath);
      }
    }
    return hash;
  }
  /**
   * Restore a blob from CAS to a target path.
   */
  static async getBlob(hash, targetPath) {
    const blobPath = import_path.default.join(this.casRoot, hash);
    if (!await import_fs_extra.default.pathExists(blobPath)) return false;
    if (hash.endsWith(".dir")) {
      try {
        const manifest = await import_fs_extra.default.readJSON(blobPath);
        await import_fs_extra.default.ensureDir(targetPath);
        for (const [rel, fileHash] of Object.entries(manifest)) {
          await this.getBlob(fileHash, import_path.default.join(targetPath, rel));
        }
        return true;
      } catch (err) {
        import_utils.default.error({ err, hash }, "[BuildCacheManager] Directory manifest corrupted");
        return false;
      }
    } else {
      await import_fs_extra.default.ensureDir(import_path.default.dirname(targetPath));
      await import_fs_extra.default.copy(blobPath, targetPath);
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
      await import_utils2.redis.set(`build:cache:${projectId}`, hash, "EX", 86400 * 7);
      import_utils.default.info({ projectId, hash }, "[BuildCacheManager] Project state saved to CAS");
    }
    return hash;
  }
  /**
   * High-level: Restore project sandbox state from CAS.
   */
  static async restore(projectId, targetPath) {
    await this.init();
    const hash = await import_utils2.redis.get(`build:cache:${projectId}`);
    if (!hash) return false;
    import_utils.default.info({ projectId, hash }, "[BuildCacheManager] Restoring project state from CAS...");
    return await this.getBlob(hash, targetPath);
  }
};

// src/build-graph-engine.ts
var import_fs_extra2 = __toESM(require("fs-extra"));
var import_path2 = __toESM(require("path"));
var import_crypto2 = __toESM(require("crypto"));
var import_utils3 = __toESM(require("@packages/utils"));
var BuildGraphEngine = class {
  static graphFile = ".multiagent-graph.json";
  /**
   * Analyze a project and determine affected files.
   */
  static async getAffectedNodes(projectDir) {
    const currentGraph = await this.buildGraph(projectDir);
    const previousGraph = await this.loadGraph(projectDir);
    if (!previousGraph) {
      import_utils3.default.info("[BuildGraphEngine] No previous graph found. Full build required.");
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
      const fullDir = import_path2.default.join(projectDir, dir);
      if (await import_fs_extra2.default.pathExists(fullDir)) {
        allFiles.push(...await this.walk(fullDir));
      }
    }
    for (const file of allFiles) {
      const relativePath = import_path2.default.relative(projectDir, file);
      const content = await import_fs_extra2.default.readFile(file, "utf-8");
      const imports = this.extractImports(content);
      const resolvedDeps = imports.map((imp) => this.resolveDep(relativePath, imp, allFiles, projectDir));
      graph[relativePath] = {
        file: relativePath,
        hash: import_crypto2.default.createHash("sha256").update(content).digest("hex"),
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
    const absoluteImport = import_path2.default.resolve(import_path2.default.dirname(import_path2.default.join(projectDir, sourceFile)), importPath);
    const extensions = [".ts", ".tsx", ".js", ".jsx"];
    for (const ext of extensions) {
      const candidate = absoluteImport + ext;
      if (allFiles.includes(candidate)) return import_path2.default.relative(projectDir, candidate);
    }
    for (const ext of extensions) {
      const candidate = import_path2.default.join(absoluteImport, "index" + ext);
      if (allFiles.includes(candidate)) return import_path2.default.relative(projectDir, candidate);
    }
    return null;
  }
  static async walk(dir) {
    let results = [];
    const list = await import_fs_extra2.default.readdir(dir);
    for (const file of list) {
      const fullPath = import_path2.default.join(dir, file);
      const stat = await import_fs_extra2.default.stat(fullPath);
      if (stat.isDirectory()) {
        results = results.concat(await this.walk(fullPath));
      } else {
        results.push(fullPath);
      }
    }
    return results;
  }
  static async loadGraph(projectDir) {
    const filePath = import_path2.default.join(projectDir, this.graphFile);
    if (await import_fs_extra2.default.pathExists(filePath)) {
      return import_fs_extra2.default.readJSON(filePath);
    }
    return null;
  }
  static async saveGraph(projectDir, graph) {
    const filePath = import_path2.default.join(projectDir, this.graphFile);
    await import_fs_extra2.default.writeJSON(filePath, graph);
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BuildCacheManager,
  BuildGraphEngine
});
//# sourceMappingURL=index.js.map