import { CfnOutput } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { DnsValidationRoleProps } from './dns-validation-role-props';

export class DnsValidationRole extends Construct {
  readonly role: iam.Role;

  constructor(scope: Construct, id: string, props: DnsValidationRoleProps) {
    super(scope, id);

    this.role = new iam.Role(this, 'Role', {
      assumedBy: props.assumedBy,
      inlinePolicies: {
        DefaultPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: ['route53:ListHostedZonesByName'],
              resources: ['*'],
            }),
            new iam.PolicyStatement({
              actions: [
                'route53:ChangeResourceRecordSets',
                'route53:GetChange',
              ],
              resources: ['*'],
            }),
          ],
        }),
      },
    });

    new CfnOutput(this, 'RoleArn', {
      description: 'ARN of the DNS validation IAM role',
      value: this.role.roleArn,
    });
  }
}
