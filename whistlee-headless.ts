import { last, once } from "lodash";
import {
  diffNotes,
  findLoudest,
  FrequencyToNoteConverter,
  getFrequenciesByBin,
  makeRelativeMelodyMatcher,
  makeRollingMean,
  makeRollingMode,
  noteFullName,
  NoteName,
} from "../octavious";
import { Patterns, send } from "./comms";
import { createMeydaAnalyzer } from "meyda";
import CircularBuffer from "@stdlib/utils-circular-buffer";

const DEFAULT_FFT_SIZE = Math.pow(2, 11);
const MODE_SIZE = 24;

async function start() {
  const { now, Synth } = await import("tone");
  console.log("starting!");
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

    // const introAudio = new Audio("./welcome-short.wav");
    // const introSource = audioContext.createMediaElementSource(introAudio);
    // introSource.connect(audioContext.destination);
    // introAudio.play();

    const smoothFreq = makeRollingMode<null | number>({
      defaultValue: null,
      bufferSize: 32,
    });
    const freqBuffer = new CircularBuffer(128);
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

        if (
          !loudest ||
          pauseListening ||
          !loudest ||
          spectralSpread > avgSpread
        ) {
          freqBuffer.clear();
          return;
        }

        const freq = frequencyByBin[loudest.bin];
        const modedFreq = smoothFreq(freq);
        const mostRecentFreq = last(freqBuffer.toArray());
        if (modedFreq !== mostRecentFreq) {
          freqBuffer.push(modedFreq);
          const last3 = freqBuffer
            .toArray()
            .slice(-3)
            .filter((freq) => !!freq);
          console.log(last3);
          const converter = new FrequencyToNoteConverter(last3[0]);
          console.log(
            last3.map(
              (freq) => `${converter.name(freq)}${converter.octave(freq)}`
            )
          );
          const last3numbers = last3.map((freq) => converter.number(freq));
          const steps = [];
          // kind of like a prefix sum
          for (let i = 1; i < last3numbers.length; i++) {
            const prev = last3numbers[i - 1];
            const current = last3numbers[i];
            steps.push(diffNotes(prev, current));
          }
          console.info(steps);
        }

        // if (note) {
        //   console.info({ note, freq: loudest && frequencyByBin[loudest?.bin] });
        // }

        // matchers.forEach((matcher) => matcher(note));
      },
    });
  });
}

document.getElementById("start")!.addEventListener("click", () => {
  start();
});

export {};
