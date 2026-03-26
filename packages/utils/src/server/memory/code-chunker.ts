import logger from '@libs/observability';

export interface CodeChunk {
    content: string;
    metadata: {
        purpose: string;
        tech_stack: string;
        filePath: string;
    };
}

export class CodeChunker {
    /**
     * Splits a project's files into semantic chunks suitable for embedding.
     * Currently chunks by file and simple logical boundaries.
     */
    static chunkProject(
        techStack: { framework: string; styling: string; backend: string; database: string },
        files: { path: string; content: string; purpose?: string }[]
    ): CodeChunk[] {
        const chunks: CodeChunk[] = [];
        const techStackString = `${techStack.framework}+${techStack.styling}+${techStack.database}`;

        for (const file of files) {
            // Very simple chunking for now: 1 file = 1 chunk
            // For larger files (e.g. > 1000 lines), we would split by AST/functions here.
            chunks.push({
                content: file.content,
                metadata: {
                    purpose: file.purpose || this.inferPurpose(file.path),
                    tech_stack: techStackString,
                    filePath: file.path
                }
            });
        }

        logger.info({ chunkCount: chunks.length }, '[CodeChunker] Chunked project files');
        return chunks;
    }

    private static inferPurpose(filePath: string): string {
        const fp = filePath.toLowerCase();
        if (fp.includes('page')) return 'Page UI';
        if (fp.includes('api/')) return 'API Logic';
        if (fp.includes('schema')) return 'Database Schema';
        if (fp.includes('components/')) return 'UI Component';
        return 'Project File';
    }
}
