import * as iam from 'aws-cdk-lib/aws-iam';

export interface DnsValidationRoleProps {
  readonly assumedBy: iam.IPrincipal;
}
