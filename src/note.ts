import { DefaultReferencePitchHz } from "./frequency";

export type NoteName =
  | "c"
  | "c#"
  | "d♭"
  | "d"
  | "d#"
  | "e♭"
  | "e"
  | "f"
  | "f#"
  | "g♭"
  | "g"
  | "g#"
  | "a♭"
  | "a"
  | "a#"
  | "b♭"
  | "b";

export const NoteNumberByName: Record<NoteName, number> = {
  c: 0,
  "c#": 1,
  "d♭": 1,
  d: 2,
  "d#": 3,
  "e♭": 3,
  e: 4,
  f: 5,
  "f#": 6,
  "g♭": 6,
  g: 7,
  "g#": 8,
  "a♭": 8,
  a: 9,
  "a#": 10,
  "b♭": 10,
  b: 11,
};

export const NoteNames: NoteName[] = [
  "c", // 0
  "c#", // 1
  "d",
  "d#",
  "e",
  "f",
  "f#",
  "g",
  "g#",
  "a", // 9
  "a#",
  "b",
];

export function noteNumberFromFrequency(
  referencePitchHz: number,
  frequencyHz: number
) {
  if (frequencyHz < 1) {
    return 0;
  }

  const c0Hz = referencePitchHz * Math.pow(2, -4.75);
  return Math.round(12 * Math.log2(frequencyHz / c0Hz));
}

export function noteOctave(noteNumber: number) {
  return Math.floor(noteNumber / 12);
}

export function noteName(noteNumber: number) {
  const noteI = noteNumber % 12;
  return NoteNames[noteI];
}

export function noteFullName(noteNumber: number) {
  return `${noteName(noteNumber)}${noteOctave(noteNumber)}`;
}

export function noteNameFromFrequency(noteNumber: number) {
  const noteI = noteNumber % 12;
  return NoteNames[noteI];
}

export class FrequencyToNoteConverter {
  private _refHz: number;
  private _numberByFreq = new Map();

  get referenceFrequencyHz() {
    return this._refHz;
  }

  constructor(referenceFrequencyHz: number) {
    this._refHz = referenceFrequencyHz;
  }

  private _getNumberMemo = (frequencyHz: number) => {
    if (!this._numberByFreq.has(frequencyHz)) {
      this._numberByFreq.set(
        frequencyHz,
        noteNumberFromFrequency(this._refHz, frequencyHz)
      );
    }
    return this._numberByFreq.get(frequencyHz)!;
  };

  name(frequencyHz: number) {
    const noteNumber = this._getNumberMemo(frequencyHz);
    return noteName(noteNumber);
  }

  number(frequencyHz: number) {
    return this._getNumberMemo(frequencyHz);
  }

  octave(frequencyHz: number) {
    const noteNumber = this._getNumberMemo(frequencyHz);
    return noteOctave(noteNumber);
  }
}
