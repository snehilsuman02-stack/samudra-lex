const SCENARIO_RULES = [
  { id: "FOREIGN_FISHING_VESSEL", keywords: ["foreign vessel", "foreign fishing", "fishing vessel"] },
  { id: "ILLEGAL_FISHING", keywords: ["illegal fishing", "unauthorized fishing", "fishing without"] },
  { id: "VESSEL_REFUSING_TO_STOP", keywords: ["refusing to stop", "refused to stop", "failed to stop", "not stopping"] },
  { id: "SUSPECTED_SMUGGLING", keywords: ["smuggling", "smuggled", "contraband"] },
  { id: "SUSPECTED_NARCOTICS", keywords: ["narcotics", "drugs", "drug trafficking"] },
  { id: "FOREIGN_NATIONAL_DOCUMENTATION", keywords: ["foreign national", "passport", "documents", "documentation"] },
  { id: "MARINE_POLLUTION", keywords: ["oil spill", "pollution", "pollutant", "discharge"] },
  { id: "SUSPICIOUS_MERCHANT_VESSEL", keywords: ["suspicious merchant", "merchant vessel"] },
  { id: "PIRACY", keywords: ["piracy", "pirate attack", "pirates"] },
  { id: "ARMED_ROBBERY", keywords: ["armed robbery", "robbery at sea"] },
  { id: "MARITIME_CASUALTY", keywords: ["collision", "grounding", "capsized", "distress", "maritime casualty"] },
  { id: "SEARCH_AND_RESCUE", keywords: ["search and rescue", "sar", "rescue operation", "person overboard"] }
];

/** Detects operational categories only; it does not make a legal conclusion. */
export function detectScenarios(input) {
  const normalizedInput = String(input || "").toLowerCase();
  return SCENARIO_RULES
    .filter((rule) => rule.keywords.some((keyword) => normalizedInput.includes(keyword)))
    .map((rule) => rule.id);
}
