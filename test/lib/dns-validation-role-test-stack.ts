import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { DnsValidationRole } from '../../lib/dns-validation-role';

export class DnsValidationRoleTestStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new DnsValidationRole(this, 'DnsValidationRole', {
      assumedBy: new iam.AccountPrincipal(
        scope.node.tryGetContext('AWS_ACCOUNT_ID'),
      ),
    });
  }
}
