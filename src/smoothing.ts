import { modeFast, mean } from "simple-statistics";

export const makeRollingMode = <I>({
  defaultValue,
  bufferSize,
}: {
  defaultValue: I;
  bufferSize: number;
}) => {
  const buffer = new Array<I>(bufferSize).fill(defaultValue);
  return function rollingMode(item: I): I {
    buffer.push(item);
    buffer.shift();
    return modeFast(buffer);
  };
};

export const makeRollingMean = ({
  defaultValue,
  bufferSize,
}: {
  defaultValue: number;
  bufferSize: number;
}) => {
  const buffer: number[] = [];
  return function rollingMode(item: number): number {
    buffer.push(item);
    if (buffer.length > bufferSize) {
      buffer.shift();
    }
    return mean(buffer);
  };
};
