import AWS from 'aws-sdk';
import {awsRegion} from './config';
import {em, caption} from './styles';

AWS.config.update({region: awsRegion()});
const dynamoDB = new AWS.DynamoDB();

export const updateTableCapacity = async (TableName: string, ReadCapacityUnits: number, WriteCapacityUnits: number) : Promise<any> => {
  const params = {
    TableName,
    ProvisionedThroughput: {ReadCapacityUnits, WriteCapacityUnits}
  };

  if (process.env.DRY_RUN) {
    console.log(`[${caption(TableName)} - ${em('DRY_RUN')}] Applied ReadCapacityUnits=${em(ReadCapacityUnits)} and WriteCapacityUnits=${em(WriteCapacityUnits)}.`);
  } else {
    await dynamoDB.updateTable(params).promise();
    console.log(`[${caption(TableName)} - ${em('SUCCESS')}] Applied ReadCapacityUnits=${em(ReadCapacityUnits)} and WriteCapacityUnits=${em(WriteCapacityUnits)}.`);
  }
  return 'ok';
};

export const updateGSICapacity = async (TableName: string, IndexName: string, ReadCapacityUnits: number, WriteCapacityUnits: number) : Promise<any> => {
  const params = {
    TableName,
    GlobalSecondaryIndexUpdates: [{
      Update: {
        IndexName,
        ProvisionedThroughput: {ReadCapacityUnits, WriteCapacityUnits}
      }
    }]
  };

  if (process.env.DRY_RUN) {
    console.log(`[${caption(IndexName)} - ${em('DRY_RUN')}] Applied ReadCapacityUnits=${em(ReadCapacityUnits)} and WriteCapacityUnits=${em(WriteCapacityUnits)}.`);
  } else {
    await dynamoDB.updateTable(params).promise();
    console.log(`[${caption(IndexName)} - ${em('SUCCESS')}] Applied ReadCapacityUnits=${em(ReadCapacityUnits)} and WriteCapacityUnits=${em(WriteCapacityUnits)}.`);
  }
  return 'ok';
};
