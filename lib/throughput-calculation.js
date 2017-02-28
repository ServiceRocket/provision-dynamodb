/* @flow */
import {em} from './styles';

const ratioToPercent = ratio => (ratio * 100) + '%';

export const calculateFromCapacityRatioStrategy = (
  numCapacityUnits: number, remainingCapacityUnits: number,
  upperThresholdRatio: number, lowerThresholdRatio: number,
  incrementRatio: number, decrementRatio: number,
  lowerBoundUnit: number, upperBoundUnit: number
) : number => {
  const rate = remainingCapacityUnits / numCapacityUnits;
  const aboveCapacityUtilisation = rate > upperThresholdRatio;
  const belowCapacityUtilisation = rate < lowerThresholdRatio;
  if (aboveCapacityUtilisation) {
    console.log(` - Rate ${em(ratioToPercent(rate))} is above capacity utilisation of ${em(ratioToPercent(upperThresholdRatio))}.`);
    return Math.min(
      Math.round(numCapacityUnits * incrementRatio),
      upperBoundUnit
    );
  } else if (belowCapacityUtilisation) {
    console.log(` - Rate ${em(ratioToPercent(rate))} is below capacity utilisation of ${em(ratioToPercent(lowerThresholdRatio))}.`);
    return Math.max(
      Math.round(numCapacityUnits * decrementRatio),
      lowerBoundUnit
    );
  }
  return numCapacityUnits;
};

// Other strategy could be derived from the amount of throttled events, arguably a bit too late to scale.
// Refer to https://github.com/channl/dynamodb-lambda-autoscale/blob/master/src/configuration/DefaultProvisioner.json
// and https://github.com/channl/dynamodb-lambda-autoscale
