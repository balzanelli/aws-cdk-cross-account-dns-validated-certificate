# aws-cdk-cross-account-dns-validated-certificate

AWS CDK L3 construct for issuing a certificate through Certificate Manager using cross account Route 53 DNS validation.

This AWS CDK construct extends the functionality of CloudFormation by enabling you to issue a DNS validated SSL
certificate using Certificate Manager when your Route 53 hosted zone is provisioned in another AWS account to the SSL
certificate.

## Installation

To install and use this package, install the following packages using your package manager (e.g. npm):

- aws-cdk-cross-account-dns-validated-certificate
- aws-cdk-lib (^2.0.0)
- constructs (^10.0.0)

```sh
npm install aws-cdk-cross-account-dns-validated-certificate --save
```

## Usage

1. Create the Route 53 delegation role to create and manage DNS01 validation records where `AWS_ACCOUNT_ID` is the ID of
   the AWS account where the certificate will be provisioned:

```ts
import * as iam from 'aws-cdk-lib/aws-iam';
import {DnsValidationRole} from 'aws-cdk-cross-account-dns-validated-certificate';

new DnsValidationRole(this, 'DnsValidationRole', {
    assumedBy: new iam.AccountPrincipal('<AWS_ACCOUNT_ID>'),
});
```

This construct must be provisioned in a CloudFormation stack that targets the primary AWS account where your Route 53
hosted zone exists (see the test project for an example).

After the CloudFormation stack has been deployed into the primary AWS account, you can retrieve the ARN of the
provisioned DNS validation IAM role from the CloudFormation console.

2. Create the SSL certificate in the secondary AWS account and perform DNS validation by updating the DNS records for a
   hosted zone provisioned in the primary AWS account:

```ts
import {CrossAccountDnsValidatedCertificate} from 'aws-cdk-cross-account-dns-validated-certificate';

new CrossAccountDnsValidatedCertificate(this, 'Certificate', {
    domainName: '<DOMAIN_NAME>',
    delegationRoleArn: '<DNS_VALIDATION_ROLE_ARN>',
});
```

This construct must be provisioned in a CloudFormation stack that targets the AWS account where you want to issue the
SSL certificate using Certificate Manager.
