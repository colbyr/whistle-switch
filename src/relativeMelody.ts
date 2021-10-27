import CircularBuffer from "@stdlib/utils-circular-buffer";
import { makeArrayMatcher, makePartialArrayMatcher } from "./melody";
import { NoteName, NoteNumberByName } from "./note";
import { makeRollingMode } from "./smoothing";

export const makeMatcher = <P, T extends (...args: any) => void>(
  pattern: P[],
  trigger: T
) => {
  const isMatch = makeArrayMatcher(pattern);
  const isPartialMatch = makePartialArrayMatcher(pattern);
  const patternLength = pattern.length;
  let patternSoFar: P[] = [];

  return (entry: P, ctx: Parameters<T>[0]) => {
    patternSoFar.push(entry);

    if (patternSoFar.length > pattern.length) {
      patternSoFar.shift();
    }

    if (isMatch(patternSoFar)) {
      trigger({ ...ctx, pattern, match: patternSoFar });
      patternSoFar = [];
      return 1.0;
    }

    while (patternSoFar.length > 0) {
      if (isPartialMatch(patternSoFar)) {
        return patternSoFar.length && patternSoFar.length / patternLength;
      }

      patternSoFar.shift();
    }

    return 0.0;
  };
};

export function diffNotes(prev: number | null, current: number | null) {
  if (prev === current) {
    return 0;
  }
  if (prev === null) {
    return Infinity;
  }
  if (current === null) {
    return -Infinity;
  }
  return (current - prev) / 2;
}

function getRelativePattern(pattern: NoteName[]) {
  const relativePattern = [];
  for (let i = 1; i < pattern.length; i++) {
    const prev = pattern[i - 1];
    const current = pattern[i];
    const diff = diffNotes(NoteNumberByName[prev], NoteNumberByName[current]);
    relativePattern.push(diff);
  }
  return relativePattern;
}

export const makeRelativeMelodyMatcher = ({
  pattern,
  trigger,
  bufferSize = 32,
}: {
  pattern: NoteName[];
  trigger: (ctx: { notes: (null | number)[] }) => void;
  bufferSize?: number;
}) => {
  if (pattern.length < 3) {
    throw new Error("Relative pattern must be 3 or more notes");
  }

  const relativePattern = getRelativePattern(pattern);
  const smoothNoteNumber = makeRollingMode<number | null>({
    defaultValue: null,
    bufferSize,
  });

  let prevNote: number | null = null;
  const last3 = new CircularBuffer(pattern.length);
  const history = new CircularBuffer(128);
  const smoothedHistory = new CircularBuffer(128);
  const match = makeMatcher(relativePattern, (ctx) => {
    trigger({
      ...ctx,
      notes: last3.toArray(),
      history: history.toArray(),
      smoothedHistory: history.toArray(),
    });
    last3.clear();
    history.clear();
    smoothedHistory.clear();
  });
  let lastMatchPercent = 0;
  return (rawNote: number | null) => {
    // @ts-expect-error
    history.push(rawNote);
    const currentNote = smoothNoteNumber(rawNote);
    // @ts-expect-error
    smoothedHistory.push(rawNote);

    if (prevNote === currentNote) {
      return;
    }

    // @ts-expect-error
    last3.push(currentNote);
    const diff = diffNotes(prevNote, currentNote);
    const matchPercent = match(diff, {});
    if (matchPercent < lastMatchPercent) {
      console.info(
        "partial match miss",
        JSON.stringify({
          last3: last3.toArray(),
          history: history.toArray(),
          smoothedHistory: history.toArray(),
        })
      );
    }
    lastMatchPercent = matchPercent < 1 ? matchPercent : 0;
    prevNote = currentNote;
  };
};
