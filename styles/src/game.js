export function initGame(
  THREE,
  RoundedBoxGeometry,
  GLTFLoader,
  cloneSkinned
) {
  const loading = document.getElementById("loading");

  const $ = id => document.getElementById(id);
  const clamp = (x, a, b) =>
    Math.max(a, Math.min(b, x));

  const rand = (a, b) =>
    a + Math.random() * (b - a);

  const approach = (x, target, amount) =>
    x < target
      ? Math.min(target, x + amount)
      : Math.max(target, x - amount);

  const cell = 80;
  const roadWidth = 18;

  const roads = Array.from(
    { length: 13 },
    (_, i) => -480 + i * cell
  );

  const blocks = Array.from(
    { length: 12 },
    (_, i) => -440 + i * cell
  );

  const mobile =
    navigator.maxTouchPoints > 0 ||
    matchMedia("(pointer:coarse)").matches;

  document.body.classList.toggle("touch", mobile);

  let state = "menu";
  let score = 0;
  let cash = 500;
  let bank = 1000;

  let dayTime = 0;
  let weatherTime = 0;
  let signalTime = 0;
  let toastTime = 0;
  let hudTime = 0;

  let weather = "clear";
  let cameraYaw = 0;
  let cameraPitch = 0.38;
  let cameraDistance = 9;

  let lastTime = performance.now();
  let activeDialog = null;
  let runId = 0;
  let arrestProgress = 0;
  let lawCooldown = 0;
  let lastIntersectionKey = "";

  const crimeCooldowns = new Map();
  const fleeingDrivers = [];

  const inventory = {
    snacks: 0,
    repairKits: 0,
    bait: 3,
    fish: 0
  };

  const held = new Map();
  const keys = new Set();

  const colliders = [];
  const debris = [];
  const people = [];
  const animals = [];
  const traffic = [];
  const police = [];
  const shops = [];
  const signals = [];
  const treeData = [];
  const dealerDisplays = [];
  const purchasedCars = [];

  const modelCars = [];
  const modelPeople = [];
  const modelPets = [];
  const modelMixers = [];

  const storeDefs = [
    {
      bx: 2,
      bz: 2,
      type: "market",
      name: "WALMART"
    },
    {
      bx: 5,
      bz: 2,
      type: "gas",
      name: "SUNSET GAS"
    },
    {
      bx: 3,
      bz: 7,
      type: "market",
      name: "CORNER MARKET"
    },
    {
      bx: 8,
      bz: 7,
      type: "auto",
      name: "AUTO PARTS"
    },
    {
      bx: 5,
      bz: 5,
      type: "bank",
      name: "CITY BANK"
    },
    {
      bx: 8,
      bz: 3,
      type: "food",
      name: "MCDONALD'S"
    },
    {
      bx: 0,
      bz: 8,
      type: "food",
      name: "PIZZA PLACE"
    },
    {
      bx: 10,
      bz: 5,
      type: "hospital",
      name: "CITY HOSPITAL"
    },
    {
      bx: 9,
      bz: 1,
      type: "dealer",
      name: "CITY MOTORS"
    }
  ];

  const player = {
    x: 0,
    z: 0,
    yaw: 0,
    vx: 0,
    vz: 0,
    speed: 0,
    onFoot: false,
    footX: 0,
    footZ: 2,
    footHeading: 0,
    footVx: 0,
    footVz: 0,
    wanted: 0
  };

  const policeIntel = {
    x: 0,
    z: 0,
    seenAt: -Infinity
  };

  try {
    cash = Number(
      localStorage.getItem("cityCash") || 500
    );

    bank = Number(
      localStorage.getItem("cityBank") || 1000
    );
  } catch {
    // Storage may be unavailable in private browsing.
  }

  const scene = new THREE.Scene();

  scene.background = new THREE.Color(0x91cce5);

  scene.fog = new THREE.Fog(
    0x91cce5,
    160,
    760
  );

  const camera = new THREE.PerspectiveCamera(
    62,
    innerWidth / innerHeight,
    0.1,
    2200
  );

  const renderer = new THREE.WebGLRenderer({
    antialias: !mobile,
    powerPreference: "high-performance"
  });

  renderer.setPixelRatio(
    Math.min(
      devicePixelRatio || 1,
      mobile ? 1.4 : 1.8
    )
  );

  renderer.setSize(
    innerWidth,
    innerHeight
  );

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type =
    THREE.PCFSoftShadowMap;

  renderer.outputColorSpace =
    THREE.SRGBColorSpace;

  renderer.toneMapping =
    THREE.ACESFilmicToneMapping;

  $("game").appendChild(renderer.domElement);

  const hemi = new THREE.HemisphereLight(
    0xe5f6ff,
    0x405334,
    1.6
  );

  scene.add(hemi);

  const sun = new THREE.DirectionalLight(
    0xffefd2,
    2.2
  );

  sun.position.set(
    -40,
    75,
    30
  );

  sun.castShadow = true;

  const shadowSize = mobile ? 1024 : 2048;

  sun.shadow.mapSize.set(
    shadowSize,
    shadowSize
  );

  scene.add(sun);

  const boxGeometry =
    new THREE.BoxGeometry(1, 1, 1);

  const dummy = new THREE.Object3D();

  function box(
    width,
    height,
    depth,
    material,
    x,
    y,
    z,
    parent = scene,
    shadow = false
  ) {
    const mesh = new THREE.Mesh(
      boxGeometry,
      material
    );

    mesh.scale.set(
      width,
      height,
      depth
    );

    mesh.position.set(x, y, z);
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;

    parent.add(mesh);

    return mesh;
  }

  const roundedGeometryCache =
    new Map();

  function roundedBox(
    width,
    height,
    depth,
    radius,
    material,
    x,
    y,
    z,
    parent = scene,
    shadow = false
  ) {
    const safeRadius = Math.min(
      radius,
      width * 0.45,
      height * 0.45,
      depth * 0.45
    );

    const key = [
      width,
      height,
      depth,
      safeRadius
    ].join(":");

    if (
      !roundedGeometryCache.has(key)
    ) {
      roundedGeometryCache.set(
        key,
        new RoundedBoxGeometry(
          width,
          height,
          depth,
          4,
          safeRadius
        )
      );
    }

    const mesh = new THREE.Mesh(
      roundedGeometryCache.get(key),
      material
    );

    mesh.position.set(x, y, z);
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;

    parent.add(mesh);

    return mesh;
  }

  function addCollider(
    x,
    z,
    width,
    depth
  ) {
    colliders.push({
      minX: x - width / 2,
      maxX: x + width / 2,
      minZ: z - depth / 2,
      maxZ: z + depth / 2
    });
  }

  function instanced(
    records,
    material,
    shadow = false
  ) {
    if (!records.length) {
      return null;
    }

    const mesh = new THREE.InstancedMesh(
      boxGeometry,
      material,
      records.length
    );

    records.forEach(
      (record, index) => {
        dummy.position.set(
          record.x,
          record.y,
          record.z
        );

        dummy.scale.set(
          record.w,
          record.h,
          record.d
        );

        dummy.rotation.set(
          0,
          0,
          0
        );

        dummy.updateMatrix();

        mesh.setMatrixAt(
          index,
          dummy.matrix
        );
      }
    );

    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;

    scene.add(mesh);

    return mesh;
  }

  const terrainGeometry =
    new THREE.PlaneGeometry(
      1900,
      1900,
      90,
      90
    );

  const terrainPositions =
    terrainGeometry.attributes.position;

  for (
    let i = 0;
    i < terrainPositions.count;
    i++
  ) {
    const x = terrainPositions.getX(i);
    const z = -terrainPositions.getY(i);

    const distance = Math.hypot(x, z);

    const fade = clamp(
      (distance - 465) / 240,
      0,
      1
    );

    const height = fade * (
      Math.sin(x * 0.012) * 5 +
      Math.cos(z * 0.014) * 4 +
      Math.sin((x + z) * 0.008) * 6
    );

    terrainPositions.setZ(
      i,
      height
    );
  }

  terrainGeometry.computeVertexNormals();

  const terrain = new THREE.Mesh(
    terrainGeometry,
    new THREE.MeshStandardMaterial({
      color: 0x527947,
      roughness: 1
    })
  );

  terrain.rotation.x = -Math.PI / 2;
  terrain.position.y = -0.15;
  terrain.receiveShadow = true;

  scene.add(terrain);

  const grassMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x496f40,
      roughness: 1
    });

  box(
    1500,
    0.12,
    1500,
    grassMaterial,
    0,
    -0.22,
    0
  );

  const roadMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x303740,
      roughness: 0.98
    });

  roadMaterial.onBeforeCompile =
    shader => {
      shader.vertexShader =
        "varying vec2 vRoadXZ;\n" +
        shader.vertexShader.replace(
          "#include <begin_vertex>",
          `
            #include <begin_vertex>

            vRoadXZ = (
              modelMatrix *
              vec4(position, 1.0)
            ).xz;
          `
        );

      shader.fragmentShader =
        "varying vec2 vRoadXZ;\n" +
        shader.fragmentShader.replace(
          "#include <color_fragment>",
          `
            #include <color_fragment>

            vec2 tile = floor(
              vRoadXZ * 3.0
            );

            float grain = fract(
              sin(
                dot(
                  tile,
                  vec2(127.1, 311.7)
                )
              ) * 43758.5453
            );

            diffuseColor.rgb *=
              0.91 + grain * 0.15;
          `
        );
    };

  const sidewalkMaterial =
    new THREE.MeshStandardMaterial({
      color: 0xadb0ae,
      roughness: 0.94
    });

  const curbMaterial =
    new THREE.MeshStandardMaterial({
      color: 0xd1d1ca,
      roughness: 0.9
    });

  const lotMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x527a48,
      roughness: 1
    });

  const roofMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x353c43,
      roughness: 0.9
    });

  box(
    1400,
    0.12,
    1400,
    roadMaterial,
    0,
    -0.04,
    0
  );

  for (const road of roads) {
    box(
      roadWidth,
      0.03,
      1400,
      roadMaterial,
      road,
      0.02,
      0
    );

    box(
      1400,
      0.03,
      roadWidth,
      roadMaterial,
      0,
      0.02,
      road
    );
  }

  const laneMarkMaterial =
    new THREE.MeshStandardMaterial({
      color: 0xe7e6dc
    });

  const centerMarkMaterial =
    new THREE.MeshStandardMaterial({
      color: 0xe5c145
    });

  const laneMarks = [];
  const centerMarks = [];

  for (const road of roads) {
    for (
      let position = -620;
      position <= 620;
      position += 14
    ) {
      const closeToRoad = roads.some(
        candidate =>
          Math.abs(
            position - candidate
          ) < 14
      );

      if (closeToRoad) {
        continue;
      }

      laneMarks.push(
        {
          x: road - 4.6,
          y: 0.05,
          z: position,
          w: 0.12,
          h: 0.02,
          d: 4.5
        },
        {
          x: road + 4.6,
          y: 0.05,
          z: position,
          w: 0.12,
          h: 0.02,
          d: 4.5
        },
        {
          x: position,
          y: 0.05,
          z: road - 4.6,
          w: 4.5,
          h: 0.02,
          d: 0.12
        },
        {
          x: position,
          y: 0.05,
          z: road + 4.6,
          w: 4.5,
          h: 0.02,
          d: 0.12
        }
      );

      centerMarks.push(
        {
          x: road,
          y: 0.05,
          z: position,
          w: 0.12,
          h: 0.02,
          d: 4.5
        },
        {
          x: position,
          y: 0.05,
          z: road,
          w: 4.5,
          h: 0.02,
          d: 0.12
        }
      );
    }
  }

  instanced(
    laneMarks,
    laneMarkMaterial
  );

  instanced(
    centerMarks,
    centerMarkMaterial
  );

  const signalPoleMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x454d54,
      metalness: 0.4,
      roughness: 0.55
    });

  const signalHousingMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x171b20,
      roughness: 0.65
    });

  const signalGeometry =
    new THREE.SphereGeometry(
      0.22,
      8,
      6
    );

  function addSignal(
    x,
    z,
    axis
  ) {
    box(
      0.14,
      4.5,
      0.14,
      signalPoleMaterial,
      x,
      2.25,
      z
    );

    box(
      0.7,
      1.8,
      0.5,
      signalHousingMaterial,
      x,
      4.7,
      z
    );

    const red = new THREE.Mesh(
      signalGeometry,
      new THREE.MeshBasicMaterial({
        color: 0xff263c
      })
    );

    const amber = new THREE.Mesh(
      signalGeometry,
      new THREE.MeshBasicMaterial({
        color: 0xffc83d
      })
    );

    const green = new THREE.Mesh(
      signalGeometry,
      new THREE.MeshBasicMaterial({
        color: 0x42ff82
      })
    );

    red.position.set(
      x,
      5.25,
      z + 0.28
    );

    amber.position.set(
      x,
      4.7,
      z + 0.28
    );

    green.position.set(
      x,
      4.15,
      z + 0.28
    );

    scene.add(
      red,
      amber,
      green
    );

    signals.push({
      axis,
      red,
      amber,
      green
    });
  }

  for (
    let xIndex = 0;
    xIndex < roads.length;
    xIndex += 2
  ) {
    for (
      let zIndex = 0;
      zIndex < roads.length;
      zIndex += 2
    ) {
      addSignal(
        roads[xIndex],
        roads[zIndex],
        (xIndex + zIndex) % 2 === 0
          ? "x"
          : "z"
      );
    }
  }

  // Continue with city construction in Part 2.
