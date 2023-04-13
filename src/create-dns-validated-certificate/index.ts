import {
  CloudFormationCustomResourceCreateEvent,
  CloudFormationCustomResourceDeleteEvent,
  CloudFormationCustomResourceEvent,
  CloudFormationCustomResourceUpdateEvent,
} from 'aws-lambda';
import { ACM, Route53 } from 'aws-sdk';
import { createHash } from 'crypto';
import pLimit from 'p-limit';
import {
  getValidationOptions,
  groupValidationRecordsByHostedZone,
} from './acm';
import { sendResponse } from './cfn';
import { updateDnsValidationRecords } from './route53';
import { assumeRole } from './sts';
import { backoff } from './utils';

export interface CreateDnsValidatedCertificateResourceProperties {
  readonly AssumeRoleArn: string;
  readonly DomainName: string;
  readonly SubjectAlternativeNames: string[];
  readonly ZoneNames?: { [domainName: string]: string };
  readonly DescribeCertificateMaxAttempts: number;
}

const acm = new ACM();

export const handler = async (
  event: CloudFormationCustomResourceEvent,
): Promise<void> => {
  const props =
    event.ResourceProperties as unknown as CreateDnsValidatedCertificateResourceProperties;

  switch (event.RequestType) {
    case 'Create':
    case 'Update': {
      await createCertificate(event, props);
      break;
    }

    case 'Delete': {
      await deleteCertificate(event, props);
      break;
    }
  }
};

async function createCertificate(
  event:
    | CloudFormationCustomResourceCreateEvent
    | CloudFormationCustomResourceUpdateEvent,
  props: CreateDnsValidatedCertificateResourceProperties,
): Promise<void> {
  let certificateArn: string | undefined;

  try {
    console.log(`Requesting certificate for domain name ${props.DomainName}`);

    const { CertificateArn } = await acm
      .requestCertificate({
        DomainName: props.DomainName,
        SubjectAlternativeNames: props.SubjectAlternativeNames,
        IdempotencyToken: createHash('sha256').digest('hex').slice(0, 32),
        ValidationMethod: 'DNS',
      })
      .promise();
    if (!CertificateArn) {
      throw new Error(
        'Response from requestCertificate did not contain CertificateArn',
      );
    }
    certificateArn = CertificateArn;

    console.log(
      `Certificate ${CertificateArn} for domain name ${props.DomainName} issued`,
    );

    let options: ACM.DomainValidation[] = [];
    for (
      let attempt = 0;
      attempt < props.DescribeCertificateMaxAttempts && !options.length;
      attempt++
    ) {
      console.log(
        `Retrieve certificate domain validation options for ${
          props.DomainName
        }, attempt ${attempt + 1}/${props.DescribeCertificateMaxAttempts}...`,
      );

      const { Certificate } = await acm
        .describeCertificate({
          CertificateArn,
        })
        .promise();
      if (!Certificate) {
        throw new Error(
          `Response from describeCertificate did not contain DomainValidationOptions`,
        );
      }

      options = getValidationOptions(Certificate);
      if (!options.length) {
        await backoff(attempt);
      }
    }
    if (!options.length) {
      throw new Error(
        `Response from describeCertificate did not contain DomainValidationOptions after ${props.DescribeCertificateMaxAttempts} attempts`,
      );
    }

    const route53 = new Route53({
      credentials: await assumeRole(props.AssumeRoleArn),
    });

    const limit = pLimit(5);

    Object.entries(
      groupValidationRecordsByHostedZone(options, props.ZoneNames),
    ).map(([zoneName, dnsRecords]) =>
      limit(() =>
        updateDnsValidationRecords(zoneName, dnsRecords, route53, 'UPSERT'),
      ),
    );

    console.log(`Waiting for certificate ${CertificateArn} to validate...`);

    await acm
      .waitFor('certificateValidated', {
        $waiter: {
          delay: 30,
          maxAttempts: 20,
        },
        CertificateArn: CertificateArn,
      })
      .promise();

    console.log(`Certificate ${CertificateArn} validated`);

    await sendResponse(event, 'SUCCESS', CertificateArn, {
      CertificateArn,
    });
  } catch (err: unknown | any) {
    console.error(err);

    await sendResponse(
      event,
      'FAILED',
      certificateArn,
      undefined,
      `${event.RequestType} failed`,
    );
  }
}

async function deleteCertificate(
  event: CloudFormationCustomResourceDeleteEvent,
  props: CreateDnsValidatedCertificateResourceProperties,
): Promise<void> {
  try {
    let inUseByResources: string[] = [];

    for (
      let attempt = 0;
      attempt < props.DescribeCertificateMaxAttempts;
      attempt++
    ) {
      console.log(
        `Certificate In Use By Resources for ${props.DomainName}, attempt ${
          attempt + 1
        }/${props.DescribeCertificateMaxAttempts}...`,
      );

      const { Certificate } = await acm
        .describeCertificate({
          CertificateArn: event.PhysicalResourceId,
        })
        .promise();
      if (!Certificate) {
        throw new Error(
          'Response from describeCertificate did not contain DomainValidationOptions',
        );
      }

      inUseByResources = Certificate.InUseBy || [];

      if (inUseByResources.length) {
        await backoff(attempt);
      } else {
        break;
      }
    }

    if (inUseByResources.length) {
      throw new Error(
        `Response from describeCertificate did not contain an empty InUseBy list after ${props.DescribeCertificateMaxAttempts} attempts`,
      );
    }

    console.log(`Deleting certificate ${event.PhysicalResourceId}...`);

    await acm
      .deleteCertificate({
        CertificateArn: event.PhysicalResourceId,
      })
      .promise();

    console.log(`Certificate ${event.PhysicalResourceId} deleted`);
  } catch (err: unknown | any) {
    if (err.name !== 'ResourceNotFoundException') {
      await sendResponse(
        event,
        'FAILED',
        event.PhysicalResourceId,
        undefined,
        `${event.RequestType} failed`,
      );

      console.error(err);

      return;
    }
  }

  await sendResponse(event, 'SUCCESS', event.PhysicalResourceId, {
    CertificateArn: event.PhysicalResourceId,
  });
}
