import esp32Pins from './knowledge/esp32/pins.json';
import esp32Errors from './knowledge/esp32/errors.json';
import arduinoPins from './knowledge/arduino/pins.json';
import arduinoErrors from './knowledge/arduino/errors.json';
import commonPatterns from './knowledge/common/patterns.json';
import sensorsData from './knowledge/sensors.json';
import boardComparison from './knowledge/board-comparison.json';
import peripheralsData from './knowledge/peripherals.json';

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

import type { FileNode } from '../types';
import { useFileStore } from '../stores/fileStore';

const INDEXED_EXTENSIONS = new Set([
  '.c', '.cpp', '.h', '.hpp', '.ino', '.py', '.rs', '.asm', '.s',
  '.js', '.ts', '.json', '.yaml', '.yml', '.toml', '.ini', '.cfg',
  '.txt', '.md', '.xml', '.html', '.css', '.lua', '.go', '.java',
]);

const EXCLUDED_DIRS = new Set([
  'node_modules', '.pio', '.pioenvs', '.piolibdeps', '.git',
  'build', 'dist', '.vscode', '.idea', '__pycache', 'venv',
  '.env', '.venv', 'target', 'bin', 'obj',
]);

const MAX_FILE_SIZE = 512 * 1024;

let documents: KnowledgeDocument[] | null = null;
let projectDocuments: KnowledgeDocument[] | null = null;
let isInitialized = false;
let initError: Error | null = null;

function initDocuments(): void {
  if (isInitialized) return;
  
  try {
    const espPins = esp32Pins as Record<string, unknown>;
    const specs = (espPins.specifications || {}) as Record<string, string>;
    const memory = (espPins.memory || {}) as Record<string, string>;
    const variants = (espPins.variants || []) as string[];

    const esp32ErrorsList = (esp32Errors as unknown as Array<{ error: string; cause: string; solution: string }>);

    const arduinoPinsData = arduinoPins as Record<string, unknown>;
    const arduinoBoards = (arduinoPinsData.boards || []) as Array<{ name: string; pins: number; analog: number; pwm: number }>;

    const arduinoErrorsList = (arduinoErrors as unknown as Array<{ error: string; cause: string; solution: string }>);

    const commonPatternsList = commonPatterns as unknown as Array<{ id: string; pattern: string; category: string; cause: string; solution: string }>;

    const sensorsDataObj = sensorsData as Record<string, unknown>;
    const sensorsList = (sensorsDataObj.sensors || []) as Array<{ name: string; interface: string; pins: string; library: string; description: string; common_issues: string[] }>;

    const boardComparisonObj = boardComparison as Record<string, unknown>;
    const boardList = (boardComparisonObj.boards || []) as Array<{ name: string; category: string; cpu: string; freq: string; ram: string; flash: string; wifi: string; bluetooth: string; gpio: number; price: string; best_for: string }>;

    const peripheralsObj = peripheralsData as Record<string, unknown>;
    const peripheralsList = (peripheralsObj.peripherals || []) as Array<{ name: string; interface: string; description: string; esp32_example: string; arduino_example: string; common_pitfalls: string[] }>;

    documents = [
      {
        id: 'esp32-board-info',
        category: 'hardware',
        title: `ESP32 Board Overview`,
        content: `ESP32 Board Overview. CPU: ${specs.cpu || 'unknown'}, Frequency: ${specs.frequency || 'unknown'}, Voltage: ${specs.voltage || 'unknown'}. Memory: Flash ${memory.flash || 'unknown'}, RAM ${memory.ram || 'unknown'}, PSRAM ${memory.psram || 'unknown'}. Connectivity: WiFi ${specs.wifi || 'unknown'}, Bluetooth ${specs.bluetooth || 'unknown'}. Peripherals: ${specs.gpio || 'unknown'} GPIO, ${specs.uart || 'unknown'} UART, ${specs.spi || 'unknown'} SPI, ${specs.i2c || 'unknown'} I2C, ${specs.adc_channels || 'unknown'} ADC, ${specs.dac_channels || 'unknown'} DAC channels. Variants: ${variants.join(', ') || 'unknown'}.`,
        metadata: { type: 'board', board: 'esp32' },
      },
      {
        id: 'esp32-i2c-pins',
        category: 'hardware',
        title: 'ESP32 I2C Pins',
        content: `ESP32 I2C Default: SDA=21, SCL=22. Alternative: SDA=25, SCL=26. The I2C pins are configurable in ESP-IDF. Use Wire.begin(SDA, SCL) in Arduino or i2cdev for ESP-IDF.`,
        metadata: { type: 'pin', board: 'esp32', interface: 'i2c' },
      },
      {
        id: 'esp32-spi-pins',
        category: 'hardware',
        title: 'ESP32 SPI Pins',
        content: `ESP32 SPI (VSPI default): MOSI=23, MISO=19, SCK=18, SS=5. HSPI alternative: MOSI=13, MISO=12, SCK=14, SS=15. In ESP-IDF use SPI bus. In Arduino use SPIClass(VSPI) or SPIClass(HSPI).`,
        metadata: { type: 'pin', board: 'esp32', interface: 'spi' },
      },
      {
        id: 'esp32-uart-pins',
        category: 'hardware',
        title: 'ESP32 UART Pins',
        content: `ESP32 UART0 (USB): TX=1, RX=3 (used for flashing). UART1: TX=10, RX=9 (GPIO 9/10 are also PSRAM on WROVER). UART2: TX=17, RX=16. Use Serial.begin(baud) for UART0. For UART2 use Serial2.begin(baud, SERIAL_8N1, RX, TX).`,
        metadata: { type: 'pin', board: 'esp32', interface: 'uart' },
      },
      {
        id: 'esp32-adc-pins',
        category: 'hardware',
        title: 'ESP32 ADC Pins',
        content: `ESP32 ADC1: GPIO 32-39 (used for WiFi). ADC2: GPIO 0,2,4,12-15,25-27 (conflicts with WiFi). ADC resolution is 12-bit (0-4095). Voltage range 0-1.1V (or 0-3.3V with attenuation). Use analogRead(pin) in Arduino.`,
        metadata: { type: 'pin', board: 'esp32', interface: 'adc' },
      },
      {
        id: 'esp32-pwm-pins',
        category: 'hardware',
        title: 'ESP32 PWM Pins',
        content: `ESP32 has 16 PWM channels. All GPIO pins support PWM except GPIO 34-39 (input only). Use ledcSetup(channel, freq, bits) and ledcWrite(channel, duty) in Arduino. Typical frequency: 1kHz, 8-bit resolution (0-255).`,
        metadata: { type: 'pin', board: 'esp32', interface: 'pwm' },
      },
      {
        id: 'esp32-touch-pins',
        category: 'hardware',
        title: 'ESP32 Touch Pins',
        content: `ESP32 has 10 touch pins: T0=GPIO4, T1=GPIO0, T2=GPIO2, T3=GPIO15, T4=GPIO13, T5=GPIO12, T6=GPIO14, T7=GPIO27, T8=GPIO33, T9=GPIO32. Touch threshold typically ~40. Use touchRead(pin) in Arduino.`,
        metadata: { type: 'pin', board: 'esp32', interface: 'touch' },
      },
      ...esp32ErrorsList.map((e, i) => ({
        id: `esp32-error-${i}`,
        category: 'error',
        title: `ESP32 Error: ${e.error?.substring(0, 50) || 'Unknown'}`,
        content: `Error: ${e.error || 'Unknown'}. Cause: ${e.cause || 'Unknown'}. Solution: ${e.solution || 'Unknown'}`,
        metadata: { type: 'error', board: 'esp32' },
      })),
      ...arduinoBoards.flatMap((b) =>
        b.pins ? [{
          id: `arduino-${b.name.toLowerCase().replace(/\s+/g, '-')}`,
          category: 'hardware',
          title: `${b.name} Board Specs`,
          content: `${b.name}: ${b.pins} digital pins, ${b.analog} analog inputs, ${b.pwm} PWM outputs. Standard Arduino board.`,
          metadata: { type: 'board', board: 'arduino', name: b.name },
        }] : []
      ),
      ...arduinoErrorsList.map((e, i) => ({
        id: `arduino-error-${i}`,
        category: 'error',
        title: `Arduino Error: ${e.error?.substring(0, 50) || 'Unknown'}`,
        content: `Error: ${e.error || 'Unknown'}. Cause: ${e.cause || 'Unknown'}. Solution: ${e.solution || 'Unknown'}`,
        metadata: { type: 'error', board: 'arduino' },
      })),
      ...commonPatternsList.map((p, i) => ({
        id: `common-pattern-${i}`,
        category: 'code',
        title: `${p.pattern} (${p.category})`,
        content: `Pattern: ${p.pattern}. Category: ${p.category}. Cause: ${p.cause}. Solution: ${p.solution}`,
        metadata: { type: 'pattern', category: p.category },
      })),
      ...sensorsList.map((s, i) => ({
        id: `sensor-${i}`,
        category: 'hardware',
        title: s.name,
        content: `${s.name} sensor. Interface: ${s.interface}. Pins: ${s.pins}. Library: ${s.library}. Description: ${s.description}. Common issues: ${(s.common_issues || []).join('. ')}`,
        metadata: { type: 'sensor', name: s.name, interface: s.interface },
      })),
      ...boardList.map((b, i) => ({
        id: `board-comp-${i}`,
        category: 'hardware',
        title: `${b.name} Comparison`,
        content: `${b.name}. Category: ${b.category}. CPU: ${b.cpu} at ${b.freq}. RAM: ${b.ram}. Flash: ${b.flash}. WiFi: ${b.wifi}. Bluetooth: ${b.bluetooth}. GPIO: ${b.gpio}. Price: ${b.price}. Best for: ${b.best_for}.`,
        metadata: { type: 'board', name: b.name, category: b.category },
      })),
      ...peripheralsList.map((p, i) => ({
        id: `peripheral-${i}`,
        category: 'code',
        title: `${p.name} (${p.interface})`,
        content: `${p.name} via ${p.interface}. ${p.description}. ESP32 Example: ${p.esp32_example}. Arduino Example: ${p.arduino_example}. Common pitfalls: ${(p.common_pitfalls || []).join('. ')}`,
        metadata: { type: 'peripheral', name: p.name, interface: p.interface },
      })),
    ];
    isInitialized = true;
  } catch (err) {
    initError = err instanceof Error ? err : new Error(String(err));
  }
}

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
  if (total === 0) return tf;
  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1);
  }
  for (const [key, value] of tf) {
    tf.set(key, value / total);
  }
  return tf;
}

function computeIDF(docs: string[][]): Map<string, number> {
  const idf = new Map<string, number>();
  const N = docs.length;
  const df = new Map<string, number>();
  
  for (const doc of docs) {
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
  private projectTokens: Map<string, string[]> = new Map();
  private projectTFIDF: Map<string, Map<string, number>> = new Map();
  private idf: Map<string, number> = new Map();
  private projectIdf: Map<string, number> = new Map();
  
  constructor() {
  }
  
  private isIndexableFile(node: FileNode): boolean {
    if (node.isDir) return false;
    if (node.size > MAX_FILE_SIZE) return false;
    const ext = node.name.includes('.') ? node.name.substring(node.name.lastIndexOf('.')).toLowerCase() : '';
    return INDEXED_EXTENSIONS.has(ext);
  }
  
  private isExcludedDir(name: string): boolean {
    return EXCLUDED_DIRS.has(name.toLowerCase());
  }
  
  private collectFiles(nodes: FileNode[]): FileNode[] {
    const result: FileNode[] = [];
    for (const node of nodes) {
      if (node.isDir) {
        if (!this.isExcludedDir(node.name) && node.children) {
          result.push(...this.collectFiles(node.children));
        }
      } else if (this.isIndexableFile(node)) {
        result.push(node);
      }
    }
    return result;
  }
  
  indexProject(files: FileNode[], projectName: string = 'project'): number {
    const indexableFiles = this.collectFiles(files);
    const fileContents = useFileStore.getState().fileContents;
    
    projectDocuments = indexableFiles.map((file) => ({
      id: `project-${file.path}`,
      category: 'project',
      title: file.name,
      content: fileContents.get(file.path) || '',
      metadata: {
        type: 'project-file',
        path: file.path,
        name: file.name,
        project: projectName,
      },
    }));
    
    this.reindexProject();
    
    return projectDocuments.length;
  }
  
  addProjectFileContent(path: string, content: string): void {
    if (!projectDocuments) return;
    
    const idx = projectDocuments.findIndex((d) => d.metadata.path === path);
    if (idx !== -1) {
      projectDocuments = projectDocuments.map((d, i) =>
        i === idx ? { ...d, content } : d
      );
      this.reindexProject();
    }
  }
  
  clearProjectIndex(): void {
    projectDocuments = null;
    this.projectTokens.clear();
    this.projectTFIDF.clear();
    this.projectIdf.clear();
  }
  
  private reindexProject(): void {
    if (!projectDocuments || projectDocuments.length === 0) return;
    
    this.projectTokens.clear();
    this.projectTFIDF.clear();
    
    const allTokens: string[][] = [];
    
    for (const doc of projectDocuments) {
      const tokens = tokenize(doc.content);
      if (tokens.length > 0) {
        this.projectTokens.set(doc.id, tokens);
        allTokens.push(tokens);
      }
    }
    
    if (allTokens.length > 0) {
      this.projectIdf = computeIDF(allTokens);
      
      for (const [id, tokens] of this.projectTokens) {
        const tf = computeTF(tokens);
        this.projectTFIDF.set(id, computeTFIDF(tf, this.projectIdf));
      }
    }
  }
  
  getIndexedFileCount(): number {
    return projectDocuments?.length ?? 0;
  }
  
  private ensureInitialized(): void {
    initDocuments();
    
    if (initError) {
      console.error('[RAGEngine] Init error:', initError);
      return;
    }
    
    if (documents === null || !isInitialized) {
      return;
    }
    
    if (this.documentTokens.size === 0) {
      this.index();
    }
  }
  
  private index(): void {
    if (!documents) return;
    
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
    try {
      this.ensureInitialized();
    } catch (err) {
      console.error('[RAGEngine] Search failed:', err);
      return [];
    }
    
    if (!documents) return [];
    
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
    
    if (this.projectTokens.size > 0) {
      const projectQueryTFIDF = computeTFIDF(queryTF, this.projectIdf);
      
      for (const doc of projectDocuments || []) {
        const docTFIDF = this.projectTFIDF.get(doc.id);
        if (!docTFIDF) continue;
        
        const score = cosineSimilarity(projectQueryTFIDF, docTFIDF);
        if (score > 0) {
          results.push({ document: doc, score: score * 1.5 });
        }
      }
    }
    
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
  
  getRelevantContext(query: string, maxResults: number = 3): string {
    const results = this.search(query, maxResults + 2);
    if (results.length === 0) return '';
    
    const projectResults = results.filter((r) => r.document.category === 'project');
    const staticResults = results.filter((r) => r.document.category !== 'project');
    
    const parts: string[] = [];
    
    if (projectResults.length > 0) {
      parts.push('## Project Files\n');
      for (const r of projectResults.slice(0, Math.min(2, maxResults))) {
        const path = r.document.metadata.path as string;
        parts.push(`[${path}]\n${r.document.content.slice(0, 1000)}`);
      }
    }
    
    if (staticResults.length > 0) {
      if (parts.length > 0) parts.push('');
      parts.push('## Hardware Knowledge\n');
      for (const r of staticResults.slice(0, Math.min(2, maxResults))) {
        parts.push(`[${r.document.category}] ${r.document.title}\n${r.document.content}`);
      }
    }
    
    return parts.join('\n\n');
  }
  
  getBoardContext(boardType: string, query: string): string {
    try {
      this.ensureInitialized();
    } catch (err) {
      console.error('[RAGEngine] getBoardContext failed:', err);
      return '';
    }
    
    if (!documents) return '';
    
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
