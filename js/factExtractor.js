export function extractFacts(text) {
  const input = String(text || "").trim();
  const normalized = input.toLowerCase();
  const facts = [];
  const uncertainties = [];

  const vesselType = detectVesselType(normalized);
  const nationality = detectNationality(normalized);
  const activity = detectActivity(normalized);
  const location = detectLocation(input);
  const documents = detectDocuments(normalized);
  const behaviour = detectBehaviour(normalized);
  const suspectedIssue = detectSuspectedIssues(normalized);

  if (nationality === "Foreign") {
    facts.push("Foreign vessel identified");
  } else if (nationality === "Indian") {
    facts.push("Indian vessel identified");
  } else {
    uncertainties.push("Nationality has not been identified");
  }

  if (vesselType === "Fishing Vessel" || vesselType === "Fishing Boat" || vesselType === "Trawler") {
    facts.push(`${vesselType} identified`);
  } else if (vesselType === "Merchant Vessel" || vesselType === "Cargo Vessel" || vesselType === "Tanker") {
    facts.push(`${vesselType} identified`);
  } else if (vesselType === "Vessel") {
    facts.push("Vessel detected");
    uncertainties.push("Specific vessel type has not been identified");
  } else {
    uncertainties.push("Vessel type has not been identified");
  }

  activity.forEach((item) => facts.push(`${capitalize(item)} activity reported`));
  if (location.mentioned) {
    if (location.distanceNm !== null) {
      facts.push(`Distance of approximately ${location.distanceNm} NM mentioned`);
    } else {
      facts.push(`Location mentioned: ${location.text}`);
    }
    uncertainties.push("Exact maritime zone has not been established");
  }

  documents.forEach((document) => facts.push(capitalize(document)));
  behaviour.forEach((item) => facts.push(`Behaviour reported: ${item}`));
  suspectedIssue.forEach((item) => facts.push(item));

  if (hasFishingActivity(normalized) && hasUnverifiedLicenceIssue(normalized)) {
    uncertainties.push("Validity/status of fishing licence has not been verified");
  }

  return {
    vesselType,
    nationality,
    activity,
    location,
    documents,
    behaviour,
    suspectedIssue,
    facts,
    uncertainties
  };
}

function detectSuspectedIssues(input) {
  if (/\breason to believe\b[\s\S]*\b(?:used|committing)\b[\s\S]*\boffence\b/.test(input)) {
    return ["Reason to believe an offence under the Act is stated by the user"];
  }
  return [];
}

function detectVesselType(input) {
  if (/\bfishing\s+vessel\b/.test(input)) return "Fishing Vessel";
  if (/\bfishing\s+boat\b/.test(input)) return "Fishing Boat";
  if (/\btrawler\b/.test(input)) return "Trawler";
  if (/\bmerchant\s+vessel\b/.test(input)) return "Merchant Vessel";
  if (/\bcargo\s+vessel\b/.test(input)) return "Cargo Vessel";
  if (/\btanker\b/.test(input)) return "Tanker";
  if (/\bvessel\b/.test(input)) return "Vessel";
  return null;
}

function detectNationality(input) {
  if (/\bforeign\b/.test(input)) return "Foreign";
  if (/\bindian\b/.test(input)) return "Indian";
  return "Unknown";
}

function detectActivity(input) {
  const activityRules = [
    ["fishing", /\bfishing\b/],
    ["anchoring", /\banchoring\b|\banchor(?:ed|ing)?\b/],
    ["transshipment", /\btransshipment\b|\btrans-?shipping\b/],
    ["sailing", /\bsailing\b|\bsail(?:ed|ing)?\b/],
    ["stopped", /\bstopped\b/]
  ];
  return activityRules
    .filter(([name, pattern]) => name !== "fishing" || (!isFishingNegated(input) && pattern.test(input)))
    .filter(([, pattern]) => pattern.test(input))
    .map(([name]) => name);
}

function detectLocation(input) {
  const distanceMatch = input.match(/\b(\d+(?:\.\d+)?)\s*(?:nm|nautical\s+miles)\b(?:\s+offshore)?/i);
  const offshoreMatch = input.match(/\boffshore\b/i);
  const locationMatch = distanceMatch || offshoreMatch;

  if (!locationMatch) {
    return { mentioned: false, distanceNm: null, text: "" };
  }

  return {
    mentioned: true,
    distanceNm: distanceMatch ? Number(distanceMatch[1]) : null,
    text: locationMatch[0]
  };
}

function detectDocuments(input) {
  const documents = [];
  const documentMatch = input.match(/(?:unable|failed|refused|did not|could not|cannot)\s+to?\s*(?:produce|provide|show|present)\s+(?:the\s+)?([^,.!?;]*?(?:licen[cs]e|permit|logbook|registration|documents?))/i);

  if (documentMatch) {
    documents.push(`${documentMatch[1].trim()} not produced`);
    return documents;
  }

  if (/\blicen[cs]e\b/.test(input)) documents.push("Licence mentioned");
  if (/\bpermit\b/.test(input)) documents.push("Permit mentioned");
  if (/\blogbook\b/.test(input)) documents.push("Logbook mentioned");
  if (/\bregistration\b/.test(input)) documents.push("Registration mentioned");
  if (/\bdocuments?\b/.test(input)) documents.push("Documents mentioned");
  return documents;
}

function detectBehaviour(input) {
  const behaviourRules = [
    ["Refused to stop", /\brefused\s+to\s+stop\b/],
    ["Stopped", /\bstopped\b/],
    ["Fleeing", /\bfleeing\b/],
    ["Attempted to flee", /\battempted\s+to\s+flee\b/],
    ["Complied", /\bcomplied\b/],
    ["Did not comply", /\bdid\s+not\s+comply\b|\bfailed\s+to\s+comply\b/]
  ];
  return behaviourRules.filter(([, pattern]) => pattern.test(input)).map(([name]) => name);
}

function hasFishingActivity(input) {
  return /\bfishing\b/.test(input) && !isFishingNegated(input);
}

function isFishingNegated(input) {
  return /\bno\s+fishing\b|\bfishing\s+not\s+observed\b|\bnot\s+fishing\b|\bwithout\s+fishing\b/.test(input);
}

function hasUnverifiedLicenceIssue(input) {
  return /\b(?:unable|failed|refused|did not|could not|cannot)\s+to?\s*(?:produce|provide|show|present)\s+(?:the\s+)?[^,.!?;]*licen[cs]e\b/.test(input);
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
