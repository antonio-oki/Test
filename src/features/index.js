const featureIds = new Set();

/**
 * Defines an optional game feature.
 *
 * A feature can provide:
 *
 * setup(api) {
 *   // Runs after the game starts
 * }
 */
export function defineFeature(feature) {
  if (!feature || typeof feature !== "object") {
    throw new TypeError(
      "A feature must be an object."
    );
  }

  if (
    typeof feature.id !== "string" ||
    !feature.id.trim()
  ) {
    throw new TypeError(
      "Every feature must have a non-empty id."
    );
  }

  if (featureIds.has(feature.id)) {
    throw new TypeError(
      `Duplicate feature id: ${feature.id}`
    );
  }

  featureIds.add(feature.id);

  return Object.freeze({
    ...feature
  });
}

/**
 * Installs optional features.
 *
 * A broken feature is reported but does not stop the
 * base game or prevent other features from loading.
 */
export async function installFeatures(
  api,
  features = []
) {
  const report = [];

  for (const feature of features) {
    try {
      if (typeof feature.setup === "function") {
        await feature.setup(api);
      }

      report.push({
        id: feature.id,
        loaded: true
      });
    } catch (error) {
      console.error(
        `Feature "${feature.id}" failed to load.`,
        error
      );

      report.push({
        id: feature.id,
        loaded: false,
        error
      });
    }
  }

  return report;
}
