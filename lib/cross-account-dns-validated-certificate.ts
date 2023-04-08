import { CustomResource, Duration } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import * as path from 'path';
import { CrossAccountDnsValidatedCertificateProps } from './cross-account-dns-validated-certificate-props';

export class CrossAccountDnsValidatedCertificate extends Construct {
  readonly certificateArn: string;

  constructor(
    scope: Construct,
    id: string,
    props: CrossAccountDnsValidatedCertificateProps,
  ) {
    super(scope, id);

    const issueCertificateFunction = this.createIssueCertificateFunction(props);

    const certificate = new CustomResource(this, 'Certificate', {
      serviceToken: issueCertificateFunction.functionArn,
      resourceType: 'Custom::CrossAccountDnsValidatedCertificate',
      properties: {
        AssumeRoleArn: props.delegationRoleArn,
        DomainName: props.domainName,
        SubjectAlternativeNames: props.subjectAlternativeNames ?? [],
        DescribeCertificateMaxAttempts: 10,
      },
    });

    this.certificateArn = certificate.getAttString('CertificateArn');
  }

  private createIssueCertificateFunction(
    props: CrossAccountDnsValidatedCertificateProps,
  ): lambda.IFunction {
    const projectRoot = path.join(
      __dirname,
      '../src/create-dns-validated-certificate',
    );

    const issueCertificateFunction = new NodejsFunction(
      this,
      'IssueCertificateFunction',
      {
        description:
          'Custom CFN resource: Create Cross Account DNS Validated Certificate',
        timeout: props.timeout ?? Duration.minutes(5),
        runtime: lambda.Runtime.NODEJS_16_X,
        entry: path.join(projectRoot, 'index.ts'),
        depsLockFilePath: path.join(projectRoot, 'package-lock.json'),
        projectRoot,
        bundling: {
          externalModules: ['aws-sdk'],
        },
      },
    );
    issueCertificateFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['sts:AssumeRole'],
        resources: [props.delegationRoleArn],
      }),
    );
    issueCertificateFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['acm:RequestCertificate'],
        resources: ['*'],
      }),
    );
    issueCertificateFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['acm:DescribeCertificate', 'acm:DeleteCertificate'],
        resources: ['*'],
      }),
    );

    return issueCertificateFunction;
  }
}
