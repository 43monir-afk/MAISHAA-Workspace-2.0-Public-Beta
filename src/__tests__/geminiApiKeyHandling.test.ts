import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { getAiApiKey, getAiClient } from '../../server';

describe('MAISHAA WORKSPACE 2 - Gemini API Key Handling', () => {
  const originalEnvKey = process.env.GEMINI_API_KEY;
  const testEnvPath = path.resolve(process.cwd(), '.env.test-local');

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    if (originalEnvKey !== undefined) {
      process.env.GEMINI_API_KEY = originalEnvKey;
    } else {
      delete process.env.GEMINI_API_KEY;
    }
    if (fs.existsSync(testEnvPath)) {
      try {
        fs.unlinkSync(testEnvPath);
      } catch {
        // ignore
      }
    }
  });

  it('1. AI Studio injected secret: Returns non-empty process.env.GEMINI_API_KEY', () => {
    process.env.GEMINI_API_KEY = 'AIzaSyTestInjectedSecret12345';
    const key = getAiApiKey();
    expect(key).toBe('AIzaSyTestInjectedSecret12345');
    const client = getAiClient();
    expect(client).not.toBeNull();
  });

  it('2. Local Windows environment: Blank-variable override problem solved', () => {
    // Simulate Windows OS environment having empty string GEMINI_API_KEY=""
    process.env.GEMINI_API_KEY = '';

    // Mock fs.existsSync and fs.readFileSync for .env
    const spyExists = vi.spyOn(fs, 'existsSync').mockImplementation((p: any) => {
      return String(p).endsWith('.env');
    });
    const spyReadFile = vi.spyOn(fs, 'readFileSync').mockImplementation((p: any) => {
      if (String(p).endsWith('.env')) {
        return 'GEMINI_API_KEY="AIzaSyLocalWindowsFileKey98765"\nAPP_URL="http://localhost:3000"';
      }
      return '';
    });

    const key = getAiApiKey();
    expect(key).toBe('AIzaSyLocalWindowsFileKey98765');
    expect(process.env.GEMINI_API_KEY).toBe('AIzaSyLocalWindowsFileKey98765');

    spyExists.mockRestore();
    spyReadFile.mockRestore();
  });

  it('3. Strips quotes around GEMINI_API_KEY', () => {
    process.env.GEMINI_API_KEY = '"AIzaSyQuotedKey123"';
    const key = getAiApiKey();
    expect(key).toBe('AIzaSyQuotedKey123');

    process.env.GEMINI_API_KEY = "'AIzaSySingleQuotedKey456'";
    const singleKey = getAiApiKey();
    expect(singleKey).toBe('AIzaSySingleQuotedKey456');
  });

  it('4. Ignores placeholder keys and returns null when not configured', () => {
    process.env.GEMINI_API_KEY = 'MY_GEMINI_API_KEY';
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);

    const key = getAiApiKey();
    expect(key).toBeNull();
    const client = getAiClient();
    expect(client).toBeNull();
  });

  it('5. Returns null when GEMINI_API_KEY is whitespace or empty', () => {
    process.env.GEMINI_API_KEY = '   ';
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);

    const key = getAiApiKey();
    expect(key).toBeNull();
  });
});
