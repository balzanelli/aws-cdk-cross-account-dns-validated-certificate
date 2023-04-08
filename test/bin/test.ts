#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CrossAccountDnsValidatedCertificateTestStack } from '../lib/cross-account-dns-validated-certificate-test-stack';
import { DnsValidationRoleTestStack } from '../lib/dns-validation-role-test-stack';

const app = new cdk.App();

const props = {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
};

new DnsValidationRoleTestStack(app, 'DnsValidationRoleTest', props);

new CrossAccountDnsValidatedCertificateTestStack(
  app,
  'CrossAccountDnsValidatedCertificateTest',
  props,
);
