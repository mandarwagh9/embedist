import esp32Pins from './knowledge/esp32/pins.json';
import esp32Errors from './knowledge/esp32/errors.json';
import arduinoPins from './knowledge/arduino/pins.json';
import arduinoErrors from './knowledge/arduino/errors.json';
import commonPatterns from './knowledge/common/patterns.json';

interface KnowledgeDocument {
  id: string;
  category: string;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
}

interface SearchResult {
  document: KnowledgeDocument;
  score: number;
}

const documents: KnowledgeDocument[] = [
  ...(esp32Pins as unknown as { pins: Array<{ pin: string; name: string; functions: string[]; description: string }> }).pins.map((p) => ({
    id: `esp32-pin-${p.pin}`,
    category: 'hardware',
    title: `ESP32 Pin ${p.pin}: ${p.name}`,
    content: `Pin ${p.pin} (${p.name}): ${p.description}. Functions: ${p.functions.join(', ')}`,
    metadata: { type: 'pin', board: 'esp32', pin: p.pin },
  })),
  ...(esp32Errors as unknown as { errors: Array<{ error: string; cause: string; solution: string }> }).errors.map((e, i) => ({
    id: `esp32-error-${i}`,
    category: 'error',
    title: `ESP32 Error: ${e.error.substring(0, 50)}`,
    content: `Error: ${e.error}. Cause: ${e.cause}. Solution: ${e.solution}`,
    metadata: { type: 'error', board: 'esp32' },
  })),
  ...(arduinoPins as unknown as { boards: Array<{ name: string; pins: number; analog: number; pwm: number }> }).boards.flatMap((b) =>
    b.pins ? [{
      id: `arduino-${b.name.toLowerCase().replace(/\s+/g, '-')}`,
      category: 'hardware',
      title: `${b.name} Board Specs`,
      content: `${b.name}: ${b.pins} digital pins, ${b.analog} analog inputs, ${b.pwm} PWM outputs`,
      metadata: { type: 'board', board: 'arduino', name: b.name },
    }] : []
  ),
  ...(arduinoErrors as unknown as { errors: Array<{ error: string; cause: string; solution: string }> }).errors.map((e, i) => ({
    id: `arduino-error-${i}`,
    category: 'error',
    title: `Arduino Error: ${e.error.substring(0, 50)}`,
    content: `Error: ${e.error}. Cause: ${e.cause}. Solution: ${e.solution}`,
    metadata: { type: 'error', board: 'arduino' },
  })),
  ...(commonPatterns as unknown as { patterns: Array<{ name: string; code: string; description: string; example: string }> }).patterns.map((p, i) => ({
    id: `common-pattern-${i}`,
    category: 'code',
    title: p.name,
    content: `${p.name}: ${p.description}. Code: ${p.code}. Example: ${p.example}`,
    metadata: { type: 'pattern' },
  })),
];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2);
}

function computeTF(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  const total = tokens.length;
  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1);
  }
  for (const [key, value] of tf) {
    tf.set(key, value / total);
  }
  return tf;
}

function computeIDF(documents: string[][]): Map<string, number> {
  const idf = new Map<string, number>();
  const N = documents.length;
  const df = new Map<string, number>();
  
  for (const doc of documents) {
    const unique = new Set(doc);
    for (const term of unique) {
      df.set(term, (df.get(term) || 0) + 1);
    }
  }
  
  for (const [term, freq] of df) {
    idf.set(term, Math.log(N / freq));
  }
  
  return idf;
}

function computeTFIDF(tf: Map<string, number>, idf: Map<string, number>): Map<string, number> {
  const tfidf = new Map<string, number>();
  for (const [term, tfValue] of tf) {
    const idfValue = idf.get(term) || 0;
    tfidf.set(term, tfValue * idfValue);
  }
  return tfidf;
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  const allTerms = new Set([...a.keys(), ...b.keys()]);
  
  for (const term of allTerms) {
    const aVal = a.get(term) || 0;
    const bVal = b.get(term) || 0;
    dotProduct += aVal * bVal;
    normA += aVal * aVal;
    normB += bVal * bVal;
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

class RAGEngine {
  private documentTokens: Map<string, string[]> = new Map();
  private documentTFIDF: Map<string, Map<string, number>> = new Map();
  private idf: Map<string, number> = new Map();
  
  constructor() {
    this.index();
  }
  
  private index(): void {
    const allTokens: string[][] = [];
    
    for (const doc of documents) {
      const tokens = tokenize(doc.content);
      this.documentTokens.set(doc.id, tokens);
      allTokens.push(tokens);
    }
    
    this.idf = computeIDF(allTokens);
    
    for (const [id, tokens] of this.documentTokens) {
      const tf = computeTF(tokens);
      this.documentTFIDF.set(id, computeTFIDF(tf, this.idf));
    }
  }
  
  search(query: string, limit: number = 5): SearchResult[] {
    const queryTokens = tokenize(query);
    const queryTF = computeTF(queryTokens);
    const queryTFIDF = computeTFIDF(queryTF, this.idf);
    
    const results: SearchResult[] = [];
    
    for (const doc of documents) {
      const docTFIDF = this.documentTFIDF.get(doc.id);
      if (!docTFIDF) continue;
      
      const score = cosineSimilarity(queryTFIDF, docTFIDF);
      if (score > 0) {
        results.push({ document: doc, score });
      }
    }
    
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
  
  getRelevantContext(query: string, maxResults: number = 3): string {
    const results = this.search(query, maxResults);
    if (results.length === 0) return '';
    
    return results
      .map((r) => `[${r.document.category}] ${r.document.title}\n${r.document.content}`)
      .join('\n\n');
  }
  
  getBoardContext(boardType: string, query: string): string {
    const relevant = documents.filter(
      (d) => d.metadata.board === boardType || !boardType
    );
    
    const relevantIds = new Set(relevant.map((d) => d.id));
    const results = this.search(query, 5).filter((r) => relevantIds.has(r.document.id));
    
    if (results.length === 0) return this.getRelevantContext(query);
    
    return results
      .map((r) => `[${r.document.category}] ${r.document.title}\n${r.document.content}`)
      .join('\n\n');
  }
}

export const ragEngine = new RAGEngine();
export type { KnowledgeDocument, SearchResult };
