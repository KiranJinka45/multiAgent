import logger from '@packages/utils';

export interface PatchAction {
    type: 'replace_section' | 'append_after' | 'prepend_before' | 'insert_at_top';
    anchor?: string; // The text or comment marker to look for
    section?: string; // High-level section name (mapped to markers in templates)
    content: string;
}

export interface FilePatch {
    path: string;
    actions: PatchAction[];
}

export class FilePatchService {
    /**
     * Applies a set of patches to a file's content.
     */
    applyPatches(content: string, actions: PatchAction[]): string {
        let result = content;

        for (const action of actions) {
            try {
                switch (action.type) {
                    case 'replace_section':
                        result = this.replaceSection(result, action.section!, action.content);
                        break;
                    case 'append_after':
                        result = this.appendAfter(result, action.anchor!, action.content);
                        break;
                    case 'prepend_before':
                        result = this.prependBefore(result, action.anchor!, action.content);
                        break;
                    case 'insert_at_top':
                        result = action.content + '\n' + result;
                        break;
                    default:
                        logger.warn({ type: action.type }, '[FilePatchService] Unknown patch type');
                }
            } catch (err) {
                logger.error({ err, action }, '[FilePatchService] Failed to apply patch action');
            }
        }

        return result;
    }

    private replaceSection(content: string, section: string, replacement: string): string {
        // Look for common marker patterns:
        // /* @section: NAME */ ... /* @endsection: NAME */
        // <!-- @section: NAME --> ... <!-- @endsection: NAME -->
        const patterns = [
            new RegExp(`(\\{?\\s*/\\*\\s*@section:\\s*${section}\\s*\\*/\\s*\\}?)([\\s\\S]*?)(\\{?\\s*/\\*\\s*@endsection:\\s*${section}\\s*\\*/\\s*\\}?)`, 'g'),
            new RegExp(`(<!--\\s*@section:\\s*${section}\\s*-->)([\\s\\S]*?)(<!--\\s*@endsection:\\s*${section}\\s*-->)`, 'g')
        ];

        let updated = content;
        let matched = false;

        for (const pattern of patterns) {
            if (pattern.test(content)) {
                updated = updated.replace(pattern, `$1\n${replacement}\n$3`);
                matched = true;
                break;
            }
        }

        if (!matched) {
            logger.warn({ section }, '[FilePatchService] Section marker not found for replacement');
            // Fallback: If it's a critical section like 'hero' and not found, maybe append? 
            // For now, let's keep it strict to ensure determinism.
        }

        return updated;
    }

    private appendAfter(content: string, anchor: string, replacement: string): string {
        if (!content.includes(anchor)) {
            logger.warn({ anchor }, '[FilePatchService] Anchor not found for append_after');
            return content;
        }
        return content.replace(anchor, `${anchor}\n${replacement}`);
    }

    private prependBefore(content: string, anchor: string, replacement: string): string {
        if (!content.includes(anchor)) {
            logger.warn({ anchor }, '[FilePatchService] Anchor not found for prepend_before');
            return content;
        }
        return content.replace(anchor, `${replacement}\n${anchor}`);
    }
}

export const filePatchService = new FilePatchService();
