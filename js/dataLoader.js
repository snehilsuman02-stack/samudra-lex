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
