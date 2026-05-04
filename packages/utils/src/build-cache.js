"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildCache = void 0;
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const observability_1 = require("@packages/observability");
class BuildCache {
    static CACHE_ROOT = path.join(process.cwd(), '.build-cache');
    /**
     * Restores a node_modules cache into the target directory using symlinks.
     * This is an O(1) operation regardless of dependency size.
     */
    static async restore(templateId, targetDir) {
        const cachePath = path.join(this.CACHE_ROOT, templateId, 'node_modules');
        const targetPath = path.join(targetDir, 'node_modules');
        if (!await fs.pathExists(cachePath)) {
            observability_1.logger.warn({ templateId }, '[BuildCache] Cache miss: No node_modules found for template');
            return false;
        }
        try {
            // Ensure target directory exists
            await fs.ensureDir(targetDir);
            // Create symlink
            // On Windows, this requires 'junction' or 'dir' type if not running as admin
            await fs.symlink(cachePath, targetPath, 'junction');
            observability_1.logger.info({ templateId, targetDir }, '[BuildCache] Cache restored successfully (symlinked)');
            return true;
        }
        catch (err) {
            observability_1.logger.error({ err: err.message, templateId }, '[BuildCache] Failed to restore cache');
            return false;
        }
    }
    /**
     * Saves the current node_modules of a project into the global cache.
     */
    static async save(templateId, sourceDir) {
        const sourcePath = path.join(sourceDir, 'node_modules');
        const cachePath = path.join(this.CACHE_ROOT, templateId, 'node_modules');
        if (!await fs.pathExists(sourcePath)) {
            observability_1.logger.warn({ templateId, sourcePath }, '[BuildCache] Cannot save: Source node_modules not found');
            return;
        }
        try {
            await fs.ensureDir(path.dirname(cachePath));
            // If cache already exists, we might want to update it or skip
            // For now, we'll overwrite it to ensure it's fresh
            if (await fs.pathExists(cachePath)) {
                await fs.remove(cachePath);
            }
            await fs.copy(sourcePath, cachePath);
            observability_1.logger.info({ templateId }, '[BuildCache] Cache updated successfully');
        }
        catch (err) {
            observability_1.logger.error({ err: err.message, templateId }, '[BuildCache] Failed to save cache');
        }
    }
}
exports.BuildCache = BuildCache;
//# sourceMappingURL=build-cache.js.map