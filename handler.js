import {tableMetric} from './lib/table-metrics';
import {capacityRatioStrategy} from './lib/throughput-calculation';

export const hello = async (event: Object, context: Object, callback: Function) : any => {

  try {
    const response = {
      statusCode: 200,
      body: JSON.stringify({
        'ld-faiz-tenant-info': await tableMetric('ld-faiz-tenant-info'),
        'ld-faiz-44c49a35-user-group': await tableMetric('ld-faiz-44c49a35-user-group')
      }),
    };

    return callback(null, response);
  } catch (err) {
    console.error('err', err);
    return callback(null, {
      statusCode: 500,
      body: JSON.stringify(err),
    });
  }
};
