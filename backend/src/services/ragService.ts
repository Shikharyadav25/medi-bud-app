export interface DocumentChunk {
  id: string;
  userId: string;
  documentId: string;
  title: string;
  date: string;
  category: string;
  text: string;
  embedding?: number[];
  metadata?: Record<string, unknown>;
}

export interface SearchResult {
  chunk: DocumentChunk;
  score: number;
}

// In-memory vector index for indexed user document chunks
const vectorStore: Map<string, DocumentChunk[]> = new Map();

function simpleCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Lightweight deterministic semantic projection when offline or without embedding API
function generatePseudoEmbedding(text: string, dimensions = 64): number[] {
  const words = text.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/);
  const vec = new Array(dimensions).fill(0);
  for (const word of words) {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = (hash << 5) - hash + word.charCodeAt(i);
      hash |= 0;
    }
    const bucket = Math.abs(hash) % dimensions;
    vec[bucket] += 1;
  }
  const norm = Math.sqrt(vec.reduce((acc, v) => acc + v * v, 0));
  return norm === 0 ? vec : vec.map((v) => v / norm);
}

export class RAGService {
  public static splitIntoChunks(
    text: string,
    meta: { userId: string; documentId: string; title: string; date: string; category: string },
    maxChunkChars = 400
  ): DocumentChunk[] {
    const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
    const chunks: DocumentChunk[] = [];
    let currentChunk = '';
    let index = 0;

    for (const para of paragraphs) {
      if ((currentChunk + ' ' + para).length > maxChunkChars && currentChunk.length > 0) {
        chunks.push({
          id: `${meta.documentId}-chk-${index++}`,
          ...meta,
          text: currentChunk.trim(),
          embedding: generatePseudoEmbedding(currentChunk),
        });
        currentChunk = para;
      } else {
        currentChunk = currentChunk ? `${currentChunk}\n${para}` : para;
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push({
        id: `${meta.documentId}-chk-${index++}`,
        ...meta,
        text: currentChunk.trim(),
        embedding: generatePseudoEmbedding(currentChunk),
      });
    }

    return chunks;
  }

  public static async indexDocumentChunks(userId: string, chunks: DocumentChunk[]): Promise<void> {
    const existing = vectorStore.get(userId) || [];
    // Remove previous chunks for the same documentId to allow updates
    const docIds = new Set(chunks.map((c) => c.documentId));
    const filtered = existing.filter((c) => !docIds.has(c.documentId));
    vectorStore.set(userId, [...filtered, ...chunks]);
  }

  public static async searchRelevantChunks(
    userId: string,
    query: string,
    topK = 3
  ): Promise<SearchResult[]> {
    const userChunks = vectorStore.get(userId) || [];
    if (userChunks.length === 0) return [];

    const queryEmbedding = generatePseudoEmbedding(query);
    const scored: SearchResult[] = [];

    for (const chunk of userChunks) {
      const chunkEmbedding = chunk.embedding || generatePseudoEmbedding(chunk.text);
      const score = simpleCosineSimilarity(queryEmbedding, chunkEmbedding);
      scored.push({ chunk, score });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  public static clearUserChunks(userId: string): void {
    vectorStore.delete(userId);
  }
}
