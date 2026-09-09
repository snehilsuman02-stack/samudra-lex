const DATA_ROOT = "../data/";

export async function loadJson(relativePath) {
  const response = await fetch(`${DATA_ROOT}${relativePath}`);
  if (!response.ok) {
    throw new Error(`Unable to load legal data: ${relativePath}`);
  }
  return response.json();
}

export function loadActSchema() {
  return loadJson("acts/schema.json");
}

export function loadScenarioSchema() {
  return loadJson("scenarios/schema.json");
}

export function loadCoastGuardAct() {
  return loadJson("acts/coast-guard-act-1978.json");
}

export function loadCoastGuardSection121() {
  return loadJson("sections/coast-guard-act-section-121.json");
}
