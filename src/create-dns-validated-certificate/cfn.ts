import { CloudFormationCustomResourceEvent } from 'aws-lambda';
import * as https from 'https';

export async function sendResponse(
  event: CloudFormationCustomResourceEvent,
  status: string,
  physicalResourceId?: string,
  data?: {
    [key: string]: any;
  },
  reason?: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const response: unknown | any = {
      Status: status,
      PhysicalResourceId: physicalResourceId ?? event.ResourceProperties.Name,
      StackId: event.StackId,
      RequestId: event.RequestId,
      LogicalResourceId: event.LogicalResourceId,
      Data: data,
    };
    if (reason) {
      response.Reason = reason;
    }

    const url = new URL(event.ResponseURL);
    const body = JSON.stringify(response);

    https
      .request({
        hostname: url.hostname,
        port: 443,
        path: `${url.pathname}${url.search}`,
        method: 'PUT',
        headers: {
          'content-type': '',
          'content-length': body.length,
        },
      })
      .on('error', reject)
      .on('response', (response) => {
        response.resume();

        if (response.statusCode && response.statusCode >= 400) {
          reject(
            new Error(
              `Server returned error ${response.statusCode}: ${response.statusMessage}`,
            ),
          );
        } else {
          resolve();
        }
      })
      .end(body, 'utf-8');
  });
}
