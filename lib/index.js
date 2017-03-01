/* @flow */

import type {ConfigTable, Strategy, CapacityRatioStrategy} from './config';
import {tableMetric} from './table-metrics';
import type {MetricItem} from './table-metrics';
import {calculateFromCapacityRatioStrategy} from './throughput-calculation';
import {updateTableCapacity, updateGSICapacity} from './table-updates';
import {caption, em} from './styles';

type ProvisioningChanges = {
  metricItem: MetricItem,
  changes: {
    isDefined: boolean,
    apply: number
  }
};

const DAILY_DECREASE_LIMIT = 4;

const reachDailyLimit = (metricItem: MetricItem) => {
  const remainingDailyLimit = DAILY_DECREASE_LIMIT - metricItem.NumberOfDecreasesToday;
  const reached = remainingDailyLimit === 0;
  if (reached) {
    console.log(` - Out of remaining provisioning daily limit: ${em(remainingDailyLimit)}. Skipping.`);
  } else {
    console.log(` - Remaining provisioning daily limit available: ${em(remainingDailyLimit)}`);
  }
  return reached;
};

const capacityRatioProvisioning = (capacityRatioStrategy: CapacityRatioStrategy, target: 'READ'|'WRITE') => (metricItem: MetricItem) : ProvisioningChanges => {
  console.log(`[${caption(metricItem.Name)} - ${em(target)} - strategy:${em(capacityRatioStrategy.name)}]:`);

  if (reachDailyLimit(metricItem)) {
    throw new Error('Reached daily limit');
  }

  const numCapacityUnits = target === 'READ' ? metricItem.ReadCapacityUnits : metricItem.WriteCapacityUnits;
  const consumedCapacity = target === 'READ' ? metricItem.ConsumedReadCapacity : metricItem.ConsumedWriteCapacity;
  const {
    upperThresholdRatio, lowerThresholdRatio, incrementRatio,
    decrementRatio, lowerBoundUnit, upperBoundUnit
  } = capacityRatioStrategy;

  const newCapacity = calculateFromCapacityRatioStrategy(
    numCapacityUnits, consumedCapacity,
    upperThresholdRatio, lowerThresholdRatio,
    incrementRatio, decrementRatio,
    lowerBoundUnit, upperBoundUnit
  );

  if (Math.round(numCapacityUnits) - Math.round(newCapacity) === 0) {
    console.log(` - Do nothing. Calculated capacity is the same ${em(newCapacity)}.`);
    return {
      metricItem,
      changes: {
        isDefined: false,
        apply: newCapacity
      }
    };
  }
  console.log(` - Change from ${em(numCapacityUnits)} to ${em(newCapacity)}.`);
  return {
    metricItem,
    changes: {
      isDefined: true,
      apply: newCapacity
    }
  };
};

const processByStrategy = (strategy: Strategy, target: 'READ'|'WRITE') : (metricItem: MetricItem) => ProvisioningChanges => {
  switch (strategy.name) {
    case 'capacity-ratio':
      return capacityRatioProvisioning(strategy, target);
    default:
      throw new Error(`Strategy name ${strategy.name} for target "${target}" not supported.`);
  }
};

const processConfigTable = async (table: ConfigTable) : Promise<any> => {
  const metricItems = await tableMetric(table.name);
  const processReadMetrics = processByStrategy(table.readStrategy, 'READ');
  const processWriteMetrics = processByStrategy(table.writeStrategy, 'WRITE');

  const readProvisioningChanges = await Promise.all(metricItems.map(processReadMetrics));
  const writeProvisioningChanges = await Promise.all(metricItems.map(processWriteMetrics));

  const accumulate = (target: 'READ'|'WRITE') => (accumulator, currentValue) => {
    const {metricItem: {Name, Type, TableName}, changes} = currentValue;
    if (accumulator[(Name)]) {
      accumulator[(Name)][(target)] = {...changes, Type, TableName};
    } else {
      accumulator[(Name)] = {[target]: {...changes, Type, TableName}};
    }
    return accumulator;
  };

  const reads = readProvisioningChanges.reduce(accumulate('READ'), {});
  const writesAndReads = writeProvisioningChanges.reduce(accumulate('WRITE'), reads);

  return await Promise.all(Object.keys(writesAndReads).map(async tableOrGsiName => {
    const scalingInfo = writesAndReads[tableOrGsiName];
    if (scalingInfo.READ.isDefined || scalingInfo.WRITE.isDefined) {
      if (scalingInfo.READ.Type.toUpperCase() === 'TABLE' && scalingInfo.WRITE.Type === 'TABLE') {
        await updateTableCapacity(tableOrGsiName, scalingInfo.READ.apply, scalingInfo.WRITE.apply);
      } else if (scalingInfo.READ.Type === 'GSI' && scalingInfo.WRITE.Type === 'GSI') {
        await updateGSICapacity(scalingInfo.READ.TableName, tableOrGsiName, scalingInfo.READ.apply, scalingInfo.WRITE.apply);
      }
      console.log();
      return scalingInfo;
    }
  }));
};

export const processConfigTables = async (tables : Array<ConfigTable>) : Promise<any> => await Promise.all(tables.map(processConfigTable));

