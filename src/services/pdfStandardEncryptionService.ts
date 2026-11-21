/**
 * Standards-compliant PDF password protection (AES-256) using QPDF compiled to WebAssembly.
 *
 * Unlike the legacy "MAISHAA secure envelope", files produced here are real PDFs that open with a
 * password in Adobe Acrobat, Chrome, Edge, Firefox, macOS Preview and mobile PDF apps.
 * Everything runs in the browser; the PDF never leaves the device.
 */
import createQpdfModule from '@neslinesli93/qpdf-wasm';
import qpdfWasmUrl from '@neslinesli93/qpdf-wasm/dist/qpdf.wasm?url';

let wasmLocation: string = qpdfWasmUrl;

/** Override where the .wasm file is loaded from (used by tests running in Node). */
export function setQpdfWasmLocation(location: string): void {
  wasmLocation = location;
}

export interface PdfPermissions {
  printing?: boolean;
  copying?: boolean;
  modifying?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QpdfInstance = any;

async function runQpdf(
  input: Uint8Array,
  buildArgs: (inPath: string, outPath: string) => string[]
): Promise<{ output: Uint8Array | null; exitCode: number; log: string }> {
  const logs: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qpdf: QpdfInstance = await (createQpdfModule as any)({
    locateFile: () => wasmLocation,
    noInitialRun: true,
    print: (t: string) => logs.push(t),
    printErr: (t: string) => logs.push(t),
  });

  const inPath = '/in.pdf';
  const outPath = '/out.pdf';
  qpdf.FS.writeFile(inPath, input);

  let exitCode = 0;
  try {
    exitCode = qpdf.callMain(buildArgs(inPath, outPath));
  } catch (e) {
    // Emscripten may throw an ExitStatus object for non-zero exits.
    exitCode = typeof (e as { status?: number })?.status === 'number' ? (e as { status: number }).status : 2;
    logs.push(String((e as Error)?.message ?? e));
  }

  let output: Uint8Array | null = null;
  try {
    output = qpdf.FS.readFile(outPath);
  } catch {
    output = null;
  }
  try {
    qpdf.FS.unlink(inPath);
    qpdf.FS.unlink(outPath);
  } catch {
    /* ignore cleanup errors */
  }
  return { output, exitCode, log: logs.join('\n') };
}

const toBlob = (bytes: Uint8Array) =>
  new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });

/**
 * Protect a PDF with a password using standard AES-256 encryption.
 * The same password opens the file and owns it; permissions restrict printing/copying/editing in compliant readers.
 */
export async function encryptPdfStandard(
  file: File | Blob,
  password: string,
  permissions: PdfPermissions = {}
): Promise<{ blob: Blob; size: number; cipher: 'AES-256' }> {
  if (!password) {
    throw new Error('পাসওয়ার্ড প্রদান করুন (Please enter a password)');
  }
  const input = new Uint8Array(await file.arrayBuffer());

  const { output, exitCode, log } = await runQpdf(input, (inPath, outPath) => {
    const args = ['--encrypt', password, password, '256'];
    if (permissions.printing === false) args.push('--print=none');
    if (permissions.copying === false) args.push('--extract=n');
    if (permissions.modifying === false) args.push('--modify=none');
    args.push('--', inPath, outPath);
    return args;
  });

  // qpdf exit code 3 means "completed with warnings", the output is still valid.
  if (!output || output.length === 0 || (exitCode !== 0 && exitCode !== 3)) {
    throw new Error(`এনক্রিপশন ব্যর্থ হয়েছে (Encryption failed). ${log.slice(0, 200)}`);
  }
  const blob = toBlob(output);
  return { blob, size: blob.size, cipher: 'AES-256' };
}

/**
 * Remove the password from a standard-encrypted PDF. Throws a clear message on a wrong password.
 */
export async function decryptPdfStandard(
  file: File | Blob,
  password: string
): Promise<{ blob: Blob; size: number }> {
  if (!password) {
    throw new Error('পাসওয়ার্ড প্রদান করুন (Please enter password)');
  }
  const input = new Uint8Array(await file.arrayBuffer());

  const { output, exitCode, log } = await runQpdf(input, (inPath, outPath) => [
    `--password=${password}`,
    '--decrypt',
    inPath,
    outPath,
  ]);

  if (!output || output.length === 0 || (exitCode !== 0 && exitCode !== 3)) {
    // Observed with this build: `--requires-password` returns 3 when the password is correct and 2 otherwise.
    const check = await runQpdf(input, (inPath) => ['--requires-password', `--password=${password}`, inPath]);
    const passwordLooksWrong = check.exitCode !== 3 && (await isPdfStandardEncrypted(file));
    if (passwordLooksWrong) {
      throw new Error('ভুল পাসওয়ার্ড! অনুগ্রহ করে সঠিক পাসওয়ার্ড দিন (Incorrect password. Please verify and try again.)');
    }
    throw new Error(`পাসওয়ার্ড সরানো যায়নি (Could not remove the password). ${log.slice(0, 200)}`);
  }
  const blob = toBlob(output);
  return { blob, size: blob.size };
}

/** True when the PDF carries a standard /Encrypt dictionary. */
export async function isPdfStandardEncrypted(file: File | Blob): Promise<boolean> {
  try {
    const buf = new Uint8Array(await file.arrayBuffer());
    // The trailer is near the end of the file; decode the last 4 KB (and first 1 KB for linearized files).
    const dec = new TextDecoder('latin1');
    const tail = dec.decode(buf.slice(Math.max(0, buf.length - 4096)));
    const head = dec.decode(buf.slice(0, 1024));
    return /\/Encrypt\b/.test(tail) || /\/Encrypt\b/.test(head);
  } catch {
    return false;
  }
}
