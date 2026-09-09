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

export function loadForeignFishingVesselScenario() {
  return loadJson("scenarios/foreign-fishing-vessel.json");
}

export function loadForeignFishingAct() {
  return loadJson("acts/maritime-zones-fishing-foreign-vessels-act-1981.json");
}

export function loadForeignFishingSection9() {
  return loadJson("sections/mz-fishing-foreign-vessels-section-9.json");
}

export function loadForeignFishingSection9Powers() {
  const powerFiles = [
    "powers/mz-fishing-section-9-stop-search.json",
    "powers/mz-fishing-section-9-documents.json",
    "powers/mz-fishing-section-9-catch-equipment.json",
    "powers/mz-fishing-section-9-inquiries.json",
    "powers/mz-fishing-section-9-seizure-detention.json",
    "powers/mz-fishing-section-9-port-direction.json",
    "powers/mz-fishing-section-9-arrest.json",
    "powers/mz-fishing-section-9-force.json",
    "powers/mz-fishing-section-9-pursuit.json"
  ];
  return Promise.all(powerFiles.map(loadJson));
}
