/**
 * MAISHAA WORKSPACE 2 - Centralized Single-Download Manager
 *
 * Guaranteed Single-Download Architecture:
 * - One user click = exactly ONE download.
 * - Centralized anchor lifecycle: create, append, click, remove, revoke.
 * - In-flight deduplication & rapid double-click guard.
 * - No duplicate copies, no silent multiple triggers, no event bubbling double-downloads.
 */

// Track active in-flight downloads by fingerprint to prevent concurrent double-triggers
const activeDownloads = new Set<string>();

// Timestamp of recent downloads to throttle rapid double-clicks within cooldown window
const recentDownloads = new Map<string, number>();

export interface DownloadOptions {
  /**
   * Cooldown lock duration in ms during which duplicate triggers for the exact
   * same file will be suppressed. Default is 1000ms.
   */
  lockDurationMs?: number;

  /**
   * If true, bypasses the in-flight/cooldown deduplication check.
   */
  force?: boolean;
}

/**
 * The ONE centralized download helper across MAISHAA WORKSPACE 2.
 *
 * Guarantees:
 * 1. Creates a single hidden anchor element attached to document.body.
 * 2. Invokes anchor.click() exactly ONCE.
 * 3. Removes the anchor immediately.
 * 4. Cleans up object URLs safely via URL.revokeObjectURL.
 * 5. Suppresses rapid accidental double-clicks on the same output within lock window.
 *
 * @param source Blob, File, or existing object/data URL
 * @param filename Target filename for saving
 * @param options Optional configuration for lock duration
 * @returns Promise<boolean> - true if download was triggered, false if suppressed by lock
 */
export async function downloadFileOnce(
  source: Blob | string,
  filename: string,
  options?: DownloadOptions
): Promise<boolean> {
  if (typeof window === 'undefined' || !source || !filename) {
    return false;
  }

  const safeFilename = filename.trim() || 'download';
  const sourceSize = typeof source === 'string' ? source.length : source.size;
  const lockKey = `${safeFilename}::${sourceSize}`;
  const lockDuration = options?.lockDurationMs ?? 1000;
  const now = Date.now();

  // Guard against duplicate invocation: in-flight or rapid double-click within cooldown window
  if (!options?.force) {
    if (activeDownloads.has(lockKey)) {
      return false;
    }
    const lastTimestamp = recentDownloads.get(lockKey);
    if (lastTimestamp && now - lastTimestamp < lockDuration) {
      return false;
    }
  }

  activeDownloads.add(lockKey);
  recentDownloads.set(lockKey, now);

  let isCreatedUrl = false;
  let url = '';

  try {
    if (typeof source === 'string') {
      url = source;
    } else {
      url = URL.createObjectURL(source);
      isCreatedUrl = true;
    }

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = safeFilename;
    anchor.style.display = 'none';
    anchor.setAttribute('aria-hidden', 'true');

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    if (isCreatedUrl) {
      setTimeout(() => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // Ignore revocation errors in JSDOM / mocked environments
        }
      }, 1500);
    }

    return true;
  } finally {
    // Release in-flight lock after lock duration
    setTimeout(() => {
      activeDownloads.delete(lockKey);
    }, lockDuration);
  }
}

/**
 * Resets all in-flight and cooldown locks.
 * Intended for test suites and state resets.
 */
export function resetDownloadLocks(): void {
  activeDownloads.clear();
  recentDownloads.clear();
}

/**
 * Checks if a specific download is currently locked in-flight or within cooldown.
 */
export function isDownloadLocked(filename: string, size?: number): boolean {
  if (size !== undefined) {
    return activeDownloads.has(`${filename.trim()}::${size}`);
  }
  for (const key of activeDownloads) {
    if (key.startsWith(`${filename.trim()}::`)) {
      return true;
    }
  }
  return false;
}
