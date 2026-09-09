export function validateOffenceData(offences) {
  const errors = [];
  const records = Array.isArray(offences) ? offences : [];

  if (!Array.isArray(offences)) {
    errors.push("offences must be an array");
    return { valid: false, errors };
  }

  records.forEach((offence, index) => {
    const prefix = `offences[${index}]`;
    if (!offence || typeof offence !== "object") {
      errors.push(`${prefix} must be an object`);
      return;
    }
    if (!offence.id) errors.push(`${prefix}.id is required`);
    if (!offence.name) errors.push(`${prefix}.name is required`);
    if (!offence.actId) errors.push(`${prefix}.actId is required`);
    if (!offence.sectionId) errors.push(`${prefix}.sectionId is required`);
    if (!offence.sourceId) errors.push(`${prefix}.sourceId is required`);
    if (typeof offence.verified !== "boolean") errors.push(`${prefix}.verified must be boolean`);
    if (offence.verified && !offence.lastVerified) {
      errors.push(`${prefix}.lastVerified is required when verified is true`);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}
