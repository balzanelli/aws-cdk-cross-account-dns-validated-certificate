import { ACM } from 'aws-sdk';

export function getValidationOptions(
  certificate: ACM.CertificateDetail,
): ACM.DomainValidation[] {
  const options = certificate.DomainValidationOptions || [];

  if (
    options.length > 0 &&
    options.every((option) => !!option.ResourceRecord)
  ) {
    return [
      ...new Map(
        options.map((option) => [option.ResourceRecord?.Name, option]),
      ).values(),
    ];
  }

  return [];
}

export function groupValidationRecordsByHostedZone(
  options: ACM.DomainValidation[],
  zoneNames?: { [domainName: string]: string },
): {
  [zoneName: string]: ACM.ResourceRecord[];
} {
  return options.reduce(
    (
      records: { [zoneName: string]: ACM.ResourceRecord[] },
      option: ACM.DomainValidation,
    ) => {
      if (!option.ResourceRecord) {
        throw new Error(
          `Resource record for domain validation option ${option.DomainName} not found`,
        );
      }

      const zoneName = getHostedZoneName(option.DomainName, zoneNames);

      (records[zoneName] = records[zoneName] || []).push(option.ResourceRecord);

      return records;
    },
    {},
  );
}

export function getHostedZoneName(
  domainName: string,
  zoneNames?: { [domainName: string]: string },
): string {
  const zoneName = domainName.replace('*.', '');

  if (zoneNames && zoneNames[zoneName]) {
    return zoneNames[zoneName];
  }

  return zoneName;
}
