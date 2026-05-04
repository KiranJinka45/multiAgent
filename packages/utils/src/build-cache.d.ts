export declare class BuildCache {
    private static CACHE_ROOT;
    /**
     * Restores a node_modules cache into the target directory using symlinks.
     * This is an O(1) operation regardless of dependency size.
     */
    static restore(templateId: string, targetDir: string): Promise<boolean>;
    /**
     * Saves the current node_modules of a project into the global cache.
     */
    static save(templateId: string, sourceDir: string): Promise<void>;
}
//# sourceMappingURL=build-cache.d.ts.map