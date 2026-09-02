/**
 * Extract version from package.json
 * 
 * Can be called at build time or runtime depending on your bundling strategy
 */

export function getVersion(): string {
  // Try to get from window object (set by host app)
  if (typeof window !== 'undefined' && (window as any).__APP_VERSION__) {
    return (window as any).__APP_VERSION__;
  }

  // Fallback: try to import package.json at runtime
  try {
    // This would need dynamic import in a real scenario
    // For now, return a placeholder
    return 'unknown';
  } catch {
    return 'unknown';
  }
}
