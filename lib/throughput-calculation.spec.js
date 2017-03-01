import test from 'ava';

import {calculateFromCapacityRatioStrategy} from './throughput-calculation';

test('should pass', t => {
  const upperThresholdRatio = 0.8;
  const lowerThresholdRatio = 0.2;
  const incrementRatio = 1.5;
  const decrementRatio = 0.5;
  const lowerBoundUnit = 10;
  const upperBoundUnit = 100;

  // (0.02 rate)
  let numCapacityUnits = 50;
  let remainingCapacityUnits = 1;
  let newCapacity = calculateFromCapacityRatioStrategy(
    numCapacityUnits, remainingCapacityUnits,
    upperThresholdRatio, lowerThresholdRatio,
    incrementRatio, decrementRatio,
    lowerBoundUnit, upperBoundUnit
  );
  t.is(newCapacity, numCapacityUnits * decrementRatio, 'New capacity based on decrement ratio (above lower threshold ratio)');

  // (0.1667 rate)
  numCapacityUnits = 6;
  remainingCapacityUnits = 1;
  newCapacity = calculateFromCapacityRatioStrategy(
    numCapacityUnits, remainingCapacityUnits,
    upperThresholdRatio, lowerThresholdRatio,
    incrementRatio, decrementRatio,
    lowerBoundUnit, upperBoundUnit
  );
  t.is(newCapacity, lowerBoundUnit, 'New capacity based on decrement ratio (below lower threshold ratio)');

  // (0.02 rate)
  numCapacityUnits = 50;
  remainingCapacityUnits = 49;
  newCapacity = calculateFromCapacityRatioStrategy(
    numCapacityUnits, remainingCapacityUnits,
    upperThresholdRatio, lowerThresholdRatio,
    incrementRatio, decrementRatio,
    lowerBoundUnit, upperBoundUnit
  );
  t.is(newCapacity, numCapacityUnits * incrementRatio, 'New capacity based on increment ratio (below upper threshold ratio)');

  // (0.02 rate)
  numCapacityUnits = 99;
  remainingCapacityUnits = 98;
  newCapacity = calculateFromCapacityRatioStrategy(
    numCapacityUnits, remainingCapacityUnits,
    upperThresholdRatio, lowerThresholdRatio,
    incrementRatio, decrementRatio,
    lowerBoundUnit, upperBoundUnit
  );
  t.is(newCapacity, upperBoundUnit, 'New capacity based on increment ratio (above upper threshold ratio)');

  // (0.5 rate)
  numCapacityUnits = 2;
  remainingCapacityUnits = 1;
  newCapacity = calculateFromCapacityRatioStrategy(
    numCapacityUnits, remainingCapacityUnits,
    upperThresholdRatio, lowerThresholdRatio,
    incrementRatio, decrementRatio,
    lowerBoundUnit, upperBoundUnit
  );
  t.is(newCapacity, numCapacityUnits, 'No changes when out of rate bound.');
});
