import { Credentials, STS } from 'aws-sdk';

export async function assumeRole(roleArn: string): Promise<Credentials> {
  const sts = new STS();

  const { Credentials: assumedCredentials } = await sts
    .assumeRole({
      RoleArn: roleArn,
      RoleSessionName: `create-dns-validated-certificate-${new Date().getTime()}`,
    })
    .promise();
  if (!assumedCredentials) {
    throw new Error(`Response from assumeRole did not contain Credentials`);
  }

  return new Credentials({
    accessKeyId: assumedCredentials.AccessKeyId,
    secretAccessKey: assumedCredentials.SecretAccessKey,
    sessionToken: assumedCredentials.SessionToken,
  });
}
