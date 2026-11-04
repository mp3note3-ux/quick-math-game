/**
 * Seedable random source. Domain modules only depend on the `RandomSource`
 * shape, so tests and simulations can inject deterministic sequences while
 * the app uses `Math.random`.
 */
export type RandomSource = () => number;

/**
 * mulberry32 — small, fast, seedable PRNG. Deterministic for a given seed,
 * which makes boards reproducible in simulations and end-to-end tests.
 */
export function mulberry32(seed: number): RandomSource {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
