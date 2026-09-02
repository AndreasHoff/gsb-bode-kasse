import { useMemo } from 'react';
import { parsePatchNotes, type Release } from '../utils/parseMarkdown';

/**
 * Hook for parsing patch notes markdown with memoization
 * 
 * @param markdown - Raw markdown content
 * @returns Array of parsed releases
 */
export function usePatchNotes(markdown: string): Release[] {
  return useMemo(() => parsePatchNotes(markdown), [markdown]);
}
