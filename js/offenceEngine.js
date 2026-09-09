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

  if (facts?.location?.mentioned && facts.location.distanceNm !== null) {
    result.uncertainties.push("Distance mentioned; maritime zone not independently established.");
  }
  if (hasLicenceNotProduced(facts) || hasDocumentNotProduced(facts)) {
    result.uncertainties.push("Licence was not produced; licence validity/status remains unverified.");
  }

  for (const requirement of Array.isArray(requirements) ? requirements : []) {
    result.assessments.push(evaluateRequirement(requirement, facts, scenarioIds));
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
    result.insufficientFacts.push("No verified offence record is currently available for element-by-element assessment.");
  }

  for (const offence of verifiedOffences) {
    const assessment = evaluateOffence(offence, facts, scenarioIds);
    result.assessments.push(assessment);
    if (assessment.status === "OFFENCE ESTABLISHED") {
      result.establishedOffences.push(assessment);
    } else if (assessment.status === "SUSPECTED / REQUIRES FURTHER VERIFICATION") {
      result.suspectedOffences.push(assessment);
    } else if (assessment.status === "NOT ESTABLISHED") {
      result.notEstablished.push(assessment);
    } else {
      result.insufficientFacts.push(assessment);
    }
  }

  if (!hasForeignFishingFacts(facts, scenarioIds)) {
    result.insufficientFacts.push("Foreign-vessel-specific offence applicability is not established from the supplied facts.");
  }

  if (hasLicenceNotProduced(facts) || hasDocumentNotProduced(facts)) {
    result.insufficientFacts.push("Licence was not produced; licence validity/status remains unverified.");
  }

  return result;
}

function evaluateRequirement(requirement, facts, scenarioIds) {
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

  const requirementDefinitions = Array.isArray(requirement.requirements) ? requirement.requirements : [];
  const structuredDefinitions = requirementDefinitions.every((definition) => definition && typeof definition === "object" && !Array.isArray(definition));
  if (!requirementDefinitions.length || !structuredDefinitions) {
    return {
      requirementId: requirement.id || "",
      name: requirement.name || "",
      status: "UNKNOWN",
      supportingFacts: [],
      missingFacts: ["Requirement definition is not structured for reliable assessment"],
      legalBasis,
      warnings: ["Requirement evaluation requires structured fact keys and data."]
    };
  }

  const evaluations = requirementDefinitions.map((definition) => evaluateCondition(definition, facts));
  const supportingFacts = evaluations.flatMap((evaluation) => evaluation.supportingFacts);
  const missingFacts = evaluations.flatMap((evaluation) => evaluation.missingFacts);
  const status = evaluations.every((evaluation) => evaluation.status === "ESTABLISHED")
    ? "SATISFIED"
    : evaluations.some((evaluation) => evaluation.status === "NOT_ESTABLISHED")
      ? "NOT_SATISFIED"
      : "UNKNOWN";

  return {
    requirementId: requirement.id || "",
    name: requirement.name || "",
    status,
    supportingFacts,
    missingFacts,
    legalBasis,
    warnings: status === "SATISFIED" ? [] : ["Requirement status requires further structured factual verification."]
  };
}

function evaluateOffence(offence, facts, scenarioIds) {
  const hasStructuredElements = Array.isArray(offence.elements)
    && offence.elements.length > 0
    && offence.elements.some((element) => element && typeof element === "object" && !Array.isArray(element) && element.factKey);
  if (!hasStructuredElements) {
    return {
      offenceId: offence.id || "",
      name: offence.name || "",
      status: "UNKNOWN",
      elements: [],
      legalBasis: toLegalBasis(offence),
      warnings: [
        "Offence contains no structured elements for reliable assessment.",
        "Offence cannot be established without verified structured legal elements."
      ]
    };
  }

  const elements = offence.elements.map((element) => evaluateElement(element, facts));
  const requiredElements = elements.filter((element) => element.required !== false);
  const establishedCount = requiredElements.filter((element) => element.status === "ESTABLISHED").length;
  const hasNotEstablished = requiredElements.some((element) => element.status === "NOT_ESTABLISHED");
  const hasUnknown = requiredElements.some((element) => element.status === "UNKNOWN");
  const status = requiredElements.length > 0 && establishedCount === requiredElements.length
    ? "OFFENCE ESTABLISHED"
    : hasNotEstablished
      ? "NOT ESTABLISHED"
      : establishedCount > 0 && hasUnknown
      ? "SUSPECTED / REQUIRES FURTHER VERIFICATION"
        : "UNKNOWN";

  return {
    offenceId: offence.id || "",
    name: offence.name || "",
    status,
    elements,
    legalBasis: toLegalBasis(offence),
    warnings: [
      ...elements.flatMap((element) => element.warnings || []),
      ...(status === "OFFENCE ESTABLISHED" ? [] : ["Offence status requires verification against all legal elements and facts."])
    ]
  };
}

function evaluateElement(element, facts) {
  if (!element || typeof element !== "object" || Array.isArray(element)) {
    return {
      elementId: element?.id || "",
      element: typeof element === "string" ? element : "",
      required: true,
      status: "UNKNOWN",
      supportingFacts: [],
      missingFacts: [],
      warnings: ["Offence element is not sufficiently structured for reliable assessment."]
    };
  }

  return {
    elementId: element.id || "",
    element: element.description || "",
    required: element.required !== false,
    ...evaluateCondition(element, facts)
  };
}

function evaluateCondition(condition, facts) {
  const factKey = condition.factKey;
  const operator = String(condition.operator || "").toUpperCase();
  const expectedValueRequired = ["EQUALS", "NOT_EQUALS", "CONTAINS"].includes(operator);
  const supportedOperator = ["EQUALS", "NOT_EQUALS", "CONTAINS", "TRUE", "FALSE", "EXISTS"].includes(operator);

  if (!factKey || !supportedOperator || (expectedValueRequired && (condition.expectedValue === undefined || condition.expectedValue === ""))) {
    return {
      status: "UNKNOWN",
      supportingFacts: [],
      missingFacts: [],
      warnings: ["Offence element is not sufficiently structured for reliable assessment."]
    };
  }

  const value = readFact(facts, factKey);
  const exists = value !== undefined && value !== null && value !== "";
  if (!exists) {
    return { status: "UNKNOWN", supportingFacts: [], missingFacts: [factKey], warnings: [] };
  }

  let satisfied = false;
  if (operator === "EQUALS") satisfied = value === condition.expectedValue;
  if (operator === "NOT_EQUALS") satisfied = value !== condition.expectedValue;
  if (operator === "CONTAINS") satisfied = Array.isArray(value)
    ? value.includes(condition.expectedValue)
    : String(value).includes(String(condition.expectedValue));
  if (operator === "TRUE") satisfied = value === true;
  if (operator === "FALSE") satisfied = value === false;
  if (operator === "EXISTS") satisfied = true;

  return {
    status: satisfied ? "ESTABLISHED" : "NOT_ESTABLISHED",
    supportingFacts: satisfied ? [`${factKey} ${operator}`] : [],
    missingFacts: satisfied ? [] : [`${factKey} does not satisfy ${operator}`],
    warnings: []
  };
}

function toLegalBasis(record) {
  return [{
    actId: record.actId || "",
    sectionId: record.sectionId || "",
    sourceId: record.sourceId || ""
  }];
}

function readFact(facts, factKey) {
  return String(factKey || "").split(".").reduce((value, key) => value?.[key], facts);
}

function hasLicenceNotProduced(facts) {
  return (facts?.documents || []).some((document) => /licen[cs]e|permit/i.test(document) && /not produced|not provided|not presented/i.test(document));
}

function hasDocumentNotProduced(facts) {
  return (facts?.documents || []).some((document) => /documents?/i.test(document) && /not produced|not provided|not presented/i.test(document));
}

function hasForeignFishingFacts(facts, scenarioIds) {
  return scenarioIds.includes("FOREIGN_FISHING_VESSEL")
    && facts?.nationality === "Foreign"
    && facts?.activity?.includes("fishing");
}
