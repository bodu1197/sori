/**
 * Cryptographically secure array shuffling using Fisher-Yates algorithm
 * with crypto.getRandomValues() for random number generation.
 *
 * This is safe for non-security-critical operations like playlist shuffling.
 * Uses Web Crypto API which provides cryptographically strong random values.
 */

/**
 * Generate a cryptographically secure random integer between 0 (inclusive) and max (exclusive)
 */
function secureRandomInt(max: number): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % max;
}

/**
 * Shuffle an array using Fisher-Yates algorithm with cryptographically secure randomness.
 * Returns a new shuffled array without modifying the original.
 *
 * @param array - The array to shuffle
 * @returns A new shuffled array
 */
export function secureShuffle<T>(array: readonly T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Get a cryptographically secure random index for an array
 *
 * @param length - The length of the array
 * @returns A random index between 0 and length-1
 */
export function secureRandomIndex(length: number): number {
  if (length <= 0) return 0;
  return secureRandomInt(length);
}
