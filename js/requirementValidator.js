export function validateRequirementData(requirement) {
  const errors = [];

  if (!requirement || typeof requirement !== "object") {
    return { valid: false, errors: ["requirement must be an object"] };
  }
  if (!requirement.id) errors.push("id is required");
  if (!requirement.name) errors.push("name is required");
  if (!requirement.actId) errors.push("actId is required");
  if (!requirement.sectionId) errors.push("sectionId is required");
  if (!requirement.sourceId) errors.push("sourceId is required");
  if (typeof requirement.verified !== "boolean") errors.push("verified must be boolean");
  if (requirement.verified && !requirement.lastVerified) errors.push("lastVerified is required when verified is true");

  return {
    valid: errors.length === 0,
    errors
  };
}
