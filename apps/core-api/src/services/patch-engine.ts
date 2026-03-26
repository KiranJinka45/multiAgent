import { logger } from '@libs/observability';
import fs from 'fs-extra';
import path from 'path';

export interface Patch {
    path: string;
    anchor?: string; // e.g. "HERO_SECTION"
    content: string;
}

export class PatchEngine {
    /**
     * Applies a patch to existing file content using anchor markers.
     * Markers format: <!-- ANCHOR_START --> and <!-- ANCHOR_END -->
     */
    applyAnchorPatch(fileContent: string, anchor: string, replacement: string): string {
        const startMarker = `<!-- ${anchor}_START -->`;
        const endMarker = `<!-- ${anchor}_END -->`;

        const startIndex = fileContent.indexOf(startMarker);
        const endIndex = fileContent.indexOf(endMarker);

        if (startIndex === -1 || endIndex === -1) {
            logger.warn({ anchor }, '[PatchEngine] Anchor markers not found. Falling back to append mode.');
            // Fallback: Append before the last closing tag or at the end
            return this.fallbackPatch(fileContent, replacement);
        }

        const before = fileContent.substring(0, startIndex + startMarker.length);
        const after = fileContent.substring(endIndex);

        return `${before}\n${replacement}\n${after}`;
    }

    /**
     * Fallback strategy when anchors are missing.
     * For TSX/JSX, we try to insert before the last export or end of file.
     */
    private fallbackPatch(content: string, replacement: string): string {
        // Smart fallback logic can be expanded here. 
        // For now, we append with a clear warning comment.
        return `${content}\n\n// --- AI Generated Patch (Fallback) ---\n${replacement}\n`;
    }

    /**
     * Mass apply patches to a virtual file system.
     */
    applyPatches(files: { path: string, content: string }[], patches: Patch[]): { path: string, content: string }[] {
        const updatedFiles = [...files];

        for (const patch of patches) {
            const fileIndex = updatedFiles.findIndex(f => f.path === patch.path);
            
            if (fileIndex !== -1) {
                if (patch.anchor) {
                    updatedFiles[fileIndex].content = this.applyAnchorPatch(
                        updatedFiles[fileIndex].content,
                        patch.anchor,
                        patch.content
                    );
                } else {
                    // Whole file replacement if no anchor
                    updatedFiles[fileIndex].content = patch.content;
                }
            } else {
                // New file
                updatedFiles.push({ path: patch.path, content: patch.content });
            }
        }

        return updatedFiles;
    }

    async applyPatch(projectId: string, filePath: string, content: string) {
        const sandboxDir = path.join(process.cwd(), '.generated-projects', projectId);
        const fullPath = path.join(sandboxDir, filePath);
        try {
            await fs.ensureDir(path.dirname(fullPath));
            await fs.writeFile(fullPath, content);
            logger.info({ projectId, filePath }, '[PatchEngine] Single patch applied to sandbox');
        } catch (err) {
            logger.error({ projectId, filePath, err }, '[PatchEngine] Single patch failed');
        }
    }
}

export const patchEngine = new PatchEngine();
