/* @flow */

import AWS from 'aws-sdk';

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
type MetricItem = {Name: string, Status: TableStatus, ConsumedReadCapacity: number, ConsumedWriteCapacity: number} & ProvisionedThroughputType

const TO_BE_REFACTORED_AWS_REGION = 'us-west-2';
const TO_BE_REFACTORED_EVALUATION_TIMEFRAME_IN_MIN = 5;

AWS.config.update({region: TO_BE_REFACTORED_AWS_REGION});

const dynamoDB = new AWS.DynamoDB();
const cloudWatch = new AWS.CloudWatch();

const EndTime = new Date();
const StartTime = new Date(EndTime.getTime() - (TO_BE_REFACTORED_EVALUATION_TIMEFRAME_IN_MIN * 60 * 1000));

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
    Period: TO_BE_REFACTORED_EVALUATION_TIMEFRAME_IN_MIN * 60,
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

  return Datapoints[0].Sum / TO_BE_REFACTORED_EVALUATION_TIMEFRAME_IN_MIN / 60;
};

const getConsumedReadCapacity = getDynamoDBMetric('ConsumedReadCapacityUnits');
const getConsumedWriteCapacity = getDynamoDBMetric('ConsumedWriteCapacityUnits');

export const tableMetric = async (tableName: string) : Promise<Array<MetricItem>> => {
  const tableInfo = await getTableInfo(tableName);

  const tableMetricItem : MetricItem = {
    Name: tableName,
    Status: tableInfo.TableStatus,
    NumberOfDecreasesToday: tableInfo.NumberOfDecreasesToday,
    ReadCapacityUnits: tableInfo.ReadCapacityUnits,
    WriteCapacityUnits: tableInfo.WriteCapacityUnits,
    ConsumedReadCapacity: await getConsumedReadCapacity(tableName),
    ConsumedWriteCapacity: await getConsumedWriteCapacity(tableName)
  };

  const gsiMetricItems = await Promise.all(tableInfo.GlobalSecondaryIndexes.map(async ({IndexName, IndexStatus, ProvisionedThroughput: {NumberOfDecreasesToday, ReadCapacityUnits, WriteCapacityUnits}}) => ({
    Name: IndexName,
    Status: IndexStatus,
    NumberOfDecreasesToday,
    ReadCapacityUnits,
    WriteCapacityUnits,
    ConsumedReadCapacity: await getConsumedReadCapacity(IndexName),
    ConsumedWriteCapacity: await getConsumedWriteCapacity(IndexName)
  })));

  return [...gsiMetricItems, tableMetricItem];
};