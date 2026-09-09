export function assessOffences(facts, scenario, requirements = [], offences = []) {
  const result = {
    assessments: [],
    establishedOffences: [],
    suspectedOffences: [],
    notEstablished: [],
    insufficientFacts: [],
    uncertainties: [],
    warnings: []
  };
  const scenarioIds = Array.isArray(scenario) ? scenario : [scenario];
  const normalizedFacts = collectFacts(facts);

  if (facts?.location?.mentioned && facts.location.distanceNm !== null) {
    result.uncertainties.push("Distance mentioned; maritime zone not independently established.");
  }
  if (hasLicenceNotProduced(facts)) {
    result.uncertainties.push("Licence/permit status has not been verified.");
  }

  for (const requirement of Array.isArray(requirements) ? requirements : []) {
    result.assessments.push(evaluateRequirement(requirement, facts, scenarioIds, normalizedFacts));
  }

  const verifiedOffences = Array.isArray(offences)
    ? offences.filter((offence) => offence && offence.verified === true)
    : [];
  const unverifiedOffences = Array.isArray(offences)
    ? offences.filter((offence) => !offence || offence.verified !== true)
    : [];

  if (!Array.isArray(offences) || unverifiedOffences.length) {
    if (unverifiedOffences.length) {
      result.warnings.push("LEGAL BASIS NOT VERIFIED");
      result.insufficientFacts.push("One or more supplied offence records are not verified.");
    }
  }
  if (!verifiedOffences.length && Array.isArray(offences) && offences.length === 0) {
    result.warnings.push("No verified offence records are available for assessment.");
  }

  for (const offence of verifiedOffences) {
    const assessment = evaluateOffence(offence, facts, scenarioIds, normalizedFacts);
    result.assessments.push(assessment);
    if (assessment.status === "OFFENCE ESTABLISHED") {
      result.establishedOffences.push(assessment);
    } else if (assessment.status === "SUSPECTED / REQUIRES FURTHER VERIFICATION") {
      result.suspectedOffences.push(assessment);
    } else {
      result.notEstablished.push(assessment);
    }
  }

  if (hasLicenceNotProduced(facts)) {
    result.notEstablished.push({
      type: "document-related-offence-assessment",
      status: "NOT ESTABLISHED",
      documentStatus: "DOCUMENT NOT PRODUCED",
      verificationStatus: "DOCUMENT VALIDITY NOT VERIFIED",
      reason: "The available facts do not establish that the vessel does not hold a valid licence or otherwise satisfy all elements of an offence.",
      legalBasis: []
    });
  }

  if (!hasForeignFishingFacts(facts, scenarioIds)) {
    result.insufficientFacts.push("Foreign-vessel-specific offence applicability is not established from the supplied facts.");
  }

  return result;
}

function evaluateRequirement(requirement, facts, scenarioIds, normalizedFacts) {
  const legalBasis = toLegalBasis(requirement);
  const appliesToScenarios = Array.isArray(requirement.appliesToScenarios) ? requirement.appliesToScenarios : [];
  if (appliesToScenarios.length && !appliesToScenarios.some((id) => scenarioIds.includes(id))) {
    return {
      requirementId: requirement.id || "",
      name: requirement.name || "",
      status: "NOT_APPLICABLE",
      supportingFacts: [],
      missingFacts: [],
      legalBasis,
      warnings: []
    };
  }

  const supportingFacts = [];
  const missingFacts = [];
  if (facts?.nationality === "Foreign") supportingFacts.push("Foreign vessel identified");
  else missingFacts.push("Foreign nationality has not been confirmed");
  if (facts?.activity?.includes("fishing")) supportingFacts.push("Fishing activity reported");
  else missingFacts.push("Fishing activity has not been confirmed");
  if (facts?.location?.mentioned) supportingFacts.push("Location mentioned");
  else missingFacts.push("Applicable location or maritime zone has not been established");
  if (hasLicenceNotProduced(facts)) {
    supportingFacts.push("Licence not produced");
    missingFacts.push("Licence or permit validity has not been verified");
  } else {
    missingFacts.push("Licence or permit status is unknown");
  }

  return {
    requirementId: requirement.id || "",
    name: requirement.name || "",
    status: missingFacts.length ? "NOT_ESTABLISHED" : "SATISFIED",
    supportingFacts,
    missingFacts,
    legalBasis,
    warnings: missingFacts.length ? ["Requirement status requires further factual verification."] : []
  };
}

function evaluateOffence(offence, facts, scenarioIds, normalizedFacts) {
  const elements = Array.isArray(offence.elements) ? offence.elements.map((element) => evaluateElement(element, normalizedFacts)) : [];
  const establishedCount = elements.filter((element) => element.status === "ESTABLISHED").length;
  const unresolvedCount = elements.filter((element) => element.status !== "ESTABLISHED").length;
  const status = elements.length && establishedCount === elements.length
    ? "OFFENCE ESTABLISHED"
    : establishedCount > 0 && unresolvedCount > 0
      ? "SUSPECTED / REQUIRES FURTHER VERIFICATION"
      : "NOT ESTABLISHED";

  return {
    offenceId: offence.id || "",
    name: offence.name || "",
    status,
    elements,
    legalBasis: toLegalBasis(offence),
    warnings: status === "OFFENCE ESTABLISHED" ? [] : ["Offence status requires verification against all legal elements and facts."]
  };
}

function evaluateElement(element, normalizedFacts) {
  const text = String(element || "");
  const tokens = significantTokens(text);
  const matchedTokens = tokens.filter((token) => normalizedFacts.includes(token));
  const status = matchedTokens.length === tokens.length && tokens.length > 0
    ? "ESTABLISHED"
    : matchedTokens.length > 0
      ? "NOT_ESTABLISHED"
      : "UNKNOWN";
  return {
    element: text,
    status,
    supportingFacts: matchedTokens.length ? ["Matching supplied fact text identified"] : [],
    missingFacts: status === "ESTABLISHED" ? [] : ["Facts establishing this element have not been supplied or verified"]
  };
}

function toLegalBasis(record) {
  return [{
    actId: record.actId || "",
    sectionId: record.sectionId || "",
    sourceId: record.sourceId || ""
  }];
}

function collectFacts(facts) {
  return normalize([...(facts?.facts || []), ...(facts?.suspectedIssue || []), ...(facts?.documents || []), ...(facts?.uncertainties || [])].join(" "));
}

function significantTokens(value) {
  return normalize(value).split(" ").filter((token) => token.length >= 4);
}

function normalize(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function hasLicenceNotProduced(facts) {
  return (facts?.documents || []).some((document) => /licen[cs]e|permit/i.test(document) && /not produced|not provided|not presented/i.test(document));
}

function hasForeignFishingFacts(facts, scenarioIds) {
  return scenarioIds.includes("FOREIGN_FISHING_VESSEL")
    && facts?.nationality === "Foreign"
    && facts?.activity?.includes("fishing");
}
