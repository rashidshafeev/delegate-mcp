/**
 * Simple token counting utilities.
 * This is a basic implementation; for more accurate results, consider using
 * provider-specific token counters or packages like tiktoken.
 */

// Approximate token count for English text (rough estimate: ~4 chars per token)
const CHARS_PER_TOKEN = 4;

// Different counting strategies
export enum TokenCountingStrategy {
  APPROXIMATE_CHAR_COUNT, // Quick but rough approximation
  // Add other counting strategies as needed
}

/**
 * Count tokens in a text string using a basic approximation method.
 * @param text The text to count tokens for
 * @param strategy The counting strategy to use
 * @returns Approximate token count
 */
export function countTokens(
  text: string,
  strategy: TokenCountingStrategy = TokenCountingStrategy.APPROXIMATE_CHAR_COUNT
): number {
  switch (strategy) {
    case TokenCountingStrategy.APPROXIMATE_CHAR_COUNT:
      return Math.ceil(text.length / CHARS_PER_TOKEN);
      
    // Add other strategies as needed
      
    default:
      return Math.ceil(text.length / CHARS_PER_TOKEN);
  }
}

/**
 * Check if a text exceeds a token limit.
 * @param text The text to check
 * @param limit The token limit
 * @returns Whether the text exceeds the limit
 */
export function exceedsTokenLimit(text: string, limit: number): boolean {
  return countTokens(text) > limit;
}

/**
 * Truncate text to a specific token limit.
 * @param text The text to truncate
 * @param limit The token limit
 * @returns Truncated text that fits within the limit
 */
export function truncateToTokenLimit(text: string, limit: number): string {
  const estimatedTokens = countTokens(text);
  
  if (estimatedTokens <= limit) {
    return text;
  }
  
  // Approximate character limit
  const approxCharLimit = limit * CHARS_PER_TOKEN;
  
  // Leave some margin for error by using 90% of the calculated limit
  const safeCharLimit = Math.floor(approxCharLimit * 0.9);
  
  return text.substring(0, safeCharLimit) + '\n[Truncated due to token limit]';
}
