const loading = document.getElementById("loading");
const loadingTitle = document.getElementById("loadingTitle");
const loadingText = document.getElementById("loadingText");

function showStartupError(error) {
  console.error("Open City Drive failed to start:", error);

  if (!loading) {
    return;
  }

  loading.hidden = false;
  loading.style.opacity = "1";

  if (loadingTitle) {
    loadingTitle.textContent = "Unable to start the game";
  }

  if (loadingText) {
    loadingText.textContent =
      error?.message ||
      "Check your internet connection and WebGL support, then reload.";
  }
}

async function installOptionalFeatures(game) {
  try {
    const [
      featureRegistry,
      activeFeatureModule
    ] = await Promise.all([
      import("./features/index.js"),
      import("./features/active.js")
    ]);

    const report =
      await featureRegistry.installFeatures(
        game,
        activeFeatureModule.activeFeatures
      );

    const failedFeatures =
      report.filter(feature => !feature.loaded);

    if (failedFeatures.length) {
      console.warn(
        "Some optional features failed to load. "
        + "The core game is still running.",
        failedFeatures
      );
    } else {
      console.info(
        `Open City Drive loaded ${
          report.length
        } optional feature(s).`
      );
    }
  } catch (error) {
    /*
     * Features are optional. A missing or broken feature module
     * must not prevent the main game from starting.
     */
    console.warn(
      "Optional features are unavailable. "
      + "The core game will continue.",
      error
    );
  }
}

async function bootstrap() {
  if (!loading) {
    throw new Error("The loading screen was not found.");
  }

  const [
    THREE,
    roundedBoxModule,
    gltfModule,
    skeletonModule,
    gameModule
  ] = await Promise.all([
    import(
      "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js"
    ),

    import(
      "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/geometries/RoundedBoxGeometry.js"
    ),

    import(
      "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js"
    ),

    import(
      "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/utils/SkeletonUtils.js"
    ),

    /*
     * Relative import. This works when hosted in a GitHub Pages
     * project subdirectory such as:
     *
     * /open-city-drive/src/game.js
     */
    import("./game.js")
  ]);

  const game = gameModule.initGame(
    THREE,
    roundedBoxModule.RoundedBoxGeometry,
    gltfModule.GLTFLoader,
    skeletonModule.clone
  );

  if (!game) {
    throw new Error("The game engine did not initialize.");
  }

  /*
   * Expose a controlled interface for optional modules.
   */
  window.OpenCityDrive = game;

  document.documentElement.dataset.gameReady = "true";

  window.dispatchEvent(
    new CustomEvent("open-city-ready", {
      detail: {
        game
      }
    })
  );

  /*
   * Features load only after the base game has initialized.
   */
  await installOptionalFeatures(game);

  console.info("Open City Drive is ready.");
}

bootstrap().catch(showStartupError);
