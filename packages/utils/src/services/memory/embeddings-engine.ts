import axios from 'axios';
import logger from '../../config/logger';

export class EmbeddingsEngine {
    private static readonly OPENAI_API_URL = 'https://api.openai.com/v1/embeddings';
    private static readonly MODEL = 'text-embedding-3-small';

    /**
     * Generates vector embeddings for a given text string.
     */
    static async generate(text: string): Promise<number[] | null> {
        const apiKey = process.env.OPEN_AI_KEY || process.env.OPENAI_API_KEY;

        if (!apiKey) {
            logger.warn('[EmbeddingsEngine] OPENAI_API_KEY is missing. Skipping vector generation.');
            return null;
        }

        try {
            const response = await axios.post(
                this.OPENAI_API_URL,
                {
                    input: text,
                    model: this.MODEL,
                    encoding_format: 'float',
                },
                {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            return response.data.data[0].embedding;
        } catch (error: any) {
            const errorMsg = error.response?.data?.error?.message || error.message;
            logger.error({ error: errorMsg }, '[EmbeddingsEngine] Failed to generate embedding');
            return null;
        }
    }

    /**
     * Generates embeddings for multiple chunks in a single batch.
     */
    static async generateBatch(texts: string[]): Promise<number[][] | null> {
        const apiKey = process.env.OPEN_AI_KEY || process.env.OPENAI_API_KEY;
        if (!apiKey || texts.length === 0) return null;

        try {
            const response = await axios.post(
                this.OPENAI_API_URL,
                {
                    input: texts,
                    model: this.MODEL,
                    encoding_format: 'float',
                },
                {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            return response.data.data.map((item: any) => item.embedding);
        } catch (error: any) {
            logger.error({ error: error.message }, '[EmbeddingsEngine] Batch generation failed');
            return null;
        }
    }
}
