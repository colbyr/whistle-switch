import { modeFast } from "simple-statistics";

const LOOKAHEAD = 16;
const LOOKBEHIND = 4;

export const getMelodyShape = (freqs: number[]) => {
  if (freqs.length < LOOKAHEAD + LOOKBEHIND) {
    return [];
  }

  return freqs.reduce((acc: number[], n, i) => {
    if (acc.length < 0) {
      acc.push(n);
      return acc;
    }

    const from = i - LOOKBEHIND;
    const to = i + LOOKAHEAD;
    if (from < 0 || to >= freqs.length) {
      return acc;
    }

    const window = freqs.slice(from, to);
    const currentMode = modeFast(window);
    if (acc[acc.length - 1] !== currentMode) {
      acc.push(currentMode);
    }
    return acc;
  }, []);
};

export const makeArrayMatcher =
  <T>(pattern: T[]) =>
  (arr: T[]) => {
    if (pattern.length !== arr.length) {
      return false;
    }

    return arr.every((n, i) => n === pattern[i]);
  };

export const makePartialArrayMatcher =
  <T>(pattern: T[]) =>
  (arr: T[]) => {
    if (arr.length === 0) {
      return true;
    }

    return arr.every((n, i) => n === pattern[i]);
  };

export const makeMatcher = <T>(pattern: T[], trigger: () => void) => {
  const buffer = new Array(LOOKAHEAD + LOOKBEHIND).fill(-1);
  const isMatch = makeArrayMatcher(pattern);
  const isPartialMatch = makePartialArrayMatcher(pattern);
  let patternSoFar: T[] = [];

  return (entry: T) => {
    buffer.push(entry);
    buffer.shift();

    const nextEntry = modeFast(buffer);
    const prevEntry = patternSoFar[patternSoFar.length - 1];
    const isNewEntry = nextEntry !== prevEntry;
    if (isNewEntry) {
      patternSoFar.push(nextEntry);
      console.info("👂", nextEntry);
    }

    if (patternSoFar.length > pattern.length) {
      patternSoFar.shift();
    }

    if (isMatch(patternSoFar)) {
      console.info("MATCH 😅", "=>", pattern);
      patternSoFar = [];
      trigger();
      return true;
    }

    while (patternSoFar.length > 1) {
      if (isPartialMatch(patternSoFar)) {
        return false;
      }

      patternSoFar.shift();
    }

    return false;
  };
};
