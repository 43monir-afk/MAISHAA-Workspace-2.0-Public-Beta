declare module 'pako' {
  export interface InflateOptions {
    raw?: boolean;
    to?: 'string';
    windowBits?: number;
  }
  export function inflate(data: Uint8Array | ArrayBuffer, options: { to: 'string' } & InflateOptions): string;
  export function inflate(data: Uint8Array | ArrayBuffer, options?: InflateOptions): Uint8Array;
  export function inflateRaw(data: Uint8Array | ArrayBuffer, options: { to: 'string' } & InflateOptions): string;
  export function inflateRaw(data: Uint8Array | ArrayBuffer, options?: InflateOptions): Uint8Array;
  export function deflate(data: Uint8Array | string, options?: any): Uint8Array;
  const pako: {
    inflate: typeof inflate;
    inflateRaw: typeof inflateRaw;
    deflate: typeof deflate;
  };
  export default pako;
}
