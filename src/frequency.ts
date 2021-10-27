import { range } from "lodash";

export const DefaultReferencePitchHz = 440;

export function getFrequenciesByBin(
  sampleRateHz: number,
  frequencyBinCount: number
) {
  const freqCount = frequencyBinCount;
  // the highest frequency we'll receive given the sample rate
  const freqMaxHz = sampleRateHz / 2;
  // the highest frequency we'll receive given the sample rate
  const freqStepHz = freqMaxHz / freqCount;
  return range(0, freqCount).map((n) => {
    // adding .5 to our step gives us a frequency right in the middle of the bin
    const step = n + 0.5;
    return step * freqStepHz;
  });
}
