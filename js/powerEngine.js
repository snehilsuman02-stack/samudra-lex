import { loadForeignFishingAct, loadForeignFishingSection9Powers } from "./dataLoader.js";

export async function assessLegalPowers(facts, scenario) {
  const assessment = {
    applicablePowers: [],
    conditionalPowers: [],
    unavailablePowers: [],
    warnings: [],
    legalBasis: []
  };
  let powers;
  try {
    const [act, loadedPowers] = await Promise.all([
      loadForeignFishingAct(),
      loadForeignFishingSection9Powers()
    ]);
    powers = loadedPowers.map((power) => ({ ...power, actName: act.actName }));
  } catch (error) {
    assessment.warnings.push("POWER DATA NOT AVAILABLE");
    return assessment;
  }
  const scenarioIds = Array.isArray(scenario) ? scenario : [scenario];
  const foreignFishingScenario = scenarioIds.includes("FOREIGN_FISHING_VESSEL");
  const foreignFishingFacts = foreignFishingScenario
    && facts.nationality === "Foreign"
    && facts.activity.includes("fishing")
    && ["Fishing Vessel", "Fishing Boat", "Trawler"].includes(facts.vesselType);

  if (!foreignFishingFacts) {
    assessment.unavailablePowers = powers.map((power) => ({
      ...power,
      assessmentStatus: "NOT ESTABLISHED / INSUFFICIENT FACTS",
      assessmentReason: "The supplied facts do not establish the foreign fishing vessel framework for this assessment."
    }));
    assessment.warnings.push("Additional facts are required before Section 9 powers can be assessed as potentially relevant.");
    return assessment;
  }

  const thresholdSatisfied = facts.facts.some((fact) => /reason to believe|used for committing an offence|committing an offence under the act/i.test(fact));
  const conditionalIds = new Set([
    "mz-fishing-section-9-seizure-detention",
    "mz-fishing-section-9-port-direction",
    "mz-fishing-section-9-arrest",
    "mz-fishing-section-9-force",
    "mz-fishing-section-9-pursuit"
  ]);

  powers.forEach((power) => {
    const assessedPower = {
      ...power,
      assessmentStatus: conditionalIds.has(power.id)
        ? (thresholdSatisfied ? "CONDITION SATISFIED BASED ON USER-ENTERED FACT" : "THRESHOLD NOT ESTABLISHED FROM FACTS PROVIDED")
        : "POTENTIALLY RELEVANT",
      assessmentReason: conditionalIds.has(power.id)
        ? "Verify the legal and factual basis before action."
        : "The extracted facts are relevant to the Section 9 framework."
    };

    if (!conditionalIds.has(power.id)) {
      assessment.applicablePowers.push(assessedPower);
    } else {
      assessment.conditionalPowers.push(assessedPower);
    }
    assessment.legalBasis.push({
      actId: power.legalBasis.actId,
      sectionId: power.legalBasis.sectionId,
      subsection: power.legalBasis.subsection,
      source: power.source,
      sourceUrl: power.sourceUrl,
      lastVerified: power.lastVerified
    });
  });

  assessment.warnings.push("This assessment identifies statutory provisions potentially relevant to the facts entered by the user.");
  return assessment;
}
