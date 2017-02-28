/* @flow */

export type CapacityRatioStrategy = {
  name: 'capacity-ratio',
  upperThresholdRatio: number,
  lowerThresholdRatio: number,
  incrementRatio: number,
  decrementRatio: number,
  lowerBoundUnit: number,
  upperBoundUnit: number
};

export type Strategy = CapacityRatioStrategy;

export type ConfigTable = {
  name: string,
  readStrategy: CapacityRatioStrategy,
  writeStrategy: CapacityRatioStrategy
};

export default {
  awsRegion: 'us-west-2',
  evaluationTimeframeInMinutes: 5,
  tables: [{
    name: 'just-a-table',
    readStrategy: {
      name: 'capacity-ratio',
      upperThresholdRatio: 0.80,
      lowerThresholdRatio: 0.15,
      incrementRatio: 3.0,
      decrementRatio: 0.8,
      lowerBoundUnit: 1,
      upperBoundUnit: 28
    },
    writeStrategy: {
      name: 'capacity-ratio',
      upperThresholdRatio: 0.80,
      lowerThresholdRatio: 0.15,
      incrementRatio: 3.0,
      decrementRatio: 0.8,
      lowerBoundUnit: 2,
      upperBoundUnit: 28
    }
  }]
};