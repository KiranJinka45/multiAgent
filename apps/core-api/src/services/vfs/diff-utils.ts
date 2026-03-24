import fs from 'fs';
import path from 'path';

export interface FileDiff {
    path: string;
    oldContent: string;
    newContent: string;
    type: 'create' | 'modify' | 'delete';
}

export class DiffUtils {
    /**
     * Generates a list of diffs between the current disk state and the VFS state.
     */
    static generateDiffs(vfsFiles: { path: string, content: string }[], targetDir: string): FileDiff[] {
        const diffs: FileDiff[] = [];

        for (const file of vfsFiles) {
            const absolutePath = path.join(targetDir, file.path);
            let oldContent = '';
            let type: 'create' | 'modify' | 'delete' = 'create';

            if (fs.existsSync(absolutePath)) {
                oldContent = fs.readFileSync(absolutePath, 'utf8');
                type = 'modify';
            }

            if (oldContent !== file.content) {
                diffs.push({
                    path: file.path,
                    oldContent,
                    newContent: file.content,
                    type
                });
            }
        }

        return diffs;
    }

    /**
     * Simple unified diff generator (minimal implementation)
     */
    static toUnifiedDiff(diff: FileDiff): string {
        const oldLines = diff.oldContent.split('\n');
        const newLines = diff.newContent.split('\n');

        // This is a very naive diff for demonstration. 
        // In a real system, we'd use 'diff' or 'jsdiff' library.
        let result = `--- ${diff.path} (original)\n+++ ${diff.path} (vfs)\n`;

        if (diff.type === 'create') {
            return result + newLines.map(l => `+${l}`).join('\n');
        }

        if (diff.type === 'delete') {
            return result + oldLines.map(l => `-${l}`).join('\n');
        }

        // Just show the new content for now as a simple fallback
        // The UI component (react-diff-viewer) usually handles the line-by-line comparison.
        return result + " [Line-by-line diff generated in UI] ";
    }
}
