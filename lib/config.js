/* @flow */
import nconf from 'nconf';

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

const stringOf = configKey => {
  const configValue = nconf.get(configKey);
  if (configValue === null) {
    throw new Error(`Configuration with key ${configKey} must be set.`);
  }
  return configValue;
};

const intOf = configKey => {
  const configValue = stringOf(configKey);
  if (!configValue.match(/^[0-9]*$/g)) {
    throw new Error(`Invalid value for ${configKey} key. Expecting int value, but got "${configValue}"`);
  }
  return parseInt(configValue, 10);
};

nconf
  .env()
  .argv({
    'AWS_REGION': {
      alias: 'aws-region',
      describe: 'AWS_REGION for the DynamoDB tables.'
    },
    'EVALUATION_TIMEFRAME_IN_MINUTES': {
      alias: 'evaluation-timeframe',
      describe: 'Evaluation timeframe for metrics sampling',
      default: '5'
    }
  })
  .defaults({
    AWS_REGION: 'us-west-2',
    EVALUATION_TIMEFRAME_IN_MINUTES: '5'
  });

export const awsRegion = () => stringOf('AWS_REGION');
export const evaluationTimeframeInMinutes = () => intOf('EVALUATION_TIMEFRAME_IN_MINUTES');
