/* @flow */

import AWS from 'aws-sdk';
import config from './config';

type TableStatus = 'CREATING' | 'UPDATING' | 'DELETING' | 'ACTIVE';

type ProvisionedThroughputType = {
  NumberOfDecreasesToday: number,
  ReadCapacityUnits: number,
  WriteCapacityUnits: number
}

type GlobalSecondaryIndex = {
  IndexName: string,
  IndexStatus: TableStatus,
  ProvisionedThroughput: ProvisionedThroughputType
}

type TableInfoType = ProvisionedThroughputType & {TableStatus: TableStatus} & {GlobalSecondaryIndexes: Array<GlobalSecondaryIndex>};
export type MetricItem = {
  Name: string,
  Status: TableStatus,
  ConsumedReadCapacity: number,
  ConsumedWriteCapacity: number,
  ReadThrottleEvents: number,
  WriteThrottleEvents: number,
  Type: 'TABLE'|'GSI',
  TableName: string
} & ProvisionedThroughputType

const {evaluationTimeframeInMinutes, awsRegion} = config;

AWS.config.update({region: awsRegion});

const dynamoDB = new AWS.DynamoDB();
const cloudWatch = new AWS.CloudWatch();

const EndTime = new Date();
const StartTime = new Date(EndTime.getTime() - (evaluationTimeframeInMinutes * 60 * 1000));

const getTableInfo = async (TableName: string) : Promise<TableInfoType> => {
  const {
    Table: {
      TableStatus, ProvisionedThroughput, GlobalSecondaryIndexes: gsi
    }
  } = await dynamoDB.describeTable({TableName}).promise();

  let GlobalSecondaryIndexes = [];
  if (gsi) {
    GlobalSecondaryIndexes = gsi.map(({IndexName, IndexStatus, ProvisionedThroughput}) => ({IndexName, IndexStatus, ProvisionedThroughput}));
  }

  return {...ProvisionedThroughput, TableStatus, GlobalSecondaryIndexes};
};

const getDynamoDBMetric = MetricName => async (tableName: string) : Promise<number> => {
  const params = {
    EndTime,
    MetricName,
    Namespace: 'AWS/DynamoDB',
    Period: evaluationTimeframeInMinutes * 60,
    StartTime,
    Statistics: ['Sum'],
    Dimensions: [{
      Name: 'TableName',
      Value: tableName
    }],
    Unit: 'Count'
  };

  const {Datapoints} = await cloudWatch.getMetricStatistics(params).promise();

  if (Datapoints.length === 0) {
    return 0;
  }

  return Datapoints[0].Sum / evaluationTimeframeInMinutes / 60;
};

const getConsumedReadCapacity = getDynamoDBMetric('ConsumedReadCapacityUnits');
const getConsumedWriteCapacity = getDynamoDBMetric('ConsumedWriteCapacityUnits');
const getReadThrottleEvents = getDynamoDBMetric('ReadThrottleEvents');
const getWriteThrottleEvents = getDynamoDBMetric('WriteThrottleEvents');


export const tableMetric = async (tableName: string) : Promise<Array<MetricItem>> => {
  const tableInfo = await getTableInfo(tableName);

  const tableMetricItem : MetricItem = {
    Type: 'TABLE',
    Name: tableName,
    TableName: tableName,
    Status: tableInfo.TableStatus,
    NumberOfDecreasesToday: tableInfo.NumberOfDecreasesToday,
    ReadCapacityUnits: tableInfo.ReadCapacityUnits,
    WriteCapacityUnits: tableInfo.WriteCapacityUnits,
    ConsumedReadCapacity: await getConsumedReadCapacity(tableName),
    ConsumedWriteCapacity: await getConsumedWriteCapacity(tableName),
    ReadThrottleEvents: await getReadThrottleEvents(tableName),
    WriteThrottleEvents: await getWriteThrottleEvents(tableName)
  };

  const gsiMetricItems = await Promise.all(tableInfo.GlobalSecondaryIndexes.map(async ({IndexName, IndexStatus, ProvisionedThroughput: {NumberOfDecreasesToday, ReadCapacityUnits, WriteCapacityUnits}}) => ({
    Type: 'GSI',
    Name: IndexName,
    TableName: tableName,
    Status: IndexStatus,
    NumberOfDecreasesToday,
    ReadCapacityUnits,
    WriteCapacityUnits,
    ConsumedReadCapacity: await getConsumedReadCapacity(IndexName),
    ConsumedWriteCapacity: await getConsumedWriteCapacity(IndexName),
    ReadThrottleEvents: await getReadThrottleEvents(IndexName),
    WriteThrottleEvents: await getWriteThrottleEvents(IndexName)
  })));

  return [...gsiMetricItems, tableMetricItem];
};