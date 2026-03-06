import { VirtualFileSystem } from './virtual-fs';

export interface VfsPatch {
    path: string;
    action?: string; // create, modify, delete
    type?: string;   // alias for action
    content?: string;
}

export class PatchEngine {
    /**
     * Safely applies a set of unstructured patch actions from an AI payload 
     * to the Virtual File System. Does NOT write to disk yet.
     */
    static applyPatches(vfs: VirtualFileSystem, patches: VfsPatch[]) {
        for (const patch of patches) {
            const action = (patch.action || patch.type || 'modify').toLowerCase();
            const normalizedPath = patch.path.replace(/^\//, '');

            if (action === 'delete') {
                vfs.deleteFile(normalizedPath);
            } else if (action === 'create' || action === 'modify') {
                if (patch.content === undefined) {
                    console.warn(`[PatchEngine] Attempted to ${action} ${normalizedPath} but no content provided. Skipping.`);
                    continue;
                }
                vfs.setFile(normalizedPath, patch.content, true);
            } else {
                console.warn(`[PatchEngine] Unknown patch action '${action}' for ${normalizedPath}`);
            }
        }
    }
}
