/// <reference types="vite/client" />

import once from "lodash/once";
import { getFrequenciesByBin } from "./frequency";
import { FrequencyToNoteConverter, noteFullName, NoteName } from "./note";
import { makeRollingMean } from "./smoothing";
import { makeRelativeMelodyMatcher } from "./relativeMelody";
import { Patterns, send } from "./comms";
import { createMeydaAnalyzer } from "meyda";

export function findLoudest(sample: number[] | Uint8Array | Float32Array) {
  let loudestBinSoFar = -1;
  let loudestSoFar = 0;

  for (let i = 0; i <= sample.length; i++) {
    const loudness = sample[i];
    if (loudness > loudestSoFar) {
      loudestSoFar = loudness;
      loudestBinSoFar = i;
    }
  }

  if (loudestSoFar === 0) {
    return null;
  }

  return { loudness: loudestSoFar, bin: loudestBinSoFar };
}

const DEFAULT_FFT_SIZE = Math.pow(2, 11);
const MODE_SIZE = 24;

async function start() {
  const { now, Synth } = await import("tone");
  const getSynth = once(() => new Synth().toDestination());

  let pauseListening = false;

  const matchers = (
    Object.entries(Patterns) as unknown as [
      string,
      { name: string; pattern: NoteName[] }
    ][]
  ).map(([key, { name, pattern }]) =>
    makeRelativeMelodyMatcher({
      pattern,
      trigger: (match) => {
        send(key);
        const currentTime = now();
        const duration = 0.3;
        pauseListening = true;
        setTimeout(() => {
          pauseListening = false;
        }, match.notes.length * duration * 1000);
        match.notes.forEach((noteNumber, offset) => {
          if (!noteNumber) {
            return;
          }
          const playNote = noteFullName(noteNumber).toUpperCase();
          const start = currentTime + duration * offset;
          getSynth().triggerAttackRelease(playNote, duration, start);
        });
      },
      bufferSize: MODE_SIZE,
    })
  );

  const getAverageSpread = makeRollingMean({
    defaultValue: 100,
    bufferSize: 512,
  });
  const referencePitch = 440;

  navigator.mediaDevices.getUserMedia({ audio: true }).then((micStream) => {
    const toNote = new FrequencyToNoteConverter(referencePitch);
    const frequencyBinCount = DEFAULT_FFT_SIZE / 2;
    const audioContext = new AudioContext();
    const frequencyByBin = getFrequenciesByBin(
      audioContext.sampleRate,
      frequencyBinCount
    );
    const source = audioContext.createMediaStreamSource(micStream);

    const introAudio = new Audio("/welcome-short.wav");
    const introSource = audioContext.createMediaElementSource(introAudio);
    introSource.connect(audioContext.destination);
    introAudio.play();

    createMeydaAnalyzer({
      startImmediately: true,
      sampleRate: audioContext.sampleRate,
      audioContext,
      source,
      bufferSize: DEFAULT_FFT_SIZE,
      featureExtractors: ["amplitudeSpectrum", "spectralSpread"],
      callback: ({ amplitudeSpectrum, spectralSpread }) => {
        if (!amplitudeSpectrum || !spectralSpread) {
          return;
        }

        const avgSpread = getAverageSpread(spectralSpread);
        const loudest = findLoudest(amplitudeSpectrum);

        const note =
          !pauseListening && loudest && spectralSpread < avgSpread
            ? toNote.number(frequencyByBin[loudest.bin])
            : null;

        matchers.forEach((matcher) => matcher(note));
      },
    });
  });
}

document.getElementById("start")!.addEventListener("click", () => {
  start();
});

export {};
