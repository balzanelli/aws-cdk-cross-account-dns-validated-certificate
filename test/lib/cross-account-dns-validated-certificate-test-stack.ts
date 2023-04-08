import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CrossAccountDnsValidatedCertificate } from '../../lib/cross-account-dns-validated-certificate';

export class CrossAccountDnsValidatedCertificateTestStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new CrossAccountDnsValidatedCertificate(this, 'Certificate', {
      domainName: scope.node.tryGetContext('CERTIFICATE_DOMAIN_NAME'),
      subjectAlternativeNames: scope.node.tryGetContext(
        'CERTIFICATE_SUBJECT_ALTERNATIVE_NAMES',
      ),
      delegationRoleArn: scope.node.tryGetContext('DNS_VALIDATION_ROLE_ARN'),
    });
  }
}
