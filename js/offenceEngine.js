const FINAL_OFFENCE_STATUS = Object.freeze({
  ESTABLISHED: "OFFENCE ESTABLISHED",
  SUSPECTED: "SUSPECTED / REQUIRES FURTHER VERIFICATION",
  NOT_ESTABLISHED: "NOT ESTABLISHED",
  UNKNOWN: "UNKNOWN"
});

// Condition states remain internal; only FINAL_OFFENCE_STATUS values are offence-level results.
const CONDITION_EVALUATION = Object.freeze({ TRUE: "TRUE", FALSE: "FALSE", UNKNOWN: "UNKNOWN" });

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
    if (assessment.status === FINAL_OFFENCE_STATUS.ESTABLISHED) {
      result.establishedOffences.push(assessment);
    } else if (assessment.status === FINAL_OFFENCE_STATUS.SUSPECTED) {
      result.suspectedOffences.push(assessment);
    } else if (assessment.status === FINAL_OFFENCE_STATUS.NOT_ESTABLISHED) {
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
    warnings: status === "SATISFIED" ? [] : ["Requirement status requires further structured factual verification."],
    decisionTrace: evaluations.map((evaluation, index) => ({
      conditionId: requirementDefinitions[index].id || `requirement-${index + 1}`,
      description: requirementDefinitions[index].description || requirementDefinitions[index].name || "Requirement condition",
      inputValue: evaluation.inputValue,
      evaluation: evaluation.evaluation,
      status: evaluation.status,
      reason: evaluation.reason
    }))
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
      decisionTrace: [],
      verificationRequired: [],
      reason: "Insufficient structured legal elements are available for assessment.",
      legalBasis: toLegalBasis(offence),
      warnings: [
        "Offence contains no structured elements for reliable assessment.",
        "Offence cannot be established without verified structured legal elements."
      ]
    };
  }

  const elements = offence.elements.map((element) => evaluateElement(element, facts));
  const elementById = new Map(elements.map((element) => [element.elementId, element]));
  const groupResults = evaluateAlternativeGroups(offence.alternativeGroups, elementById);
  const groupedElementIds = new Set((offence.alternativeGroups || []).flatMap((group) => group.elementIds || []));
  const requiredElements = elements.filter((element) => element.required !== false && !groupedElementIds.has(element.elementId));
  const coreHasNotEstablished = requiredElements.some((element) => element.status === "NOT_ESTABLISHED");
  const coreHasUnknown = requiredElements.some((element) => element.status === "UNKNOWN");
  const groupHasNotEstablished = groupResults.some((group) => group.status === "NOT_ESTABLISHED");
  const groupHasUnknown = groupResults.some((group) => group.status === "UNKNOWN");
  const hasUnknown = coreHasUnknown || groupHasUnknown;
  const hasNotEstablished = coreHasNotEstablished || groupHasNotEstablished;
  const hasGroups = Array.isArray(offence.alternativeGroups) && offence.alternativeGroups.length > 0;
  const hasMalformedGroup = groupResults.some((group) => group.malformed);
  const hasRelevantEstablished = hasGroups
    ? groupResults.some((group) => group.status === "ESTABLISHED")
    : requiredElements.some((element) => element.status === "ESTABLISHED");
  const hasEvaluableRequirements = requiredElements.length > 0 || hasGroups;
  const status = !hasMalformedGroup && !hasNotEstablished && !hasUnknown && hasEvaluableRequirements
    && (!hasGroups || groupResults.every((group) => group.status === "ESTABLISHED"))
      ? FINAL_OFFENCE_STATUS.ESTABLISHED
    : hasNotEstablished
      ? FINAL_OFFENCE_STATUS.NOT_ESTABLISHED
      : !hasMalformedGroup && hasUnknown
        ? FINAL_OFFENCE_STATUS.SUSPECTED
        : FINAL_OFFENCE_STATUS.UNKNOWN;
  const decisionTrace = [
    ...elements.map((element) => ({
      conditionId: element.elementId,
      description: element.element,
      inputValue: element.inputValue,
      evaluation: element.evaluation,
      status: element.status,
      reason: element.reason,
      evidenceStatus: element.evidenceStatus
    })),
    ...groupResults.map((group) => ({
      conditionId: group.id,
      description: group.description,
      inputValue: group.alternatives,
      evaluation: group.evaluation,
      status: group.status,
      reason: group.reason,
      alternatives: group.alternatives
    }))
  ];
  const verificationRequired = status === "SUSPECTED / REQUIRES FURTHER VERIFICATION"
    ? buildVerificationRequired(elements, groupResults)
    : [];
  const reason = buildAssessmentReason(status, elements, groupResults);

  return {
    offenceId: offence.id || "",
    name: offence.name || "",
    status,
    elements,
    alternativeGroups: groupResults,
    decisionTrace,
    conditionsSatisfied: decisionTrace.filter((entry) => entry.status === "ESTABLISHED"),
    conditionsNotSatisfied: decisionTrace.filter((entry) => entry.status === "NOT_ESTABLISHED"),
    verificationRequired,
    reason,
    legalBasis: toLegalBasis(offence),
    warnings: [
      ...elements.flatMap((element) => element.warnings || []),
      ...groupResults.flatMap((group) => group.warnings || []),
      ...(status === FINAL_OFFENCE_STATUS.ESTABLISHED ? [] : ["Offence status requires verification against all legal elements and facts."])
    ]
  };
}

function evaluateAlternativeGroups(groups, elementById) {
  if (groups === undefined) return [];
  if (!Array.isArray(groups)) {
    return [{
      id: "",
      status: "UNKNOWN",
      elementIds: [],
      description: "Malformed alternative group",
      alternatives: [],
      evaluation: CONDITION_EVALUATION.UNKNOWN,
      reason: "The alternative group structure could not be evaluated.",
      malformed: true,
      warnings: ["Alternative group is malformed and cannot be assessed reliably."]
    }];
  }

  return groups.map((group) => {
    const elementIds = Array.isArray(group?.elementIds) ? group.elementIds : [];
    const missingIds = elementIds.filter((elementId) => !elementById.has(elementId));
    if (group?.operator !== "ANY" || elementIds.length === 0 || missingIds.length > 0) {
      return {
        id: group?.id || "",
        status: "UNKNOWN",
        elementIds,
        description: group?.description || "Alternative group",
        alternatives: [],
        evaluation: "UNKNOWN",
        reason: "The alternative group is malformed or references missing elements.",
        malformed: true,
        warnings: ["Alternative group is malformed or references missing element IDs; automatic offence assessment is blocked."]
      };
    }

    const alternatives = elementIds.map((elementId) => elementById.get(elementId));
    const hasEstablished = alternatives.some((element) => element.status === "ESTABLISHED");
    const hasUnknown = alternatives.some((element) => element.status === "UNKNOWN");
    const status = hasEstablished ? "ESTABLISHED" : hasUnknown ? "UNKNOWN" : "NOT_ESTABLISHED";
    return {
      id: group.id || "",
      status,
      elementIds,
      description: group.description || "Alternative group",
      alternatives: alternatives.map((element) => ({
        conditionId: element.elementId,
        description: element.element,
        evaluation: element.evaluation,
        status: element.status,
        reason: element.reason
      })),
      evaluation: status === "ESTABLISHED" ? "TRUE" : status === "NOT_ESTABLISHED" ? "FALSE" : "UNKNOWN",
      reason: hasEstablished
        ? "At least one alternative condition is satisfied."
        : hasUnknown
          ? "No alternative is satisfied yet; at least one alternative requires verification."
          : "All alternatives were evaluated as false.",
      warnings: []
    };
  });
}

function evaluateElement(element, facts) {
  if (!element || typeof element !== "object" || Array.isArray(element)) {
    return {
      elementId: element?.id || "",
      element: typeof element === "string" ? element : "",
      required: true,
      status: "UNKNOWN",
      evaluation: CONDITION_EVALUATION.UNKNOWN,
      inputValue: undefined,
      evidenceStatus: "EVIDENCE NOT PROVIDED",
      supportingFacts: [],
      missingFacts: [],
      reason: "The element is not sufficiently structured for reliable assessment.",
      warnings: ["Offence element is not sufficiently structured for reliable assessment."]
    };
  }

  const condition = evaluateCondition(element, facts);
  return {
    elementId: element.id || "",
    element: element.description || "",
    required: element.required !== false,
    ...condition
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
      evaluation: CONDITION_EVALUATION.UNKNOWN,
      inputValue: undefined,
      evidenceStatus: "EVIDENCE NOT PROVIDED",
      supportingFacts: [],
      missingFacts: [],
      reason: "The condition is not sufficiently structured for reliable assessment.",
      warnings: ["Offence element is not sufficiently structured for reliable assessment."]
    };
  }

  const value = readFact(facts, factKey);
  const exists = value !== undefined && value !== null && value !== "";
  if (!exists) {
    return {
      status: "UNKNOWN",
      evaluation: "UNKNOWN",
      inputValue: value,
      evidenceStatus: "EVIDENCE NOT PROVIDED",
      supportingFacts: [],
      missingFacts: [factKey],
      reason: `${factKey} is unknown or has not been provided.`,
      warnings: []
    };
  }

  let satisfied = false;
  if (operator === "EQUALS") satisfied = value === condition.expectedValue;
  if (operator === "NOT_EQUALS") satisfied = value !== condition.expectedValue;
  if (operator === "CONTAINS") {
    const expectedValues = Array.isArray(condition.expectedValue) ? condition.expectedValue : [condition.expectedValue];
    satisfied = expectedValues.some((expectedValue) => Array.isArray(value)
      ? value.includes(expectedValue)
      : String(value).toLowerCase().includes(String(expectedValue).toLowerCase()));
  }
  if (operator === "TRUE") satisfied = value === true;
  if (operator === "FALSE") satisfied = value === false;
  if (operator === "EXISTS") satisfied = true;

  const status = satisfied ? "ESTABLISHED" : "NOT_ESTABLISHED";
  return {
    status,
    evaluation: satisfied ? CONDITION_EVALUATION.TRUE : CONDITION_EVALUATION.FALSE,
    inputValue: value,
    evidenceStatus: satisfied ? "FACT CONFIRMED" : "FACT DISPROVED",
    supportingFacts: satisfied ? [`${factKey} ${operator}`] : [],
    missingFacts: satisfied ? [] : [`${factKey} does not satisfy ${operator}`],
    reason: satisfied
      ? `${factKey} satisfies the required condition.`
      : `${factKey} does not satisfy the required condition.`,
    warnings: []
  };
}

function buildVerificationRequired(elements, groups) {
  const groupedElementIds = new Set(groups.flatMap((group) => group.elementIds || []));
  const unresolved = elements.filter((element) => element.status === "UNKNOWN" && !groupedElementIds.has(element.elementId));
  const groupUnresolved = groups.filter((group) => group.status === "UNKNOWN");
  const items = unresolved.map((element) => ({
    conditionId: element.elementId,
    action: verificationAction(element.inputValue, element.element)
  }));
  groupUnresolved.forEach((group) => {
    group.alternatives.filter((alternative) => alternative.status === "UNKNOWN").forEach((alternative) => {
      if (!items.some((item) => item.conditionId === alternative.conditionId)) {
        items.push({
          conditionId: alternative.conditionId,
          action: verificationAction(undefined, alternative.description)
        });
      }
    });
  });
  return items;
}

function verificationAction(inputValue, description) {
  if (/maritime zone|geographical|position/i.test(description)) return "Verify the vessel's applicable maritime zone.";
  if (/licence|permit/i.test(description)) return "Verify the relevant licence or permit status.";
  if (/authorised officer/i.test(description)) return "Verify the authorised officer status and recorded requirement.";
  if (/role|owner|master/i.test(description)) return "Verify the assessed person's role.";
  return `Verify the unresolved condition: ${description || "required fact"}.`;
}

function buildAssessmentReason(status, elements, groups) {
  if (status === "OFFENCE ESTABLISHED") return "All mandatory conditions required for this offence are established.";
  const failed = [...elements.filter((element) => element.status === "NOT_ESTABLISHED"), ...groups.filter((group) => group.status === "NOT_ESTABLISHED")];
  if (status === "NOT ESTABLISHED") return `${failed[0]?.reason || "A required condition is established as false."}`;
  const unknown = [...elements.filter((element) => element.status === "UNKNOWN"), ...groups.filter((group) => group.status === "UNKNOWN")];
  if (status === "SUSPECTED / REQUIRES FURTHER VERIFICATION") return `The offence has relevant established conditions, but ${unknown[0]?.reason || "one or more mandatory conditions require verification."}`;
  return "Insufficient structured facts are available to determine whether the offence conditions are satisfied.";
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
