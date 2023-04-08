import { ACM, Route53 } from 'aws-sdk';
import { backoff } from './utils';

export async function updateDnsValidationRecords(
  zoneName: string,
  dnsRecords: ACM.ResourceRecord[],
  route53: Route53,
  action: string,
  maxAttempts: number = 10,
): Promise<void> {
  console.log(`Updating DNS records for Hosted Zone ${zoneName}...`);

  const { HostedZones } = await route53
    .listHostedZonesByName({
      DNSName: zoneName,
    })
    .promise();
  if (!HostedZones || HostedZones.length === 0) {
    throw new Error(
      `Response from listHostedZonesByName did not contain Hosted Zone for DNS name ${zoneName}`,
    );
  }

  const hostedZoneId = HostedZones[0].Id.replace(/^\/hostedzone\//, '');

  const changeBatch = await route53
    .changeResourceRecordSets({
      ChangeBatch: {
        Changes: dnsRecords.map((dnsRecord) => {
          console.log(`${dnsRecord.Name} ${dnsRecord.Type} ${dnsRecord.Value}`);

          return {
            Action: action,
            ResourceRecordSet: {
              Name: dnsRecord.Name,
              Type: dnsRecord.Type,
              TTL: 60,
              ResourceRecords: [
                {
                  Value: dnsRecord.Value,
                },
              ],
            },
          };
        }),
      },
      HostedZoneId: hostedZoneId,
    })
    .promise();

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    console.log(
      `Waiting for DNS records for Hosted Zone ${zoneName} to propagate, attempt ${
        attempt + 1
      }/${maxAttempts}...`,
    );

    try {
      await route53
        .waitFor('resourceRecordSetsChanged', {
          $waiter: {
            delay: 30,
            maxAttempts: 10,
          },
          Id: changeBatch.ChangeInfo.Id,
        })
        .promise();

      break;
    } catch (err: unknown | any) {
      if (!isRoute53RequestThrottled(err)) {
        throw err;
      }

      await backoff(attempt);
    }
  }

  console.log(`DNS records for Hosted Zone ${zoneName} propagated`);
}

function isRoute53RequestThrottled(err: unknown | any): boolean {
  if (
    err.code === 'ResourceNotReady' &&
    err.originalError?.code === 'Throttling'
  ) {
    return true;
  }
  return err.code === 'Throttling';
}
