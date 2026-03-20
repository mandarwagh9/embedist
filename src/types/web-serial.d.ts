interface SerialPortFilter {
  usbVendorId?: number;
  usbProductId?: number;
}

interface SerialOptions {
  baudRate: number;
  dataBits?: 8;
  stopBits?: 1;
  parity?: 'none' | 'even' | 'odd';
  bufferSize?: number;
  flowControl?: 'none' | 'hardware';
}

interface SerialInfo {
  usbVendorId?: number;
  usbProductId?: number;
  path: string;
}

interface Serial {
  requestPort(options?: { filters: SerialPortFilter[] }): Promise<SerialPort>;
  getPorts(): Promise<SerialPort[]>;
}

interface SerialPort {
  readable: ReadableStream<ArrayBuffer> | null;
  writable: WritableStream<ArrayBuffer> | null;
  getInfo(): SerialInfo;
  open(options: SerialOptions): Promise<void>;
  close(): Promise<void>;
}

declare global {
  interface Navigator {
    serial?: Serial;
  }
}

export {};

