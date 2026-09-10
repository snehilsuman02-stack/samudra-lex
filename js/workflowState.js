export function summarizeCaseStatus(caseData = {}) {
  const overallStatus = caseData?.assessment?.overallStatus || "UNKNOWN";
  const vesselName = caseData?.vessel?.name || "Unknown vessel";

  if (overallStatus.includes("OFFENCE ESTABLISHED")) {
    return {
      severity: "critical",
      action: "Immediate enforcement action required",
      title: `${vesselName} – offence established`,
      detail: "Review evidence, confirm legal basis, and proceed under the applicable enforcement powers."
    };
  }

  if (overallStatus.includes("SUSPECTED") || overallStatus.includes("REQUIRES FURTHER VERIFICATION")) {
    return {
      severity: "warning",
      action: "Expand fact verification before enforcement",
      title: `${vesselName} – requires verification`,
      detail: "Collect or validate the missing facts and evidence before any enforcement action is taken."
    };
  }

  if (overallStatus.includes("NOT ESTABLISHED")) {
    return {
      severity: "neutral",
      action: "No enforcement action recommended",
      title: `${vesselName} – not established`,
      detail: "The current facts do not support a lawful enforcement action on the present record."
    };
  }

  return {
    severity: "neutral",
    action: "Awaiting legal review",
    title: `${vesselName} – status pending`,
    detail: "Insufficient information is available to form a legal conclusion."
  };
}
