import { Duration } from 'aws-cdk-lib';

export interface CrossAccountDnsValidatedCertificateProps {
  readonly domainName: string;
  readonly subjectAlternativeNames?: string[];
  readonly zoneNames?: { [domainName: string]: string };
  readonly delegationRoleArn: string;
  readonly timeout?: Duration;
}
