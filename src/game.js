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
    { bx: 2, bz: 2, type: "market", name: "WALMART" },
    { bx: 5, bz: 2, type: "gas", name: "SUNSET GAS" },
    { bx: 3, bz: 7, type: "market", name: "CORNER MARKET" },
    { bx: 8, bz: 7, type: "auto", name: "AUTO PARTS" },
    { bx: 5, bz: 5, type: "bank", name: "CITY BANK" },
    { bx: 8, bz: 3, type: "food", name: "MCDONALD'S" },
    { bx: 0, bz: 8, type: "food", name: "PIZZA PLACE" },
    { bx: 10, bz: 5, type: "hospital", name: "CITY HOSPITAL" },
    { bx: 9, bz: 1, type: "dealer", name: "CITY MOTORS" }
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
    cash = Number(localStorage.getItem("cityCash") || 500);
    bank = Number(localStorage.getItem("cityBank") || 1000);
  } catch {}

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x91cce5);
  scene.fog = new THREE.Fog(0x91cce5, 160, 760);

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
    Math.min(devicePixelRatio || 1, mobile ? 1.4 : 1.8)
  );

  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

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

  sun.position.set(-40, 75, 30);
  sun.castShadow = true;

  const shadowSize = mobile ? 1024 : 2048;
  sun.shadow.mapSize.set(shadowSize, shadowSize);

  scene.add(sun);

  const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
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
    const mesh = new THREE.Mesh(boxGeometry, material);
    mesh.scale.set(width, height, depth);
    mesh.position.set(x, y, z);
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  const roundedGeometryCache = new Map();

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

    if (!roundedGeometryCache.has(key)) {
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

  function addCollider(x, z, width, depth) {
    colliders.push({
      minX: x - width / 2,
      maxX: x + width / 2,
      minZ: z - depth / 2,
      maxZ: z + depth / 2
    });
  }

  function instanced(records, material, shadow = false) {
    if (!records.length) return null;

    const mesh = new THREE.InstancedMesh(
      boxGeometry,
      material,
      records.length
    );

    records.forEach((record, index) => {
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

      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();

      mesh.setMatrixAt(index, dummy.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    scene.add(mesh);

    return mesh;
  }

  const terrainGeometry = new THREE.PlaneGeometry(
    1900,
    1900,
    90,
    90
  );

  const terrainPositions =
    terrainGeometry.attributes.position;

  for (let i = 0; i < terrainPositions.count; i++) {
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

    terrainPositions.setZ(i, height);
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

  const grassMaterial = new THREE.MeshStandardMaterial({
    color: 0x496f40,
    roughness: 1
  });

  box(1500, 0.12, 1500, grassMaterial, 0, -0.22, 0);

  const roadMaterial = new THREE.MeshStandardMaterial({
    color: 0x303740,
    roughness: 0.98
  });

  roadMaterial.onBeforeCompile = shader => {
    shader.vertexShader =
      "varying vec2 vRoadXZ;\n" +
      shader.vertexShader.replace(
        "#include <begin_vertex>",
        `
          #include <begin_vertex>
          vRoadXZ = (
            modelMatrix * vec4(position, 1.0)
          ).xz;
        `
      );

    shader.fragmentShader =
      "varying vec2 vRoadXZ;\n" +
      shader.fragmentShader.replace(
        "#include <color_fragment>",
        `
          #include <color_fragment>

          vec2 tile = floor(vRoadXZ * 3.0);

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

  const sidewalkMaterial = new THREE.MeshStandardMaterial({
    color: 0xadb0ae,
    roughness: 0.94
  });

  const curbMaterial = new THREE.MeshStandardMaterial({
    color: 0xd1d1ca,
    roughness: 0.9
  });

  const lotMaterial = new THREE.MeshStandardMaterial({
    color: 0x527a48,
    roughness: 1
  });

  const roofMaterial = new THREE.MeshStandardMaterial({
    color: 0x353c43,
    roughness: 0.9
  });

  box(1400, 0.12, 1400, roadMaterial, 0, -0.04, 0);

  for (const road of roads) {
    box(roadWidth, 0.03, 1400, roadMaterial, road, 0.02, 0);
    box(1400, 0.03, roadWidth, roadMaterial, 0, 0.02, road);
  }

  const laneMarkMaterial = new THREE.MeshStandardMaterial({
    color: 0xe7e6dc
  });

  const centerMarkMaterial = new THREE.MeshStandardMaterial({
    color: 0xe5c145
  });

  const laneMarks = [];
  const centerMarks = [];

  for (const road of roads) {
    for (let position = -620; position <= 620; position += 14) {
      const closeToRoad = roads.some(
        candidate => Math.abs(position - candidate) < 14
      );

      if (closeToRoad) continue;

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

  instanced(laneMarks, laneMarkMaterial);
  instanced(centerMarks, centerMarkMaterial);

  const signalPoleMaterial = new THREE.MeshStandardMaterial({
    color: 0x454d54,
    metalness: 0.4,
    roughness: 0.55
  });

  const signalHousingMaterial = new THREE.MeshStandardMaterial({
    color: 0x171b20,
    roughness: 0.65
  });

  const signalGeometry = new THREE.SphereGeometry(
    0.22,
    8,
    6
  );

  function addSignal(x, z, axis) {
    box(0.14, 4.5, 0.14, signalPoleMaterial, x, 2.25, z);
    box(0.7, 1.8, 0.5, signalHousingMaterial, x, 4.7, z);

    const red = new THREE.Mesh(
      signalGeometry,
      new THREE.MeshBasicMaterial({ color: 0xff263c })
    );

    const amber = new THREE.Mesh(
      signalGeometry,
      new THREE.MeshBasicMaterial({ color: 0xffc83d })
    );

    const green = new THREE.Mesh(
      signalGeometry,
      new THREE.MeshBasicMaterial({ color: 0x42ff82 })
    );

    red.position.set(x, 5.25, z + 0.28);
    amber.position.set(x, 4.7, z + 0.28);
    green.position.set(x, 4.15, z + 0.28);

    scene.add(red, amber, green);

    signals.push({
      axis,
      red,
      amber,
      green
    });
  }

  for (let xIndex = 0; xIndex < roads.length; xIndex += 2) {
    for (let zIndex = 0; zIndex < roads.length; zIndex += 2) {
      addSignal(
        roads[xIndex],
        roads[zIndex],
        (xIndex + zIndex) % 2 === 0 ? "x" : "z"
      );
    }
  }

  const sidewalkRecords = [];
  const curbRecords = [];
  const lots = [];

  const houseMaterials = [
    0xe6d2b0,
    0xc9d8dc,
    0xd6bda7,
    0xc9d4b8,
    0xd9c5da,
    0xd7c59b
  ].map(color => new THREE.MeshStandardMaterial({
    color,
    roughness: 0.9
  }));

  const houseRoofMaterials = [
    0x883a31,
    0x364d69,
    0x594a3a,
    0x3b5745,
    0x4d444b
  ].map(color => new THREE.MeshStandardMaterial({
    color,
    roughness: 0.9
  }));

  const buildingMaterials = [
    0x45596b,
    0x5c5048,
    0x40555a,
    0x545b69,
    0x604a5c,
    0x65705e
  ].map(color => new THREE.MeshStandardMaterial({
    color,
    roughness: 0.82
  }));

  const parkMaterial = new THREE.MeshStandardMaterial({
    color: 0x43713e,
    roughness: 1
  });

  const parkBlocks = [];
  const blockData = [];

  const stationBlocks = [
    [1, 3],
    [7, 6]
  ];

  const architecture = {
    trim: new THREE.MeshStandardMaterial({
      color: 0xd6d5cd,
      roughness: 0.72
    }),
    frame: new THREE.MeshStandardMaterial({
      color: 0x28333d,
      metalness: 0.35,
      roughness: 0.48
    }),
    glass: new THREE.MeshStandardMaterial({
      color: 0x487b91,
      metalness: 0.25,
      roughness: 0.22,
      transparent: true,
      opacity: 0.68
    }),
    door: new THREE.MeshStandardMaterial({
      color: 0x244858,
      metalness: 0.25,
      roughness: 0.28
    }),
    light: new THREE.MeshStandardMaterial({
      color: 0xffe1ac,
      emissive: 0xffcf83,
      emissiveIntensity: 1.4
    })
  };

  const facadeMaterials = [];

  function makeFacadeMaterial(wallColor) {
    const canvas = document.createElement("canvas");
    const glowCanvas = document.createElement("canvas");

    canvas.width = glowCanvas.width = 256;
    canvas.height = glowCanvas.height = 512;

    const context = canvas.getContext("2d");
    const glowContext = glowCanvas.getContext("2d");

    context.fillStyle = wallColor;
    context.fillRect(0, 0, 256, 512);

    glowContext.fillStyle = "#000";
    glowContext.fillRect(0, 0, 256, 512);

    for (let row = 0; row < 8; row++) {
      for (let column = 0; column < 4; column++) {
        const x = column * 64 + 12;
        const y = row * 64 + 10;
        const lit = Math.random() < 0.38;

        context.fillStyle = "#26313b";
        context.fillRect(x - 3, y - 3, 46, 43);

        const glassGradient =
          context.createLinearGradient(
            x,
            y,
            x + 40,
            y + 36
          );

        glassGradient.addColorStop(
          0,
          lit ? "#d9bc85" : "#718e9e"
        );

        glassGradient.addColorStop(
          1,
          lit ? "#756344" : "#233b4d"
        );

        context.fillStyle = glassGradient;
        context.fillRect(x, y, 40, 36);

        if (lit) {
          glowContext.fillStyle =
            Math.random() < 0.7
              ? "#ffc982"
              : "#b3d8f1";

          glowContext.fillRect(x, y, 40, 36);
        }

        context.fillStyle = "#34404a";
        context.fillRect(x + 19, y, 2, 36);
        context.fillRect(x, y + 17, 40, 2);

        glowContext.fillStyle = "#000";
        glowContext.fillRect(x + 19, y, 2, 36);
        glowContext.fillRect(x, y + 17, 40, 2);

        context.fillStyle = "rgba(230,234,230,.45)";
        context.fillRect(x - 3, y + 38, 46, 3);
      }

      context.fillStyle = "rgba(0,0,0,.18)";
      context.fillRect(0, row * 64 + 60, 256, 2);
    }

    function textureFrom(source) {
      const texture = new THREE.CanvasTexture(source);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.anisotropy = Math.min(
        4,
        renderer.capabilities.getMaxAnisotropy()
      );
      return texture;
    }

    const material = new THREE.MeshStandardMaterial({
      map: textureFrom(canvas),
      emissiveMap: textureFrom(glowCanvas),
      emissive: 0xffffff,
      emissiveIntensity: 0.65,
      roughness: 0.67,
      metalness: 0.08
    });

    facadeMaterials.push(material);
    return material;
  }

  const towerFacades = [
    "#8c999e",
    "#b3a293",
    "#788e91",
    "#969ba6",
    "#a69a93",
    "#a1aa99"
  ].map(makeFacadeMaterial);

  function buildDetailedTower(
    x,
    z,
    width,
    depth,
    height,
    index
  ) {
    const base = 0.3;
    const facade = towerFacades[index % towerFacades.length];

    const geometry = new THREE.BoxGeometry(
      width,
      height,
      depth
    );

    const uv = geometry.attributes.uv;

    for (let face = 0; face < 6; face++) {
      if (face === 2 || face === 3) continue;

      const faceWidth = face < 2 ? depth : width;

      for (let corner = 0; corner < 4; corner++) {
        const vertexIndex = face * 4 + corner;

        uv.setXY(
          vertexIndex,
          uv.getX(vertexIndex) * faceWidth / 12.8,
          uv.getY(vertexIndex) * height / 27.2
        );
      }
    }

    uv.needsUpdate = true;

    const tower = new THREE.Mesh(
      geometry,
      [
        facade,
        facade,
        roofMaterial,
        roofMaterial,
        facade,
        facade
      ]
    );

    tower.position.set(
      x,
      base + height / 2,
      z
    );

    tower.castShadow = true;
    tower.receiveShadow = true;
    scene.add(tower);

    box(
      width + 0.12,
      3.1,
      depth + 0.12,
      architecture.frame,
      x,
      1.85,
      z
    );

    box(
      width + 0.35,
      0.22,
      depth + 0.35,
      architecture.trim,
      x,
      3.48,
      z
    );

    for (const sideX of [-1, 1]) {
      for (const sideZ of [-1, 1]) {
        box(
          0.28,
          height,
          0.28,
          architecture.trim,
          x + sideX * width / 2,
          base + height / 2,
          z + sideZ * depth / 2
        );
      }
    }

    for (const side of [-1, 1]) {
      const front = z + side * (depth / 2 + 0.1);

      box(
        3.2,
        2.6,
        0.12,
        architecture.door,
        x,
        1.65,
        front
      );

      box(
        0.1,
        2.6,
        0.18,
        architecture.trim,
        x,
        1.65,
        front + side * 0.08
      );

      box(
        5,
        0.22,
        1.6,
        architecture.frame,
        x,
        3.05,
        front + side * 0.6
      );

      box(
        3.8,
        0.06,
        0.45,
        architecture.light,
        x,
        2.9,
        front + side * 0.55
      );
    }

    const roofY = base + height;

    box(
      width + 0.45,
      0.3,
      depth + 0.45,
      roofMaterial,
      x,
      roofY + 0.15,
      z
    );

    for (const side of [-1, 1]) {
      box(
        width,
        0.65,
        0.22,
        architecture.trim,
        x,
        roofY + 0.5,
        z + side * depth / 2
      );

      box(
        0.22,
        0.65,
        depth,
        architecture.trim,
        x + side * width / 2,
        roofY + 0.5,
        z
      );
    }

    box(
      width * 0.32,
      2.2,
      depth * 0.28,
      architecture.frame,
      x - width * 0.15,
      roofY + 1.4,
      z - depth * 0.13,
      scene,
      true
    );

    box(
      width * 0.35,
      0.2,
      depth * 0.31,
      architecture.trim,
      x - width * 0.15,
      roofY + 2.6,
      z - depth * 0.13
    );

    addCollider(x, z, width, depth);
  }

  function roofHouse(
    x,
    z,
    width,
    depth,
    height,
    style,
    wallMaterial,
    houseRoofMaterial
  ) {
    box(
      width,
      height,
      depth,
      wallMaterial,
      x,
      0.28 + height / 2,
      z,
      scene,
      true
    );

    if (style % 3 === 0) {
      const mesh = new THREE.Mesh(
        new THREE.ConeGeometry(1, 1, 4),
        houseRoofMaterial
      );

      mesh.position.set(
        x,
        0.28 + height + 1,
        z
      );

      mesh.rotation.y = Math.PI / 4;
      mesh.scale.set(
        width * 0.78,
        2.1,
        depth * 0.78
      );

      mesh.castShadow = true;
      scene.add(mesh);
    } else if (style % 3 === 1) {
      box(
        width + 1,
        0.35,
        depth + 1,
        houseRoofMaterial,
        x,
        0.28 + height + 0.18,
        z,
        scene,
        true
      );

      box(
        width * 0.45,
        0.8,
        depth * 0.38,
        houseRoofMaterial,
        x,
        0.28 + height + 0.68,
        z
      );
    } else {
      box(
        width + 1,
        0.45,
        depth + 1,
        houseRoofMaterial,
        x,
        0.28 + height + 0.22,
        z,
        scene,
        true
      );

      box(
        width * 0.4,
        0.4,
        depth * 0.4,
        houseRoofMaterial,
        x + width * 0.24,
        0.28 + height + 0.65,
        z - depth * 0.22
      );
    }

    addCollider(x, z, width, depth);

    const windowMaterial = new THREE.MeshStandardMaterial({
      color: 0x8dd5e9,
      metalness: 0.15,
      roughness: 0.25
    });

    for (const side of [-1, 1]) {
      box(
        2,
        1.2,
        0.06,
        windowMaterial,
        x + side * width * 0.24,
        0.28 + height * 0.56,
        z - depth / 2 - 0.04
      );

      box(
        0.06,
        1.2,
        2,
        windowMaterial,
        x + width / 2 + 0.04,
        0.28 + height * 0.56,
        z + side * depth * 0.22
      );
    }
  }

  let hospital = {
    x: 0,
    z: 0,
    entryX: 0,
    entryZ: 0
  };

  function addStoreSign(x, y, z, text, color) {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 128;

    const context = canvas.getContext("2d");

    context.fillStyle = color;
    context.fillRect(0, 0, 1024, 128);

    const shading = context.createLinearGradient(
      0,
      0,
      0,
      128
    );

    shading.addColorStop(
      0,
      "rgba(255,255,255,.15)"
    );

    shading.addColorStop(
      1,
      "rgba(0,0,0,.22)"
    );

    context.fillStyle = shading;
    context.fillRect(0, 0, 1024, 128);

    context.strokeStyle = "rgba(255,255,255,.4)";
    context.lineWidth = 3;
    context.strokeRect(10, 10, 1004, 108);

    let fontSize = 64;
    context.font = `800 ${fontSize}px system-ui`;

    while (
      context.measureText(text).width > 940 &&
      fontSize > 20
    ) {
      fontSize -= 2;
      context.font = `800 ${fontSize}px system-ui`;
    }

    context.fillStyle = "#fff";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, 512, 66);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    texture.anisotropy = Math.min(
      4,
      renderer.capabilities.getMaxAnisotropy()
    );

    box(
      20.4,
      1.95,
      0.22,
      architecture.frame,
      x,
      y,
      z - 0.07
    );

    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 1.65),
      new THREE.MeshBasicMaterial({
        map: texture,
        toneMapped: false,
        side: THREE.DoubleSide
      })
    );

    sign.position.set(x, y, z + 0.06);
    scene.add(sign);
  }

  function buildSpecialBuilding(store, x, z) {
    const front = z + 13;

    const wall = new THREE.MeshStandardMaterial({
      color: 0x6b7779,
      roughness: 0.8
    });

    const floor = new THREE.MeshStandardMaterial({
      color: 0xaaa99e,
      roughness: 0.92
    });

    const glass = new THREE.MeshStandardMaterial({
      color: 0x17465a,
      metalness: 0.25,
      roughness: 0.2
    });

    const signColor =
      store.type === "hospital" ? "#b52331" :
      store.type === "dealer" ? "#174b83" :
      store.type === "market" ? "#0757a9" :
      store.type === "food" ? "#bd1e2d" :
      store.type === "gas" ? "#1e733f" :
      "#20539b";

    if (store.type === "hospital") {
      const width = 52;
      const depth = 34;
      const height = 20;

      box(width, 0.25, depth, floor, x, 0.4, z);
      box(
        width,
        height,
        depth,
        wall,
        x,
        0.28 + height / 2,
        z - 4,
        scene,
        true
      );

      box(
        width,
        0.7,
        depth,
        roofMaterial,
        x,
        0.28 + height + 0.3,
        z - 4,
        scene,
        true
      );

      box(13, 3, 0.5, glass, x, 2.1, z + 13);
      box(6, 11, 2, wall, x - 19, 5.5, z + 13, scene, true);
      box(6, 11, 2, wall, x + 19, 5.5, z + 13, scene, true);
      box(8, 2, 0.35, glass, x, 12, z + 13.4);

      addStoreSign(
        x,
        15,
        z + 13.7,
        "CITY HOSPITAL",
        signColor
      );

      const bedMaterial = new THREE.MeshStandardMaterial({
        color: 0xf2f4f0
      });

      const blanketMaterial = new THREE.MeshStandardMaterial({
        color: 0x6cadd2
      });

      for (const dx of [-18, -9, 9, 18]) {
        box(5, 0.35, 2, bedMaterial, x + dx, 0.9, z - 9);
        box(
          4,
          0.18,
          1.7,
          blanketMaterial,
          x + dx,
          1.17,
          z - 9
        );
        box(
          1,
          0.35,
          2,
          bedMaterial,
          x + dx - 2,
          0.83,
          z - 9
        );
      }

      const deskMaterial = new THREE.MeshStandardMaterial({
        color: 0x77543b
      });

      box(11, 1.4, 3, deskMaterial, x, 1.1, z + 5);
      box(2, 0.8, 0.1, glass, x, 2, z + 5);

      hospital = {
        x,
        z,
        entryX: x,
        entryZ: z + 16,
        type: "hospital",
        name: store.name
      };

      shops.push(hospital);
      addCollider(x, z - 4, width, depth);
      return;
    }

    if (store.type === "dealer") {
      const width = 48;
      const depth = 30;

      box(width, 0.2, depth, floor, x, 0.38, z);
      box(1, 7, depth, wall, x - width / 2, 3.8, z);
      box(1, 7, depth, wall, x + width / 2, 3.8, z);
      box(width, 7, 1, wall, x, 3.8, z - depth / 2);
      box(
        3,
        7,
        1,
        wall,
        x - width / 2 + 1.5,
        3.8,
        z + depth / 2
      );
      box(
        3,
        7,
        1,
        wall,
        x + width / 2 - 1.5,
        3.8,
        z + depth / 2
      );
      box(42, 0.4, 26, roofMaterial, x, 7.5, z);

      const windowMaterial = new THREE.MeshStandardMaterial({
        color: 0x8ed3e4,
        transparent: true,
        opacity: 0.3
      });

      box(
        38,
        5,
        0.12,
        windowMaterial,
        x,
        3.9,
        z + depth / 2 - 0.2
      );

      addStoreSign(
        x,
        6.3,
        z + depth / 2 + 0.3,
        "CITY MOTORS",
        signColor
      );

      for (let i = 0; i < 3; i++) {
        dealerDisplays.push({
          color: [0x258bdb, 0xe5c744, 0x62ad73][i],
          x: x - 13 + i * 13,
          z: z + 8
        });
      }

      shops.push({
        ...store,
        x,
        z,
        entryX: x,
        entryZ: z + 17
      });

      return;
    }

    const width = 42;
    const depth = 24;

    box(width, 0.2, depth, floor, x, 0.38, z);

    box(
      2.5,
      5,
      0.5,
      wall,
      x - width / 2 + 1.25,
      2.9,
      front
    );

    box(
      2.5,
      5,
      0.5,
      wall,
      x + width / 2 - 1.25,
      2.9,
      front
    );

    box(
      width - 5,
      5,
      0.5,
      wall,
      x,
      2.9,
      z - depth / 2
    );

    box(
      0.5,
      5,
      depth,
      wall,
      x - width / 2,
      2.9,
      z
    );

    box(
      0.5,
      5,
      depth,
      wall,
      x + width / 2,
      2.9,
      z
    );

    box(
      width,
      0.5,
      depth,
      roofMaterial,
      x,
      5.6,
      z
    );

    box(
      9,
      0.08,
      15,
      sidewalkMaterial,
      x,
      0.34,
      z + 20.5
    );

    for (const side of [-1, 1]) {
      const windowX = x + side * 10.5;

      box(
        15,
        3.15,
        0.12,
        architecture.glass,
        windowX,
        2.03,
        front + 0.04
      );

      for (const frameY of [0.48, 3.62]) {
        box(
          15.2,
          0.12,
          0.22,
          architecture.trim,
          windowX,
          frameY,
          front + 0.12
        );
      }

      for (let column = 0; column <= 5; column++) {
        box(
          0.09,
          3.15,
          0.2,
          architecture.frame,
          windowX - 7.5 + column * 3,
          2.03,
          front + 0.13
        );
      }

      box(
        0.24,
        3.25,
        0.3,
        architecture.trim,
        x + side * 2.75,
        2.08,
        front + 0.15
      );

      addCollider(
        windowX,
        front,
        15,
        0.22
      );
    }

    box(
      width + 0.4,
      0.85,
      1.6,
      architecture.trim,
      x,
      5.3,
      front - 0.55,
      scene,
      true
    );

    box(
      7,
      0.22,
      3.3,
      architecture.frame,
      x,
      3.8,
      front + 1.1,
      scene,
      true
    );

    box(
      5.6,
      0.06,
      0.5,
      architecture.light,
      x,
      3.65,
      front + 1.1
    );

    box(
      5.2,
      0.1,
      1.8,
      sidewalkMaterial,
      x,
      0.43,
      front + 0.3
    );

    addStoreSign(
      x,
      4.9,
      front + 0.3,
      store.name,
      signColor
    );

    if (store.type === "market") {
      const blue = new THREE.MeshStandardMaterial({
        color: 0x0757a9
      });

      const yellow = new THREE.MeshStandardMaterial({
        color: 0xffd438
      });

      box(
        37,
        1.4,
        0.3,
        blue,
        x,
        4.35,
        front + 0.18
      );

      box(
        37,
        0.24,
        0.35,
        yellow,
        x,
        3.52,
        front + 0.2
      );

      const parking = new THREE.MeshStandardMaterial({
        color: 0x454b4d,
        roughness: 1
      });

      box(
        48,
        0.06,
        12,
        parking,
        x,
        0.34,
        z + 22
      );

      const stripe = new THREE.MeshStandardMaterial({
        color: 0xf1e9c8
      });

      for (let n = -4; n <= 4; n++) {
        box(
          0.12,
          0.025,
          8,
          stripe,
          x + n * 4.5,
          0.385,
          z + 22
        );
      }

      const cartMaterial = new THREE.MeshStandardMaterial({
        color: 0x9da7a8,
        metalness: 0.5
      });

      for (const n of [-1, 1]) {
        box(
          0.8,
          0.7,
          0.6,
          cartMaterial,
          x + n * 2,
          0.7,
          z + 20
        );
      }
    }

    if (store.type === "gas") {
      const canopy = new THREE.MeshStandardMaterial({
        color: 0xe9e9df
      });

      box(
        31,
        0.65,
        17,
        canopy,
        x,
        5.7,
        z + 26
      );

      for (const dx of [-12, 12]) {
        box(
          0.5,
          5,
          0.5,
          roofMaterial,
          x + dx,
          2.8,
          z + 26
        );
      }

      const pump = new THREE.MeshStandardMaterial({
        color: 0xf2f2e9
      });

      for (const dx of [-8, 0, 8]) {
        box(
          1.2,
          2.3,
          1.1,
          pump,
          x + dx,
          1.45,
          z + 24
        );

        box(
          0.8,
          0.35,
          0.08,
          glass,
          x + dx,
          1.9,
          z + 23.4
        );
      }
    }

    if (store.type === "food") {
      const red = new THREE.MeshStandardMaterial({
        color: 0xb5222a
      });

      box(
        34,
        1.4,
        0.3,
        red,
        x,
        4.3,
        front + 0.22
      );

      const counter = new THREE.MeshStandardMaterial({
        color: 0x76553b
      });

      box(
        12,
        1.2,
        3,
        counter,
        x,
        1.1,
        z + 3
      );

      for (const dx of [-8, 8]) {
        const table = new THREE.MeshStandardMaterial({
          color: 0xb62a30
        });

        box(
          2,
          0.75,
          2,
          table,
          x + dx,
          0.8,
          z - 3
        );
      }
    }

    if (store.type === "market") {
      const shelfMaterial =
        new THREE.MeshStandardMaterial({
          color: 0x986d4e
        });

      for (const dx of [-12, -5, 5, 12]) {
        box(
          2,
          1.8,
          10,
          shelfMaterial,
          x + dx,
          1.3,
          z - 3
        );
      }
    }

    shops.push({
      ...store,
      x,
      z,
      entryX: x,
      entryZ: z + 16
    });
  }

  for (let bx = 0; bx < 12; bx++) {
    for (let bz = 0; bz < 12; bz++) {
      const x = blocks[bx];
      const z = blocks[bz];

      const store = storeDefs.find(
        candidate =>
          candidate.bx === bx &&
          candidate.bz === bz
      );

      const isStation = stationBlocks.some(
        block =>
          block[0] === bx &&
          block[1] === bz
      );

      const forcedPark = [
        [1, 8],
        [6, 9],
        [10, 8],
        [4, 3]
      ].some(
        block =>
          block[0] === bx &&
          block[1] === bz
      );

      const isPark =
        !store &&
        !isStation &&
        (
          forcedPark ||
          (bx * 7 + bz * 11) % 19 === 0
        );

      const home =
        !store &&
        !isStation &&
        !isPark &&
        Math.hypot(x, z) > 155;

      blockData.push({
        x,
        z,
        home,
        isPark,
        isStore: !!store,
        isStation
      });

      sidewalkRecords.push({
        x,
        y: 0.1,
        z,
        w: 62,
        h: 0.2,
        d: 62
      });

      lots.push({
        x,
        y: 0.25,
        z,
        w: 56,
        h: 0.1,
        d: 56
      });

      const edge = 30.7;

      curbRecords.push(
        {
          x: x - edge,
          y: 0.19,
          z,
          w: 0.5,
          h: 0.15,
          d: 62
        },
        {
          x: x + edge,
          y: 0.19,
          z,
          w: 0.5,
          h: 0.15,
          d: 62
        },
        {
          x,
          y: 0.19,
          z: z - edge,
          w: 62,
          h: 0.15,
          d: 0.5
        },
        {
          x,
          y: 0.19,
          z: z + edge,
          w: 62,
          h: 0.15,
          d: 0.5
        }
      );

      if (isPark) {
        parkBlocks.push({ x, z });

        box(
          56,
          0.1,
          56,
          parkMaterial,
          x,
          0.28,
          z
        );

        const pathMaterial =
          new THREE.MeshStandardMaterial({
            color: 0xb8ae94,
            roughness: 1
          });

        box(
          3,
          0.04,
          48,
          pathMaterial,
          x,
          0.36,
          z
        );

        box(
          48,
          0.04,
          3,
          pathMaterial,
          x,
          0.36,
          z
        );

        for (let i = 0; i < 12; i++) {
          treeData.push({
            x: x + rand(-24, 24),
            z: z + rand(-24, 24),
            s: rand(0.7, 1.3)
          });
        }

        const benchMaterial =
          new THREE.MeshStandardMaterial({
            color: 0x76502e
          });

        for (const dx of [-12, 12]) {
          box(
            4,
            0.25,
            1,
            benchMaterial,
            x + dx,
            0.65,
            z + 8
          );

          box(
            0.25,
            1.2,
            0.25,
            benchMaterial,
            x + dx - 1.5,
            0.25,
            z + 8
          );

          box(
            0.25,
            1.2,
            0.25,
            benchMaterial,
            x + dx + 1.5,
            0.25,
            z + 8
          );
        }

        continue;
      }

      if (isStation) {
        const policeMaterial =
          new THREE.MeshStandardMaterial({
            color: 0x344e6e,
            roughness: 0.8
          });

        box(
          30,
          8,
          24,
          policeMaterial,
          x,
          4.3,
          z,
          scene,
          true
        );

        box(
          31,
          0.5,
          25,
          roofMaterial,
          x,
          8.6,
          z,
          scene,
          true
        );

        const blue = new THREE.MeshStandardMaterial({
          color: 0x1b4e9b,
          emissive: 0x102656
        });

        box(
          18,
          1,
          0.25,
          blue,
          x,
          6.3,
          z + 12.2
        );

        addCollider(x, z, 31, 25);
        continue;
      }

      if (store) {
        buildSpecialBuilding(store, x, z);
        continue;
      }

      if (home) {
        const style = (bx * 3 + bz * 7) % 5;

        for (const side of [-1, 1]) {
          roofHouse(
            x + rand(-5, 5),
            z + side * 15,
            rand(17, 22),
            rand(17, 22),
            rand(4, 6),
            style,
            houseMaterials[
              (bx + bz + side + 12) %
              houseMaterials.length
            ],
            houseRoofMaterials[
              (bx * 2 + bz + style + 20) %
              houseRoofMaterials.length
            ]
          );
        }

        continue;
      }

      const downtown = clamp(
        1 - Math.hypot(x, z) / 590,
        0,
        1
      );

      const count =
        Math.random() < 0.15 + downtown * 0.2
          ? 1
          : 4;

      for (let n = 0; n < count; n++) {
        const dx =
          count === 1
            ? rand(-3, 3)
            : n % 2
              ? 15
              : -15;

        const dz =
          count === 1
            ? rand(-3, 3)
            : n < 2
              ? -15
              : 15;

        const width =
          count === 1
            ? rand(25, 34)
            : rand(17, 22);

        const depth =
          count === 1
            ? rand(24, 34)
            : rand(17, 22);

        const height =
          count === 1
            ? rand(45, 100)
            : rand(10, 27) +
              downtown * rand(8, 40);

        const px = x + dx + rand(-2, 2);
        const pz = z + dz + rand(-2, 2);

        buildDetailedTower(
          px,
          pz,
          width,
          depth,
          height,
          bx * 7 + bz * 3 + n
        );
      }
    }
  }

  instanced(sidewalkRecords, sidewalkMaterial);
  instanced(curbRecords, curbMaterial);
  instanced(lots, lotMaterial);

  const waterMaterial = new THREE.MeshStandardMaterial({
    color: 0x287e9d,
    roughness: 0.17,
    metalness: 0.18,
    transparent: true,
    opacity: 0.92
  });

  const river = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 1800),
    waterMaterial
  );

  river.rotation.x = -Math.PI / 2;
  river.position.set(590, -0.03, 0);
  scene.add(river);

  const woodMaterial = new THREE.MeshStandardMaterial({
    color: 0x79512e,
    roughness: 0.95
  });

  const darkWood = new THREE.MeshStandardMaterial({
    color: 0x4f3523,
    roughness: 1
  });

  for (let i = 0; i < 9; i++) {
    box(
      3,
      0.22,
      16,
      woodMaterial,
      552 + i * 3,
      0.28,
      0
    );
  }

  for (const x of [553, 576]) {
    for (const z of [-6, 6]) {
      box(
        0.45,
        2,
        0.45,
        darkWood,
        x,
        -0.5,
        z
      );
    }
  }

  for (const z of [-6, 6]) {
    box(
      25,
      0.25,
      0.4,
      darkWood,
      564,
      0.45,
      z
    );
  }

  for (const x of [554, 574]) {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.16,
        0.16,
        2.4,
        8
      ),
      darkWood
    );

    post.position.set(x, 1.2, 0);
    scene.add(post);
  }

  const treeRecords = [];

  for (let i = 0; i < 620; i++) {
    const side = Math.floor(Math.random() * 4);

    let x;
    let z;

    if (side === 0) {
      x = rand(-850, 850);
      z = rand(-900, -520);
    } else if (side === 1) {
      x = rand(-850, 850);
      z = rand(520, 900);
    } else if (side === 2) {
      x = rand(-900, -520);
      z = rand(-850, 850);
    } else {
      x = rand(640, 900);
      z = rand(-850, 850);
    }

    treeRecords.push({
      x,
      z,
      s: rand(0.75, 1.6)
    });
  }

  for (const tree of treeData) {
    treeRecords.push(tree);
  }

  const trunkGeometry = new THREE.CylinderGeometry(
    0.22,
    0.38,
    2.7,
    7
  );

  const leafGeometry = new THREE.SphereGeometry(
    1,
    12,
    9
  );

  leafGeometry.scale(1.9, 2.3, 1.9);

  const trunkMaterial = new THREE.MeshStandardMaterial({
    color: 0x60422d
  });

  const leafMaterial = new THREE.MeshStandardMaterial({
    color: 0x2c713e
  });

  const trunks = new THREE.InstancedMesh(
    trunkGeometry,
    trunkMaterial,
    treeRecords.length
  );

  const leaves = new THREE.InstancedMesh(
    leafGeometry,
    leafMaterial,
    treeRecords.length
  );

  treeRecords.forEach((tree, index) => {
    dummy.position.set(
      tree.x,
      1.35 * tree.s,
      tree.z
    );

    dummy.scale.setScalar(tree.s);
    dummy.rotation.y = rand(0, Math.PI * 2);
    dummy.updateMatrix();

    trunks.setMatrixAt(index, dummy.matrix);

    dummy.position.y = 4.3 * tree.s;
    dummy.updateMatrix();

    leaves.setMatrixAt(index, dummy.matrix);
  });

  trunks.castShadow = true;
  leaves.castShadow = true;
  scene.add(trunks, leaves);

  const skinMaterials = [
    0xdca77e,
    0x9b674a,
    0xf0c5a1,
    0x704b39
  ].map(color => new THREE.MeshStandardMaterial({
    color
  }));

  const shirtMaterials = [
    0x42b9e7,
    0xe55c71,
    0x6bd28c,
    0xe6a64a,
    0x9d78e8,
    0xf1f1eb
  ].map(color => new THREE.MeshStandardMaterial({
    color
  }));

  const pantsMaterial = new THREE.MeshStandardMaterial({
    color: 0x28354a
  });

  const hairMaterials = [
    0x211b19,
    0x503322,
    0xb68a43,
    0x6a3230
  ].map(color => new THREE.MeshStandardMaterial({
    color
  }));

  function makePerson(index, kind = "civilian") {
    const group = new THREE.Group();
    const child = kind === "child";
    const skin = skinMaterials[index % skinMaterials.length];

    const clothing =
      kind === "cop"
        ? new THREE.MeshStandardMaterial({
            color: 0x203b70
          })
        : shirtMaterials[index % shirtMaterials.length];

    const torso = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.23, 0.40, 4, 12),
      clothing
    );

    torso.position.y = 1.02;
    group.add(torso);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.21, 18, 12),
      skin
    );

    head.position.y = 1.55;
    group.add(head);

    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(
        0.222,
        18,
        10,
        0,
        Math.PI * 2,
        0,
        Math.PI * 0.58
      ),
      hairMaterials[(index * 3) % hairMaterials.length]
    );

    hair.position.y = 1.60;
    group.add(hair);

    function makeArm(side) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.30, 1.25, 0);

      const arm = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.085, 0.38, 4, 10),
        clothing
      );

      arm.position.y = -0.25;
      pivot.add(arm);
      group.add(pivot);

      return pivot;
    }

    function makeLeg(side) {
      const leg = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.095, 0.40, 4, 10),
        pantsMaterial
      );

      leg.position.set(side * 0.13, 0.35, 0);
      group.add(leg);

      return leg;
    }

    const leftArm = makeArm(-1);
    const rightArm = makeArm(1);
    const leftLeg = makeLeg(-1);
    const rightLeg = makeLeg(1);

    if (child) {
      group.scale.setScalar(0.72);
    }

    group.traverse(object => {
      if (object.isMesh) {
        object.castShadow = true;
      }
    });

    scene.add(group);

    const person = {
      group,
      leftLeg,
      rightLeg,
      leftArm,
      rightArm,
      phase: rand(0, Math.PI * 2),
      kind
    };

    modelPeople.push(person);
    return person;
  }

  const playerModel = makePerson(99);
  playerModel.group.visible = false;

  const parkList = blockData.filter(
    block => block.isPark
  );

  const walkerCount = mobile ? 26 : 48;

  for (let i = 0; i < walkerCount; i++) {
    const park =
      parkList[i % Math.max(1, parkList.length)] || {
        x: blocks[i % blocks.length],
        z: blocks[(i * 3) % blocks.length]
      };

    const child = i % 7 === 0;

    const model = makePerson(
      i,
      child ? "child" : "civilian"
    );

    const route = [
      [park.x - 20, park.z - 18],
      [park.x + 20, park.z - 18],
      [park.x + 20, park.z + 18],
      [park.x - 20, park.z + 18]
    ];

    const start = Math.floor(Math.random() * 4);

    model.group.position.set(
      route[start][0],
      0.28,
      route[start][1]
    );

    people.push({
      model,
      x: route[start][0],
      z: route[start][1],
      route,
      target: (start + 1) % 4,
      speed: child ? 1.7 : rand(0.8, 1.4),
      pause: rand(0, 2),
      routine: child ? "play" : "walk"
    });
  }

  function makePet(type, x, z, color) {
    const group = new THREE.Group();

    const fur = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.95
    });

    const body = new THREE.Mesh(
      new THREE.SphereGeometry(
        type === "dog" ? 0.48 : 0.35,
        10,
        8
      ),
      fur
    );

    body.scale.set(1.35, 0.8, 0.8);
    body.position.y = 0.55;
    group.add(body);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(
        type === "dog" ? 0.31 : 0.26,
        9,
        7
      ),
      fur
    );

    head.position.set(0, 0.83, -0.48);
    group.add(head);

    if (type === "cat") {
      for (const side of [-1, 1]) {
        const ear = new THREE.Mesh(
          new THREE.ConeGeometry(0.12, 0.30, 5),
          fur
        );

        ear.position.set(side * 0.17, 1.1, -0.49);
        group.add(ear);
      }
    } else {
      for (const side of [-1, 1]) {
        const ear = new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 7, 6),
          fur
        );

        ear.scale.set(0.8, 1.5, 0.5);
        ear.position.set(side * 0.25, 0.9, -0.62);
        group.add(ear);
      }
    }

    const legGeometry = new THREE.BoxGeometry(
      0.12,
      0.42,
      0.13
    );

    const legs = [];

    for (const side of [-1, 1]) {
      for (const front of [-1, 1]) {
        const leg = new THREE.Mesh(
          legGeometry,
          fur
        );

        leg.position.set(
          side * 0.2,
          0.28,
          front * 0.25
        );

        group.add(leg);
        legs.push(leg);
      }
    }

    const tail = new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.045,
        0.07,
        0.55,
        6
      ),
      fur
    );

    tail.position.set(0, 0.75, 0.47);
    tail.rotation.x = -0.8;
    group.add(tail);

    group.position.set(x, 0.2, z);
    scene.add(group);

    const pet = {
      group,
      legs,
      x,
      z,
      kind: type,
      phase: rand(0, Math.PI * 2)
    };

    modelPets.push(pet);
    return pet;
  }

  for (let i = 0; i < (mobile ? 8 : 15); i++) {
    const park =
      parkList[i % Math.max(1, parkList.length)] || {
        x: 0,
        z: 0
      };

    const type = i % 3 === 0 ? "cat" : "dog";

    const pet = makePet(
      type,
      park.x + rand(-14, 14),
      park.z + rand(-14, 14),
      type === "cat" ? 0xb98d60 : 0x9a704e
    );

    pet.cx = park.x;
    pet.cz = park.z;
    pet.angle = rand(0, Math.PI * 2);
    pet.radius = rand(5, 20);

    animals.push(pet);
  }

  const tireMaterial = new THREE.MeshStandardMaterial({
    color: 0x101115,
    roughness: 0.95
  });

  const glassMaterial = new THREE.MeshStandardMaterial({
    color: 0x173244,
    metalness: 0.2,
    roughness: 0.2,
    transparent: true,
    opacity: 0.48,
    depthWrite: false
  });

  const interiorMaterial = new THREE.MeshStandardMaterial({
    color: 0x292c30,
    roughness: 0.9
  });

  const chromeMaterial = new THREE.MeshStandardMaterial({
    color: 0x9ba5a8,
    metalness: 0.7
  });

  const headlightMaterial = new THREE.MeshStandardMaterial({
    color: 0xffefbd,
    emissive: 0xffd66b,
    emissiveIntensity: 2
  });

  const tailLightMaterial = new THREE.MeshStandardMaterial({
    color: 0xff2637,
    emissive: 0x8e0010
  });

  const wheelGeometry = new THREE.CylinderGeometry(
    0.42,
    0.42,
    0.28,
    12
  );

  wheelGeometry.rotateZ(Math.PI / 2);

  let cameraShake = 0;

  const crackTexture = (() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;

    const context = canvas.getContext("2d");
    context.clearRect(0, 0, 256, 256);
    context.strokeStyle = "rgba(255,255,255,.85)";
    context.lineWidth = 1.4;

    for (let n = 0; n < 3; n++) {
      const cx = rand(60, 196);
      const cy = rand(60, 196);

      for (let i = 0; i < 11; i++) {
        let x = cx;
        let y = cy;
        let angle = rand(0, Math.PI * 2);

        context.beginPath();
        context.moveTo(x, y);

        for (let step = 0; step < 6; step++) {
          angle += rand(-0.5, 0.5);
          x += Math.cos(angle) * rand(8, 22);
          y += Math.sin(angle) * rand(8, 22);
          context.lineTo(x, y);
        }

        context.stroke();
      }

      for (let radius = 10; radius < 40; radius += 12) {
        context.beginPath();
        context.arc(
          cx,
          cy,
          radius + rand(-3, 3),
          0,
          Math.PI * 2
        );
        context.stroke();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  })();

  const sparkGeometry = new THREE.BoxGeometry(
    0.06,
    0.06,
    0.06
  );

  const sparkMaterial = new THREE.MeshBasicMaterial({
    color: 0xffc04a,
    toneMapped: false
  });

  const shardGeometry = new THREE.BoxGeometry(
    0.18,
    0.03,
    0.14
  );

  function spawnSparks(point, count) {
    for (let i = 0; i < count; i++) {
      const spark = new THREE.Mesh(
        sparkGeometry,
        sparkMaterial
      );

      spark.position.copy(point);
      scene.add(spark);

      debris.push({
        mesh: spark,
        vx: rand(-6, 6),
        vy: rand(2, 7),
        vz: rand(-6, 6),
        life: rand(0.25, 0.6),
        spark: true
      });
    }
  }

  function spawnShards(point, car, count) {
    for (let i = 0; i < count; i++) {
      const shard = new THREE.Mesh(
        shardGeometry,
        car.bodyMat
      );

      shard.position.copy(point);
      shard.castShadow = true;
      scene.add(shard);

      debris.push({
        mesh: shard,
        vx: rand(-3, 3),
        vy: rand(2, 5),
        vz: rand(-3, 3),
        life: 5,
        spin: rand(-10, 10)
      });
    }
  }

  function deformCar(car, local, force) {
    const inX =
      -Math.sign(local.x) *
      (
        Math.abs(local.x) / 1.08 >=
        Math.abs(local.z) / 2.1
          ? 1
          : 0
      );

    const inZ =
      -Math.sign(local.z) *
      (inX === 0 ? 1 : 0);

    const radius =
      0.9 +
      Math.min(force, 40) * 0.035;

    const maxDent = 0.65;

    for (const part of car.deformable) {
      const position =
        part.mesh.geometry.attributes.position;

      const original = part.original;
      const meshPosition = part.mesh.position;

      let changed = false;

      for (let i = 0; i < position.count; i++) {
        const ox = original[i * 3];
        const oy = original[i * 3 + 1];
        const oz = original[i * 3 + 2];

        const dx = ox + meshPosition.x - local.x;
        const dy = (oy + meshPosition.y - local.y) * 1.4;
        const dz = oz + meshPosition.z - local.z;

        const distance = Math.hypot(dx, dy, dz);

        if (distance > radius) {
          continue;
        }

        const noise =
          0.7 +
          0.6 * (
            Math.sin(
              ox * 12.9 +
              oy * 37.7 +
              oz * 78.2
            ) * 0.5 +
            0.5
          );

        const deformation =
          (1 - distance / radius) ** 2 *
          force *
          0.02 *
          noise;

        let x = position.getX(i) + inX * deformation;
        let y = position.getY(i) - deformation * 0.3;
        let z = position.getZ(i) + inZ * deformation;

        const ex = x - ox;
        const ey = y - oy;
        const ez = z - oz;
        const length = Math.hypot(ex, ey, ez);

        if (length > maxDent) {
          const scale = maxDent / length;
          x = ox + ex * scale;
          y = oy + ey * scale;
          z = oz + ez * scale;
        }

        position.setXYZ(i, x, y, z);
        changed = true;
      }

      if (changed) {
        position.needsUpdate = true;
        part.mesh.geometry.computeVertexNormals();
      }
    }
  }

  function repairGeometry(car, amount = 1) {
    for (const part of car.deformable) {
      const position =
        part.mesh.geometry.attributes.position;

      const original = part.original;

      for (let i = 0; i < position.count; i++) {
        position.setXYZ(
          i,
          position.getX(i) +
            (original[i * 3] - position.getX(i)) * amount,

          position.getY(i) +
            (
              original[i * 3 + 1] -
              position.getY(i)
            ) * amount,

          position.getZ(i) +
            (
              original[i * 3 + 2] -
              position.getZ(i)
            ) * amount
        );
      }

      position.needsUpdate = true;
      part.mesh.geometry.computeVertexNormals();
    }
  }

  function breakLight(car, side) {
    if (car.brokenLights[side]) return;

    car.brokenLights[side] = true;

    const mesh =
      side === "left"
        ? car.headL
        : car.headR;

    mesh.material.emissiveIntensity = 0;
    mesh.material.color.set(0x1c1c1c);
    mesh.scale.set(0.48, 0.15, 0.1);
  }

  function updateCarEffects(dt) {
    for (const car of modelCars) {
      if (!car.smokeOn) continue;

      const fire = car.health <= 22;

      car.smoke.forEach((puff, index) => {
        puff.userData.t =
          (puff.userData.t ?? index / 3) +
          dt * (fire ? 1.3 : 0.8);

        const t = puff.userData.t % 1;

        puff.position.set(
          (index - 1) * 0.25 +
          Math.sin(t * 6 + index) * 0.12,
          1.05 + t * 1.8,
          -1.5 + t * 0.7
        );

        puff.scale.setScalar(0.6 + t * 2);
        puff.material.opacity =
          (1 - t) * (fire ? 0.75 : 0.45);

        if (fire && index === 0) {
          puff.material.color.set(0xff7a1a);
          puff.material.emissive.set(0xff4a00);
          puff.material.emissiveIntensity =
            2 * (1 - t);
        }
      });
    }
  }

  function makeCar(color = 0xd94149, cop = false) {
    const group = new THREE.Group();

    const bodyMat = new THREE.MeshPhysicalMaterial({
      color: cop ? 0xf0f2f5 : color,
      metalness: 0.38,
      roughness: 0.27,
      clearcoat: 1,
      clearcoatRoughness: 0.16
    });

    const bodyMesh = roundedBox(
      2.15,
      0.62,
      4.2,
      0.23,
      bodyMat,
      0,
      0.72,
      0,
      group,
      true
    );

    bodyMesh.geometry =
      bodyMesh.geometry.clone();

    const carGlassMat = glassMaterial.clone();

    const cabinMesh = roundedBox(
      1.7,
      0.62,
      1.9,
      0.20,
      carGlassMat,
      0,
      1.18,
      0.05,
      group,
      true
    );

    cabinMesh.geometry =
      cabinMesh.geometry.clone();

    const deformable = [
      bodyMesh,
      cabinMesh
    ].map(mesh => ({
      mesh,
      original: Float32Array.from(
        mesh.geometry.attributes.position.array
      )
    }));

    const carHeadMat = headlightMaterial.clone();

    for (const z of [-0.45, 1.05]) {
      box(
        1.25,
        0.22,
        0.75,
        interiorMaterial,
        0,
        0.84,
        z,
        group
      );

      box(
        1.15,
        0.65,
        0.2,
        interiorMaterial,
        0,
        1.15,
        z + 0.3,
        group
      );
    }

    box(
      1.45,
      0.22,
      0.5,
      interiorMaterial,
      0,
      1.1,
      -0.8,
      group
    );

    const steering = new THREE.Mesh(
      new THREE.TorusGeometry(
        0.23,
        0.035,
        7,
        18
      ),
      chromeMaterial
    );

    steering.position.set(-0.5, 1.12, -0.7);
    steering.rotation.y = 0.25;
    group.add(steering);

    const wheels = [];

    for (const x of [-1.08, 1.08]) {
      for (const z of [-1.3, 1.3]) {
        const wheel = new THREE.Mesh(
          wheelGeometry,
          tireMaterial
        );

        wheel.position.set(x, 0.43, z);
        wheel.castShadow = true;
        group.add(wheel);
        wheels.push(wheel);
      }
    }

    const frontBumper = box(
      2.1,
      0.22,
      0.22,
      chromeMaterial,
      0,
      0.47,
      -2.2,
      group,
      true
    );

    const rearBumper = box(
      2.1,
      0.22,
      0.22,
      chromeMaterial,
      0,
      0.47,
      2.2,
      group,
      true
    );

    const headL = box(
      0.48,
      0.23,
      0.1,
      carHeadMat,
      -0.68,
      0.92,
      -2.13,
      group
    );

    const headR = box(
      0.48,
      0.23,
      0.1,
      carHeadMat,
      0.68,
      0.92,
      -2.13,
      group
    );

    box(
      0.4,
      0.18,
      0.1,
      tailLightMaterial,
      -0.7,
      0.91,
      2.13,
      group
    );

    box(
      0.4,
      0.18,
      0.1,
      tailLightMaterial,
      0.7,
      0.91,
      2.13,
      group
    );

    let red = null;
    let blue = null;

    if (cop) {
      red = new THREE.MeshStandardMaterial({
        color: 0xff1739,
        emissive: 0xff001b,
        emissiveIntensity: 2
      });

      blue = new THREE.MeshStandardMaterial({
        color: 0x287cff,
        emissive: 0x004aff,
        emissiveIntensity: 2
      });

      box(
        1.5,
        0.15,
        0.45,
        interiorMaterial,
        0,
        1.52,
        0,
        group
      );

      box(
        0.65,
        0.18,
        0.42,
        red,
        -0.38,
        1.68,
        0,
        group
      );

      box(
        0.65,
        0.18,
        0.42,
        blue,
        0.38,
        1.68,
        0,
        group
      );
    }

    const smoke = [];

    for (let i = 0; i < 3; i++) {
      const puff = new THREE.Mesh(
        new THREE.SphereGeometry(0.27, 7, 6),
        new THREE.MeshStandardMaterial({
          color: 0x383838,
          transparent: true,
          opacity: 0.4
        })
      );

      puff.position.set(
        (i - 1) * 0.3,
        1.3,
        -1.5
      );

      puff.visible = false;
      group.add(puff);
      smoke.push(puff);
    }

    scene.add(group);

    const car = {
      group,
      bodyMat,
      glassMat: carGlassMat,
      deformable,
      wheels,
      frontBumper,
      rearBumper,
      headL,
      headR,
      red,
      blue,
      smoke,
      smokeOn: false,
      baseColor: cop ? 0xf0f2f5 : color,
      health: 100,
      disabled: false,
      wrecked: false,
      lastHit: 0,
      pull: 0,
      glassCracked: false,

      brokenLights: {
        left: false,
        right: false
      },

      detached: {
        frontBumper: false,
        rearBumper: false
      }
    };

    modelCars.push(car);
    return car;
  }

  const npcDriverShirts = [
    0x42b9e7,
    0xe55c71,
    0x6bd28c,
    0xe6a64a,
    0x9d78e8
  ].map(color => new THREE.MeshStandardMaterial({
    color
  }));

  const npcDriverSkin =
    new THREE.MeshStandardMaterial({
      color: 0xdca77e
    });

  function makeCarDriver(car, index) {
    const driver = new THREE.Group();

    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.48, 0.28),
      npcDriverShirts[index % npcDriverShirts.length]
    );

    torso.position.y = 0.93;
    driver.add(torso);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.17, 9, 7),
      npcDriverSkin
    );

    head.position.set(0, 1.32, -0.04);
    driver.add(head);

    driver.position.set(-0.48, 0, -0.42);
    car.group.add(driver);
    car.driver = driver;

    return driver;
  }

  for (const display of dealerDisplays) {
    const displayCar = makeCar(display.color);

    displayCar.group.position.set(
      display.x,
      0.28,
      display.z
    );
  }

  const personalCar = makeCar(0xd94149);
  let playerCar = personalCar;

  const trafficColors = [
    0xffc342,
    0x39c8ff,
    0x9f75ff,
    0xf15c91,
    0xf4f4f4,
    0xff7043,
    0x53d788
  ];

  const trafficCount = mobile ? 24 : 42;

  function transformTraffic(vehicle) {
    if (vehicle.axis === "x") {
      vehicle.x = vehicle.position;

      vehicle.z =
        vehicle.road +
        (vehicle.direction > 0 ? 3.2 : -3.2);

      vehicle.car.group.rotation.y =
        vehicle.direction > 0
          ? -Math.PI / 2
          : Math.PI / 2;
    } else {
      vehicle.x =
        vehicle.road +
        (vehicle.direction > 0 ? -3.2 : 3.2);

      vehicle.z = vehicle.position;

      vehicle.car.group.rotation.y =
        vehicle.direction > 0
          ? Math.PI
          : 0;
    }

    vehicle.car.group.position.set(
      vehicle.x,
      0,
      vehicle.z
    );
  }

  for (let i = 0; i < trafficCount; i++) {
    const vehicle = {
      car: makeCar(
        trafficColors[i % trafficColors.length]
      ),

      axis: Math.random() < 0.5 ? "x" : "z",

      road: roads[
        Math.floor(Math.random() * roads.length)
      ],

      direction: Math.random() < 0.5 ? 1 : -1,
      position: rand(-470, 470),
      speed: rand(5, 9),
      x: 0,
      z: 0,
      routine: "commute",
      aiState: "cruise",
      driver: null
    };

    vehicle.driver = makeCarDriver(
      vehicle.car,
      i
    );

    transformTraffic(vehicle);
    traffic.push(vehicle);
  }

  const trafficTemplate = traffic.slice();

  for (let i = 0; i < 3; i++) {
    const officer = {
      car: makeCar(0xffffff, true),
      axis: i % 2 ? "x" : "z",
      road: roads[2 + i * 4],
      direction: i % 2 ? 1 : -1,
      position: rand(-400, 400),
      speed: 8,
      x: 0,
      z: 0,
      heading: 0,
      state: "patrol",
      officer: null,
      parked: false,
      arrestTimer: 0
    };

    transformTraffic(officer);
    police.push(officer);
  }

  const modelLoader = new GLTFLoader();
  const loadedModels = {};

  async function loadModel(kind, url, install) {
    try {
      const gltf = await modelLoader.loadAsync(url);
      loadedModels[kind] = gltf;
      install(gltf);
    } catch (error) {
      console.warn(
        `Could not load ${url}; using procedural model`,
        error
      );
    }
  }

  function installVisual(owner, gltf, height) {
    if (owner.highDetail) return;

    const visual = cloneSkinned(gltf.scene);

    const bounds = new THREE.Box3().setFromObject(
      visual
    );

    const size = bounds.getSize(
      new THREE.Vector3()
    );

    if (size.y > 0) {
      visual.scale.setScalar(
        height / size.y
      );
    }

    visual.updateMatrixWorld(true);

    const fitted = new THREE.Box3().setFromObject(
      visual
    );

    const center = fitted.getCenter(
      new THREE.Vector3()
    );

    visual.position.x -= center.x;
    visual.position.y -= fitted.min.y;
    visual.position.z -= center.z;

    visual.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    for (const child of owner.group.children) {
      child.visible = false;
    }

    owner.group.add(visual);
    owner.highDetail = true;

    if (gltf.animations.length) {
      const mixer = new THREE.AnimationMixer(visual);

      mixer.clipAction(
        gltf.animations[0]
      ).play();

      modelMixers.push(mixer);
    }
  }

  loadModel(
    "sedan",
    "assets/sedan.glb",
    gltf => {
      modelCars
        .filter(car => !car.red)
        .forEach(car =>
          installVisual(car, gltf, 1.7)
        );
    }
  );

  loadModel(
    "police",
    "assets/police.glb",
    gltf => {
      modelCars
        .filter(car => car.red)
        .forEach(car =>
          installVisual(car, gltf, 1.8)
        );
    }
  );

  loadModel(
    "person",
    "assets/person.glb",
    gltf => {
      modelPeople.forEach(person =>
        installVisual(
          person,
          gltf,
          person.kind === "child" ? 1.25 : 1.75
        )
      );
    }
  );

  loadModel(
    "dog",
    "assets/dog.glb",
    gltf => {
      modelPets
        .filter(pet => pet.kind === "dog")
        .forEach(pet =>
          installVisual(pet, gltf, 0.9)
        );
    }
  );

  loadModel(
    "cat",
    "assets/cat.glb",
    gltf => {
      modelPets
        .filter(pet => pet.kind === "cat")
        .forEach(pet =>
          installVisual(pet, gltf, 0.6)
        );
    }
  );

  const darkPaint = new THREE.Color(0x2a2522);

  function detachBumper(car, key) {
    if (car.detached[key]) return;

    car.detached[key] = true;

    const mesh = car[key];
    scene.attach(mesh);

    debris.push({
      mesh,
      vx: rand(-3, 3),
      vy: 5,
      vz: rand(-3, 3),
      life: 7,
      spin: rand(-4, 4)
    });
  }

  function restoreCar(car, color = car.baseColor) {
    car.baseColor = color;
    car.health = 100;
    car.disabled = false;
    car.wrecked = false;
    car.lastHit = 0;
    car.pull = 0;

    car.bodyMat.color.set(color);
    car.bodyMat.roughness = 0.27;
    car.bodyMat.clearcoat = 1;

    repairGeometry(car, 1);

    car.glassCracked = false;
    car.glassMat.map = null;
    car.glassMat.opacity = 0.48;
    car.glassMat.color.set(0x173244);
    car.glassMat.needsUpdate = true;

    for (const side of ["left", "right"]) {
      const mesh =
        side === "left"
          ? car.headL
          : car.headR;

      mesh.material.color.set(0xffefbd);
      mesh.material.emissiveIntensity = 2;
      mesh.scale.set(0.48, 0.23, 0.1);
      car.brokenLights[side] = false;
    }

    car.smokeOn = false;

    car.smoke.forEach(puff => {
      puff.visible = false;
      puff.material.opacity = 0.4;
      puff.material.color.set(0x383838);
      puff.material.emissive.set(0x000000);
    });

    if (car.driver) {
      car.driver.visible = !car.highDetail;
    }

    if (car.detached?.frontBumper) {
      car.group.attach(car.frontBumper);
      car.frontBumper.position.set(0, 0.47, -2.2);
      car.frontBumper.rotation.set(0, 0, 0);
      car.detached.frontBumper = false;
    }

    if (car.detached?.rearBumper) {
      car.group.attach(car.rearBumper);
      car.rearBumper.position.set(0, 0.47, 2.2);
      car.rearBumper.rotation.set(0, 0, 0);
      car.detached.rearBumper = false;
    }
  }

  function damageCar(
    car,
    amount,
    zone,
    hitX,
    hitZ
  ) {
    if (
      car.wrecked ||
      performance.now() - car.lastHit < 180
    ) {
      return;
    }

    car.lastHit = performance.now();

    car.health = Math.max(
      0,
      car.health - amount * 0.35
    );

    let local;

    if (hitX !== undefined) {
      car.group.updateMatrixWorld();

      local = car.group.worldToLocal(
        new THREE.Vector3(
          hitX,
          0.8,
          hitZ
        )
      );
    } else {
      local = new THREE.Vector3(
        zone === "side"
          ? Math.random() < 0.5 ? -1 : 1
          : 0,

        0,

        zone === "front"
          ? -2
          : zone === "rear"
            ? 2
            : rand(-1, 1)
      );
    }

    local.y = 0.8;

    if (
      Math.abs(local.x) / 1.08 >
      Math.abs(local.z) / 2.1
    ) {
      local.x = Math.sign(local.x) * 1.08;
      local.z = clamp(local.z, -2.1, 2.1);
    } else {
      local.z = Math.sign(local.z || -1) * 2.1;
      local.x = clamp(local.x, -1.08, 1.08);
    }

    zone =
      local.z < -1.5
        ? "front"
        : local.z > 1.5
          ? "rear"
          : "side";

    deformCar(car, local, amount);

    const world = car.group.localToWorld(
      local.clone()
    );

    spawnSparks(
      world,
      Math.round(5 + amount * 0.5)
    );

    spawnShards(
      world,
      car,
      amount > 12 ? 3 : 1
    );

    if (car === playerCar) {
      cameraShake = Math.min(
        0.6,
        cameraShake + amount * 0.02
      );
    }

    if (zone === "front" && amount > 8) {
      breakLight(
        car,
        local.x < 0 ? "left" : "right"
      );

      if (amount > 22) {
        breakLight(
          car,
          local.x < 0 ? "right" : "left"
        );
      }
    }

    if (
      zone === "front" &&
      (amount > 16 || car.health < 55)
    ) {
      detachBumper(car, "frontBumper");
    }

    if (
      zone === "rear" &&
      (amount > 16 || car.health < 55)
    ) {
      detachBumper(car, "rearBumper");
    }

    if (
      car.health < 70 &&
      !car.glassCracked
    ) {
      car.glassCracked = true;
      car.glassMat.map = crackTexture;
      car.glassMat.color.set(0x5a7080);
      car.glassMat.opacity = 0.62;
      car.glassMat.needsUpdate = true;
    }

    if (car.health < 40) {
      car.glassMat.opacity = 0.8;
    }

    const wear = 1 - car.health / 100;

    car.bodyMat.color
      .set(car.baseColor)
      .lerp(darkPaint, wear * 0.5);

    car.bodyMat.roughness =
      0.27 + wear * 0.6;

    car.bodyMat.clearcoat =
      1 - wear;

    car.pull = clamp(
      car.pull +
      (local.x < 0 ? -1 : 1) *
      amount *
      0.003,
      -0.18,
      0.18
    );

    if (car.health < 48) {
      car.smokeOn = true;
      car.smoke.forEach(
        puff => puff.visible = true
      );
    }

    if (car.health <= 5) {
      car.disabled = true;

      if (car === playerCar) {
        showToast("ENGINE FAILURE");
      }
    }

    if (car.health <= 0) {
      car.wrecked = true;
      car.disabled = true;
      car.bodyMat.color.set(0x383838);

      breakLight(car, "left");
      breakLight(car, "right");

      detachBumper(car, "frontBumper");
      detachBumper(car, "rearBumper");

      if (car === playerCar) {
        state = "dead";
        clearControls();

        showOverlay(
          "VEHICLE DESTROYED",
          "The ambulance will take you to the hospital. A service fee applies.",
          "RESPAWN AT HOSPITAL"
        );
      }
    }

    if (
      car === playerCar &&
      !car.wrecked &&
      !car.disabled
    ) {
      showToast(
        `VEHICLE DAMAGED · ${Math.ceil(car.health)}%`
      );
    }
  }

  function issueCrime(
    message,
    amount = 0.5,
    key = message,
    cooldown = 8
  ) {
    const now = performance.now();
    const nextAllowed =
      crimeCooldowns.get(key) || 0;

    if (now < nextAllowed) {
      return false;
    }

    crimeCooldowns.set(
      key,
      now + cooldown * 1000
    );

    player.wanted = Math.min(
      5,
      player.wanted + amount
    );

    lawCooldown = 5;

    showToast(
      `${message} — +${amount} STAR${
        amount === 1 ? "" : "S"
      }`
    );

    return true;
  }

  function policeCanSee(officer, x, z) {
    const dx = x - officer.x;
    const dz = z - officer.z;
    const distance = Math.hypot(dx, dz);

    if (
      distance >
      (player.onFoot ? 70 : 105)
    ) {
      return false;
    }

    if (distance < 0.001) {
      return true;
    }

    const yaw = officer.car.group.rotation.y;
    const forwardX = -Math.sin(yaw);
    const forwardZ = -Math.cos(yaw);

    if (
      distance > 16 &&
      (
        dx * forwardX +
        dz * forwardZ
      ) / distance < -0.1
    ) {
      return false;
    }

    for (const wall of colliders) {
      let near = 0;
      let far = 1;

      for (
        const [
          start,
          delta,
          min,
          max
        ] of [
          [officer.x, dx, wall.minX, wall.maxX],
          [officer.z, dz, wall.minZ, wall.maxZ]
        ]
      ) {
        if (Math.abs(delta) < 0.0001) {
          if (
            start < min ||
            start > max
          ) {
            near = 2;
            break;
          }

          continue;
        }

        const a = (min - start) / delta;
        const b = (max - start) / delta;

        near = Math.max(
          near,
          Math.min(a, b)
        );

        far = Math.min(
          far,
          Math.max(a, b)
        );
      }

      if (
        near <= far &&
        far > 0.02 &&
        near < 0.98
      ) {
        return false;
      }
    }

    return true;
  }

  function nearestStore() {
    if (!player.onFoot) {
      return null;
    }

    return shops.find(
      store =>
        Math.hypot(
          player.footX - store.entryX,
          player.footZ - store.entryZ
        ) < 9
    ) || null;
  }

  function resolveBuildings(
    x,
    z,
    radius
  ) {
    for (const collider of colliders) {
      const nearX = clamp(
        x,
        collider.minX,
        collider.maxX
      );

      const nearZ = clamp(
        z,
        collider.minZ,
        collider.maxZ
      );

      const dx = x - nearX;
      const dz = z - nearZ;

      const distanceSquared =
        dx * dx +
        dz * dz;

      if (
        distanceSquared >=
        radius * radius
      ) {
        continue;
      }

      if (distanceSquared < 0.0001) {
        const choices = [
          {
            d: Math.abs(x - collider.minX),
            nx: -1,
            nz: 0
          },
          {
            d: Math.abs(collider.maxX - x),
            nx: 1,
            nz: 0
          },
          {
            d: Math.abs(z - collider.minZ),
            nx: 0,
            nz: -1
          },
          {
            d: Math.abs(collider.maxZ - z),
            nx: 0,
            nz: 1
          }
        ].sort((a, b) => a.d - b.d);

        x +=
          choices[0].nx *
          (radius + choices[0].d);

        z +=
          choices[0].nz *
          (radius + choices[0].d);
      } else {
        const distance =
          Math.sqrt(distanceSquared);

        const nx = dx / distance;
        const nz = dz / distance;
        const penetration =
          radius - distance;

        x += nx * penetration;
        z += nz * penetration;
      }
    }

    return [x, z];
  }

  function down(name) {
    const keyMap = {
      KeyW: "gas",
      ArrowUp: "gas",
      KeyS: "brake",
      ArrowDown: "brake",
      Space: "brake",
      KeyA: "left",
      ArrowLeft: "left",
      KeyD: "right",
      ArrowRight: "right",
      ShiftLeft: "sprint",
      ShiftRight: "sprint"
    };

    for (const key of keys) {
      if (keyMap[key] === name) {
        return true;
      }
    }

    for (const value of held.values()) {
      if (value === name) {
        return true;
      }
    }

    return false;
  }

  function updatePlayer(dt) {
    if (player.onFoot) {
      const inputX =
        Number(down("right")) -
        Number(down("left"));

      const inputForward =
        Number(down("gas")) -
        Number(down("brake"));

      const magnitude = Math.hypot(
        inputX,
        inputForward
      );

      const normalizer =
        magnitude > 1
          ? 1 / magnitude
          : 1;

      const forwardX = -Math.sin(cameraYaw);
      const forwardZ = -Math.cos(cameraYaw);
      const rightX = Math.cos(cameraYaw);
      const rightZ = -Math.sin(cameraYaw);

      const targetVx = (
        rightX * inputX +
        forwardX * inputForward
      ) * normalizer * (
        down("sprint") ? 7.2 : 4.6
      );

      const targetVz = (
        rightZ * inputX +
        forwardZ * inputForward
      ) * normalizer * (
        down("sprint") ? 7.2 : 4.6
      );

      const acceleration =
        magnitude > 0 ? 18 : 14;

      player.footVx = approach(
        player.footVx,
        targetVx,
        acceleration * dt
      );

      player.footVz = approach(
        player.footVz,
        targetVz,
        acceleration * dt
      );

      player.footX += player.footVx * dt;
      player.footZ += player.footVz * dt;

      [player.footX, player.footZ] =
        resolveBuildings(
          player.footX,
          player.footZ,
          0.45
        );

      player.x = player.footX;
      player.z = player.footZ;
      player.speed = 0;

      if (
        Math.hypot(
          player.footVx,
          player.footVz
        ) > 0.15
      ) {
        const desiredHeading =
          Math.atan2(
            -player.footVx,
            -player.footVz
          );

        const difference =
          Math.atan2(
            Math.sin(
              desiredHeading -
              player.footHeading
            ),
            Math.cos(
              desiredHeading -
              player.footHeading
            )
          );

        player.footHeading +=
          difference *
          Math.min(1, dt * 12);
      }

      playerModel.group.visible = true;

      playerModel.group.position.set(
        player.footX,
        0.28,
        player.footZ
      );

      playerModel.group.rotation.y =
        player.footHeading;

      playerModel.phase += dt * 8;

      playerModel.leftLeg.rotation.x =
        Math.sin(playerModel.phase) * 0.45;

      playerModel.rightLeg.rotation.x =
        -Math.sin(playerModel.phase) * 0.45;

      playerModel.leftArm.rotation.x =
        -Math.sin(playerModel.phase) * 0.4;

      playerModel.rightArm.rotation.x =
        Math.sin(playerModel.phase) * 0.4;

      return;
    }

    playerModel.group.visible = false;

    let forward =
      player.vx * -Math.sin(player.yaw) +
      player.vz * -Math.cos(player.yaw);

    let lateral =
      player.vx * Math.cos(player.yaw) -
      player.vz * Math.sin(player.yaw);

    const gas = down("gas");
    const brake = down("brake");

    const turn =
      Number(down("right")) -
      Number(down("left"));

    if (!playerCar.disabled && gas) {
      forward +=
        (forward < -0.2 ? 17 : 10.5) *
        dt;
    }

    if (brake) {
      if (forward > 0.2) {
        forward = Math.max(
          0,
          forward - 29 * dt
        );
      } else if (!gas) {
        forward = Math.max(
          -9,
          forward - 7 * dt
        );
      }
    }

    if (!gas && !brake) {
      forward = approach(
        forward,
        0,
        0.9 * dt
      );
    }

    if (playerCar.disabled) {
      forward = approach(
        forward,
        0,
        8 * dt
      );
    }

    forward = clamp(
      forward,
      -9,
      43
    );

    player.yaw -=
      turn *
      1.7 *
      clamp(
        Math.abs(forward) / 5,
        0,
        1
      ) *
      Math.sign(forward) *
      dt;

    player.yaw -=
      playerCar.pull *
      clamp(forward / 20, -1, 1) *
      dt;

    lateral *= Math.exp(-8 * dt);

    player.vx =
      -Math.sin(player.yaw) * forward +
      Math.cos(player.yaw) * lateral;

    player.vz =
      -Math.cos(player.yaw) * forward -
      Math.sin(player.yaw) * lateral;

    player.x += player.vx * dt;
    player.z += player.vz * dt;

    const attemptedX = player.x;
    const attemptedZ = player.z;

    [player.x, player.z] =
      resolveBuildings(
        player.x,
        player.z,
        1.2
      );

    const pushX = player.x - attemptedX;
    const pushZ = player.z - attemptedZ;
    const pushLength = Math.hypot(
      pushX,
      pushZ
    );

    if (pushLength > 0.001) {
      const normalX =
        pushX / pushLength;

      const normalZ =
        pushZ / pushLength;

      const impactSpeed = Math.max(
        0,
        -(
          player.vx * normalX +
          player.vz * normalZ
        )
      );

      if (impactSpeed > 3) {
        const amount = Math.min(
          40,
          Math.round(
            (impactSpeed - 3) * 1.5
          )
        );

        damageCar(
          playerCar,
          amount,
          "front",
          player.x - normalX * 1.2,
          player.z - normalZ * 1.2
        );
      }

      player.vx += normalX * impactSpeed;
      player.vz += normalZ * impactSpeed;
    }

    player.speed = Math.hypot(
      player.vx,
      player.vz
    );

    score += Math.abs(forward) * dt * 0.1;

    playerCar.group.position.set(
      player.x,
      0.27,
      player.z
    );

    playerCar.group.rotation.y =
      player.yaw;

    playerCar.wheels.forEach(
      wheel => {
        wheel.rotation.x -=
          forward * dt / 0.42;
      }
    );

    player.footX = player.x;
    player.footZ = player.z;
  }

  function green(axis) {
    const phase = Math.floor(
      (signalTime % 16) / 4
    );

    return axis === "x"
      ? phase === 0
      : phase === 2;
  }

  function updateTraffic(dt) {
    for (const vehicle of traffic) {
      if (vehicle.car.wrecked) continue;

      const nextRoad = roads
        .filter(road =>
          vehicle.direction > 0
            ? road > vehicle.position + 1
            : road < vehicle.position - 1
        )
        .sort((a, b) =>
          vehicle.direction > 0
            ? a - b
            : b - a
        )[0];

      const intersectionDistance =
        nextRoad === undefined
          ? Infinity
          : Math.abs(
              nextRoad -
              vehicle.position
            );

      let targetSpeed = 10;
      let emergencyBrake = false;

      if (
        intersectionDistance < 24 &&
        !green(vehicle.axis)
      ) {
        targetSpeed = 0;
      }

      for (const other of traffic) {
        if (
          other === vehicle ||
          other.car.wrecked
        ) {
          continue;
        }

        if (
          other.axis === vehicle.axis &&
          other.road === vehicle.road &&
          other.direction === vehicle.direction
        ) {
          const gap =
            (
              other.position -
              vehicle.position
            ) *
            vehicle.direction;

          if (gap > 0 && gap < 17) {
            targetSpeed = Math.min(
              targetSpeed,
              Math.max(
                0,
                (gap - 5) * 0.7
              )
            );
          }
        }

        const carGap = Math.hypot(
          other.x - vehicle.x,
          other.z - vehicle.z
        );

        if (carGap < 6) {
          targetSpeed = 0;
          emergencyBrake = true;
        }
      }

      const playerX = player.onFoot
        ? player.footX
        : player.x;

      const playerZ = player.onFoot
        ? player.footZ
        : player.z;

      const playerVx = player.onFoot
        ? player.footVx
        : player.vx;

      const playerVz = player.onFoot
        ? player.footVz
        : player.vz;

      const vehicleVx =
        vehicle.axis === "x"
          ? vehicle.direction * vehicle.speed
          : 0;

      const vehicleVz =
        vehicle.axis === "z"
          ? vehicle.direction * vehicle.speed
          : 0;

      const relativeX =
        playerX - vehicle.x;

      const relativeZ =
        playerZ - vehicle.z;

      const relativeVx =
        playerVx - vehicleVx;

      const relativeVz =
        playerVz - vehicleVz;

      const relativeSpeedSquared =
        relativeVx * relativeVx +
        relativeVz * relativeVz;

      if (relativeSpeedSquared > 0.01) {
        const closestTime = clamp(
          -(
            relativeX * relativeVx +
            relativeZ * relativeVz
          ) /
          relativeSpeedSquared,
          0,
          2.5
        );

        const predictedX =
          relativeX +
          relativeVx *
          closestTime;

        const predictedZ =
          relativeZ +
          relativeVz *
          closestTime;

        const predictedGap = Math.hypot(
          predictedX,
          predictedZ
        );

        if (predictedGap < 5.5) {
          targetSpeed = 0;
          emergencyBrake = true;
        }
      }

      for (const person of people) {
        const pedestrianGap = Math.hypot(
          person.x - vehicle.x,
          person.z - vehicle.z
        );

        if (pedestrianGap < 7) {
          targetSpeed = 0;
          emergencyBrake = true;
        } else if (pedestrianGap < 13) {
          targetSpeed = Math.min(
            targetSpeed,
            5
          );
        }
      }

      vehicle.aiState = emergencyBrake
        ? "yielding"
        : targetSpeed < vehicle.speed
          ? "braking"
          : "cruising";

      const acceleration =
        targetSpeed < vehicle.speed
          ? emergencyBrake
            ? 32
            : 19
          : 3.5;

      vehicle.speed = approach(
        vehicle.speed,
        targetSpeed,
        acceleration * dt
      );

      vehicle.position +=
        vehicle.direction *
        vehicle.speed *
        dt;

      if (vehicle.position > 510) {
        vehicle.position = -510;
      }

      if (vehicle.position < -510) {
        vehicle.position = 510;
      }

      transformTraffic(vehicle);

      vehicle.car.wheels.forEach(wheel => {
        wheel.rotation.x -=
          vehicle.speed * dt / 0.42;
      });
    }
  }

  function updatePeople(dt) {
    for (const person of people) {
      if (person.pause > 0) {
        person.pause -= dt;
        continue;
      }

      const target = person.route[person.target];

      const dx = target[0] - person.x;
      const dz = target[1] - person.z;
      const distance = Math.hypot(dx, dz);

      if (distance < 0.3) {
        person.target =
          (person.target + 1) %
          person.route.length;

        person.pause = rand(0.2, 1.8);
        continue;
      }

      const step = Math.min(
        distance,
        person.speed * dt
      );

      person.x += dx / distance * step;
      person.z += dz / distance * step;

      person.model.group.position.set(
        person.x,
        0.28,
        person.z
      );

      person.model.group.rotation.y =
        Math.atan2(-dx, -dz);

      person.model.phase += dt * 7;

      person.model.leftLeg.rotation.x =
        Math.sin(person.model.phase) * 0.4;

      person.model.rightLeg.rotation.x =
        -Math.sin(person.model.phase) * 0.4;

      person.model.leftArm.rotation.x =
        -Math.sin(person.model.phase) * 0.35;

      person.model.rightArm.rotation.x =
        Math.sin(person.model.phase) * 0.35;
    }

    for (const animal of animals) {
      animal.angle += dt * (
        animal.kind === "dog"
          ? 0.35
          : 0.23
      );

      animal.x =
        animal.cx +
        Math.cos(animal.angle) *
        animal.radius;

      animal.z =
        animal.cz +
        Math.sin(animal.angle) *
        animal.radius;

      animal.group.position.set(
        animal.x,
        0.2,
        animal.z
      );

      animal.group.rotation.y =
        -animal.angle;

      animal.phase += dt * 7;

      animal.legs.forEach(
        (leg, index) => {
          leg.rotation.x =
            Math.sin(
              animal.phase +
              index * Math.PI
            ) * 0.35;
        }
      );
    }
  }

  function updateFleeingDrivers(dt) {
    for (
      let i = fleeingDrivers.length - 1;
      i >= 0;
      i--
    ) {
      const person = fleeingDrivers[i];

      person.life -= dt;

      const dx =
        person.targetX - person.x;

      const dz =
        person.targetZ - person.z;

      const distance = Math.hypot(
        dx,
        dz
      );

      if (
        person.life <= 0 ||
        distance < 0.6
      ) {
        scene.remove(person.model.group);
        fleeingDrivers.splice(i, 1);
        continue;
      }

      const step = Math.min(
        distance,
        person.speed * dt
      );

      person.x += dx / distance * step;
      person.z += dz / distance * step;

      person.model.group.position.set(
        person.x,
        0.28,
        person.z
      );

      person.model.group.rotation.y =
        Math.atan2(-dx, -dz);

      person.model.phase += dt * 10;

      person.model.leftLeg.rotation.x =
        Math.sin(person.model.phase) * 0.55;

      person.model.rightLeg.rotation.x =
        -Math.sin(person.model.phase) * 0.55;
    }
  }

  function updatePolice(dt) {
    const now = performance.now() / 1000;

    const px = player.onFoot
      ? player.footX
      : player.x;

    const pz = player.onFoot
      ? player.footZ
      : player.z;

    for (const officer of police) {
      if (officer.parked) continue;

      const sees =
        player.wanted > 0 &&
        policeCanSee(
          officer,
          px,
          pz
        );

      if (sees) {
        policeIntel.x = px;
        policeIntel.z = pz;
        policeIntel.seenAt = now;
      }

      const knowsWhere =
        player.wanted > 0 &&
        now - policeIntel.seenAt < 14;

      if (officer.state === "arrest") {
        if (
          !sees &&
          now - policeIntel.seenAt > 2
        ) {
          officer.state = "patrol";
          officer.arrestTimer = 0;

          if (officer.officer) {
            officer.officer.group.visible = false;
          }
        } else {
          const model = officer.officer.group;
          const tx = sees ? px : policeIntel.x;
          const tz = sees ? pz : policeIntel.z;

          const dx = tx - model.position.x;
          const dz = tz - model.position.z;
          const gap = Math.hypot(dx, dz);

          if (gap > 0.001) {
            const step = Math.min(
              gap,
              2.6 * dt
            );

            model.position.x += dx / gap * step;
            model.position.z += dz / gap * step;

            model.rotation.y =
              Math.atan2(-dx, -dz);
          }

          if (
            sees &&
            Math.hypot(
              px - model.position.x,
              pz - model.position.z
            ) < 1.5
          ) {
            officer.arrestTimer =
              (officer.arrestTimer || 0) +
              dt;

            if (officer.arrestTimer > 1.4) {
              state = "arrested";
              clearControls();

              showOverlay(
                "ARRESTED",
                "The police caught you.",
                "RESPAWN"
              );
            }
          } else {
            officer.arrestTimer = 0;
          }

          continue;
        }
      }

      if (
        sees &&
        Math.hypot(
          px - officer.x,
          pz - officer.z
        ) < 8
      ) {
        if (!officer.officer) {
          officer.officer = makePerson(
            44,
            "cop"
          );
        }

        officer.state = "arrest";
        officer.arrestTimer = 0;
        officer.speed = 0;

        officer.officer.group.visible = true;

        officer.officer.group.position.set(
          officer.x + 2,
          0.28,
          officer.z
        );

        continue;
      }

      officer.state = knowsWhere
        ? "pursuit"
        : "patrol";

      let next = roads
        .filter(road =>
          officer.direction > 0
            ? road > officer.position + 0.01
            : road < officer.position - 0.01
        )
        .sort((a, b) =>
          officer.direction > 0
            ? a - b
            : b - a
        )[0];

      if (next === undefined) {
        officer.direction *= -1;

        next = roads
          .filter(road =>
            officer.direction > 0
              ? road > officer.position + 0.01
              : road < officer.position - 0.01
          )
          .sort((a, b) =>
            officer.direction > 0
              ? a - b
              : b - a
          )[0];
      }

      if (next === undefined) {
        continue;
      }

      const distance = Math.abs(
        next - officer.position
      );

      const redLight =
        distance < 14 &&
        !green(officer.axis);

      const targetSpeed = redLight
        ? 0
        : knowsWhere
          ? 14
          : 9;

      officer.speed = approach(
        officer.speed,
        targetSpeed,
        (redLight ? 22 : 5) * dt
      );

      const step = Math.min(
        officer.speed * dt,
        redLight
          ? Math.max(0, distance - 5)
          : distance
      );

      officer.position +=
        officer.direction *
        step;

      if (
        Math.abs(
          next - officer.position
        ) < 0.01
      ) {
        officer.position = next;

        const junctionX =
          officer.axis === "x"
            ? next
            : officer.road;

        const junctionZ =
          officer.axis === "z"
            ? next
            : officer.road;

        const choices = [
          {
            axis: "x",
            direction: 1,
            x: junctionX + cell,
            z: junctionZ
          },
          {
            axis: "x",
            direction: -1,
            x: junctionX - cell,
            z: junctionZ
          },
          {
            axis: "z",
            direction: 1,
            x: junctionX,
            z: junctionZ + cell
          },
          {
            axis: "z",
            direction: -1,
            x: junctionX,
            z: junctionZ - cell
          }
        ].filter(choice =>
          choice.x >= -480 &&
          choice.x <= 480 &&
          choice.z >= -480 &&
          choice.z <= 480
        );

        let chosen;

        if (knowsWhere) {
          const goalX = clamp(
            Math.round(
              policeIntel.x / cell
            ) * cell,
            -480,
            480
          );

          const goalZ = clamp(
            Math.round(
              policeIntel.z / cell
            ) * cell,
            -480,
            480
          );

          choices.sort((a, b) => {
            const cost = choice =>
              Math.abs(choice.x - goalX) +
              Math.abs(choice.z - goalZ) +
              (
                choice.axis === officer.axis &&
                choice.direction === -officer.direction
                  ? cell * 0.8
                  : 0
              );

            return cost(a) - cost(b);
          });

          chosen = choices[0];
        } else {
          const straight = choices.find(
            choice =>
              choice.axis === officer.axis &&
              choice.direction === officer.direction
          );

          chosen =
            straight && Math.random() < 0.7
              ? straight
              : choices[
                  Math.floor(
                    Math.random() * choices.length
                  )
                ];
        }

        if (chosen) {
          officer.axis = chosen.axis;
          officer.direction = chosen.direction;

          officer.road =
            chosen.axis === "x"
              ? junctionZ
              : junctionX;

          officer.position =
            chosen.axis === "x"
              ? junctionX
              : junctionZ;
        }
      }

      transformTraffic(officer);

      if (officer.car.red) {
        const flash =
          Math.sin(
            performance.now() * 0.02
          ) > 0;

        officer.car.red.emissiveIntensity =
          player.wanted > 0 && flash
            ? 4
            : 0.1;

        officer.car.blue.emissiveIntensity =
          player.wanted > 0 && !flash
            ? 4
            : 0.1;
      }
    }
  }

  function collisionCheck() {
    if (player.onFoot) return;

    for (const vehicle of [...traffic, ...police]) {
      if (vehicle.car.wrecked) continue;

      const dx = player.x - vehicle.x;
      const dz = player.z - vehicle.z;
      const distance = Math.hypot(dx, dz);

      if (distance > 2.7) continue;

      const nx =
        distance > 0.01
          ? dx / distance
          : 1;

      const nz =
        distance > 0.01
          ? dz / distance
          : 0;

      player.x += nx * (2.7 - distance);
      player.z += nz * (2.7 - distance);

      vehicle.x -= nx * 0.5;
      vehicle.z -= nz * 0.5;

      vehicle.car.group.position.x = vehicle.x;
      vehicle.car.group.position.z = vehicle.z;

      playerCar.group.position.x = player.x;
      playerCar.group.position.z = player.z;

      const hitX = (player.x + vehicle.x) / 2;
      const hitZ = (player.z + vehicle.z) / 2;

      damageCar(
        playerCar,
        Math.min(
          38,
          7 + player.speed * 0.8
        ),
        "front",
        hitX,
        hitZ
      );

      damageCar(
        vehicle.car,
        Math.min(
          26,
          5 + player.speed * 0.35
        ),
        "side",
        hitX,
        hitZ
      );

      if (police.includes(vehicle)) {
        issueCrime(
          "ASSAULT ON POLICE",
          1,
          "police-assault",
          8
        );
      }
    }
  }

  function updateLaws(dt) {
    signalTime += dt;

    lawCooldown = Math.max(
      0,
      lawCooldown - dt
    );

    if (
      player.wanted > 0 &&
      performance.now() / 1000 -
        policeIntel.seenAt > 12
    ) {
      player.wanted = Math.max(
        0,
        player.wanted - dt * 0.16
      );
    }

    if (
      player.onFoot ||
      playerCar.wrecked
    ) {
      return;
    }

    const ix = Math.round(player.x / cell);
    const iz = Math.round(player.z / cell);

    const nearIntersection =
      Math.abs(player.x - ix * cell) < 6 &&
      Math.abs(player.z - iz * cell) < 6;

    const key = `${ix}:${iz}`;

    if (
      nearIntersection &&
      key !== lastIntersectionKey
    ) {
      lastIntersectionKey = key;

      const axis =
        Math.abs(player.vx) >
        Math.abs(player.vz)
          ? "x"
          : "z";

      if (
        !green(axis) &&
        player.speed > 3 &&
        lawCooldown <= 0
      ) {
        issueCrime(
          "RAN A RED LIGHT",
          0.5,
          "redlight",
          8
        );
      }
    }

    if (!nearIntersection) {
      lastIntersectionKey = "";
    }

    if (
      player.speed > 18 &&
      lawCooldown <= 0 &&
      police.some(
        officer =>
          Math.hypot(
            officer.x - player.x,
            officer.z - player.z
          ) < 90
      )
    ) {
      issueCrime(
        "SPEEDING",
        0.5,
        "speeding",
        10
      );
    }
  }

  function updateDebris(dt) {
    for (
      let i = debris.length - 1;
      i >= 0;
      i--
    ) {
      const item = debris[i];

      item.life -= dt;
      item.vy -= 9.8 * dt;

      item.mesh.position.x += item.vx * dt;
      item.mesh.position.y += item.vy * dt;
      item.mesh.position.z += item.vz * dt;

      if (item.spark) {
        item.mesh.scale.setScalar(
          Math.max(0.1, item.life * 2)
        );
      } else if (item.spin) {
        item.mesh.rotation.x += item.spin * dt;
        item.mesh.rotation.z +=
          item.spin * 0.6 * dt;
      }

      if (item.mesh.position.y < 0.1) {
        item.mesh.position.y = 0.1;
        item.vy = Math.abs(item.vy) * 0.25;
        item.vx *= 0.6;
        item.vz *= 0.6;
        item.spin = (item.spin || 0) * 0.5;
      }

      if (item.life <= 0) {
        scene.remove(item.mesh);
        debris.splice(i, 1);
      }
    }
  }

  function update(dt) {
    updateLaws(dt);
    updatePlayer(dt);
    updateTraffic(dt);
    updatePeople(dt);
    updateFleeingDrivers(dt);
    updatePolice(dt);
    collisionCheck();
    updateDebris(dt);
    updateCarEffects(dt);

    for (const mixer of modelMixers) {
      mixer.update(dt);
    }
  }

  function setDialog(
    title,
    text,
    items
  ) {
    state = "dialog";
    clearControls();

    $("dialogTitle").textContent = title;
    $("dialogText").textContent = text;
    $("dialogEyebrow").textContent = "INTERACTION";

    const host = $("dialogItems");
    host.replaceChildren();

    for (const item of items) {
      const button =
        document.createElement("button");

      button.className =
        "action" +
        (item.secondary
          ? " secondary"
          : "");

      button.type = "button";
      button.textContent = item.label;
      button.onclick = item.run;

      host.appendChild(button);
    }

    $("dialog").hidden = false;
  }

  function closeDialog() {
    $("dialog").hidden = true;
    activeDialog = null;
    state = "playing";
    lastTime = performance.now();
  }

  function buy(cost, callback) {
    if (cash < cost) {
      showToast("NOT ENOUGH CASH");
      return false;
    }

    cash -= cost;
    callback();

    saveMoney();
    updateHud();

    return true;
  }

  function interact() {
    if (!player.onFoot) {
      showToast("EXIT YOUR CAR FIRST");
      return;
    }

    const shop = shops.find(
      store =>
        Math.hypot(
          player.footX - store.entryX,
          player.footZ - store.entryZ
        ) < 10
    );

    if (shop) {
      if (shop.type === "market") {
        setDialog(
          shop.name,
          "You are inside the supermarket.",
          [
            {
              label: "BUY FOOD — $8",
              run: () =>
                buy(8, () => {
                  inventory.snacks++;
                  showToast("FOOD ADDED");
                })
            },
            {
              label: "BUY REPAIR KIT — $75",
              secondary: true,
              run: () =>
                buy(75, () => {
                  inventory.repairKits++;
                  showToast("KIT ADDED");
                })
            },
            {
              label: "BUY BAIT — $10",
              secondary: true,
              run: () =>
                buy(10, () => {
                  inventory.bait += 3;
                  showToast("BAIT ADDED");
                })
            }
          ]
        );
      } else if (shop.type === "bank") {
        setDialog(
          shop.name,
          `Cash: $${cash} · Account: $${bank}`,
          [
            {
              label: "DEPOSIT $100",
              run: () => {
                if (cash < 100) {
                  showToast("NOT ENOUGH CASH");
                  return;
                }

                cash -= 100;
                bank += 100;

                saveMoney();
                updateHud();
                interactDialogRefresh();
              }
            },
            {
              label: "WITHDRAW $100",
              secondary: true,
              run: () => {
                if (bank < 100) {
                  showToast("NOT ENOUGH IN BANK");
                  return;
                }

                bank -= 100;
                cash += 100;

                saveMoney();
                updateHud();
                interactDialogRefresh();
              }
            }
          ]
        );
      } else if (shop.type === "gas") {
        setDialog(
          shop.name,
          "Fuel, supplies, and roadside service.",
          [
            {
              label: "BUY REPAIR KIT — $75",
              run: () =>
                buy(75, () => {
                  inventory.repairKits++;
                  showToast("KIT ADDED");
                })
            },
            {
              label: "SERVICE CAR — $100",
              secondary: true,
              run: () =>
                buy(100, () => {
                  restoreCar(playerCar);
                  showToast("CAR SERVICED");
                })
            }
          ]
        );
      } else if (shop.type === "auto") {
        setDialog(
          shop.name,
          `Repair kits: ${inventory.repairKits}`,
          [
            {
              label: "USE REPAIR KIT",
              run: () => {
                if (!inventory.repairKits) {
                  showToast("NO REPAIR KITS");
                  return;
                }

                inventory.repairKits--;

                const car = playerCar;

                car.health = Math.min(
                  100,
                  car.health + 50
                );

                car.disabled =
                  car.health <= 5;

                if (car.health > 0) {
                  car.wrecked = false;
                }

                car.pull *= 0.5;
                repairGeometry(car, 0.5);

                const wear =
                  1 - car.health / 100;

                car.bodyMat.color
                  .set(car.baseColor)
                  .lerp(
                    darkPaint,
                    wear * 0.5
                  );

                car.bodyMat.roughness =
                  0.27 +
                  wear * 0.6;

                car.bodyMat.clearcoat =
                  1 - wear;

                if (car.health >= 48) {
                  car.smokeOn = false;

                  car.smoke.forEach(
                    puff => puff.visible = false
                  );
                }

                showToast("CAR REPAIRED");
              }
            },
            {
              label: "BUY KIT — $75",
              secondary: true,
              run: () =>
                buy(
                  75,
                  () => inventory.repairKits++
                )
            }
          ]
        );
      } else if (shop.type === "food") {
        setDialog(
          shop.name,
          "Order at the counter.",
          [
            {
              label: "BUY MEAL — $12",
              run: () =>
                buy(12, () => {
                  inventory.snacks++;
                  showToast("MEAL ADDED");
                })
            },
            {
              label: "BUY DRINK — $4",
              secondary: true,
              run: () =>
                buy(4, () => {
                  inventory.snacks++;
                  showToast("DRINK ADDED");
                })
            }
          ]
        );
      } else if (shop.type === "dealer") {
        setDialog(
          shop.name,
          "Choose a vehicle to purchase.",
          [
            {
              label: "COMPACT CAR — $1,200",
              run: () =>
                buy(
                  1200,
                  () => buyCar(0x3ca9df)
                )
            },
            {
              label: "SPORTS CAR — $3,500",
              secondary: true,
              run: () =>
                buy(
                  3500,
                  () => buyCar(0xdf3b45)
                )
            },
            {
              label: "SUV — $2,400",
              secondary: true,
              run: () =>
                buy(
                  2400,
                  () => buyCar(0x4d8b52)
                )
            }
          ]
        );
      } else if (shop.type === "hospital") {
        setDialog(
          "CITY HOSPITAL",
          "Medical services are available here.",
          [
            {
              label: "HEAL / SERVICE — $75",
              run: () =>
                buy(75, () => {
                  restoreCar(playerCar);
                  showToast("TREATED");
                })
            }
          ]
        );
      }

      return;
    }

    if (
      Math.abs(player.footX - 552) < 28 &&
      Math.abs(player.footZ) < 11
    ) {
      setDialog(
        "FISHING DOCK",
        `Bait: ${inventory.bait} · Fish: ${inventory.fish}`,
        [
          {
            label: "CAST LINE",
            run: () => {
              if (!inventory.bait) {
                showToast("BUY BAIT FIRST");
                return;
              }

              inventory.bait--;

              if (Math.random() < 0.78) {
                inventory.fish++;
                showToast("YOU CAUGHT A FISH");
              } else {
                showToast("NO BITE");
              }
            }
          },
          {
            label: "SELL FISH — $20 EACH",
            secondary: true,
            run: () => {
              if (!inventory.fish) {
                showToast("NO FISH TO SELL");
                return;
              }

              cash += inventory.fish * 20;
              inventory.fish = 0;

              saveMoney();
              updateHud();
              showToast("FISH SOLD");
            }
          }
        ]
      );

      return;
    }

    showToast("NOTHING TO INTERACT WITH HERE");
  }

  function interactDialogRefresh() {
    closeDialog();

    setTimeout(() => {
      if (state === "playing") {
        interact();
      }
    }, 0);
  }

  function buyCar(color) {
    const old = playerCar;

    old.group.position.set(
      player.x,
      0,
      player.z
    );

    const newCar = makeCar(color);
    purchasedCars.push(newCar);

    playerCar = newCar;

    playerCar.group.position.set(
      player.x,
      0.27,
      player.z
    );

    playerCar.group.rotation.y = player.yaw;
    playerCar.health = 100;
    playerCar.disabled = false;
    playerCar.wrecked = false;

    showToast("NEW CAR PURCHASED");
  }

  function ejectTrafficDriver(vehicle) {
    if (vehicle.driver) {
      vehicle.driver.visible = false;
    }

    const model = makePerson(
      200 + Math.floor(Math.random() * 1000),
      "civilian"
    );

    const heading =
      vehicle.car.group.rotation.y;

    const x =
      vehicle.x +
      Math.cos(heading) * 2.4;

    const z =
      vehicle.z -
      Math.sin(heading) * 2.4;

    let awayX = x - player.footX;
    let awayZ = z - player.footZ;

    const length =
      Math.hypot(awayX, awayZ) || 1;

    awayX /= length;
    awayZ /= length;

    model.group.position.set(
      x,
      0.28,
      z
    );

    fleeingDrivers.push({
      model,
      x,
      z,
      targetX: x + awayX * 24,
      targetZ: z + awayZ * 24,
      speed: 4.5,
      life: 8
    });
  }

  function toggleExit() {
    if (state !== "playing") return;

    if (!player.onFoot) {
      if (player.speed > 4) {
        showToast("STOP BEFORE EXITING");
        return;
      }

      player.onFoot = true;
      player.footVx = 0;
      player.footVz = 0;

      const heading =
        playerCar.group.rotation.y;

      player.footHeading = heading;

      player.footX =
        playerCar.group.position.x +
        Math.cos(heading) * 2;

      player.footZ =
        playerCar.group.position.z -
        Math.sin(heading) * 2;

      player.x = player.footX;
      player.z = player.footZ;

      showToast(
        "WALK TO A CAR AND PRESS F TO ENTER"
      );

      return;
    }

    const ownDistance = Math.hypot(
      player.footX -
        playerCar.group.position.x,

      player.footZ -
        playerCar.group.position.z
    );

    if (ownDistance < 5) {
      player.onFoot = false;

      player.x =
        playerCar.group.position.x;

      player.z =
        playerCar.group.position.z;

      player.yaw =
        playerCar.group.rotation.y;

      player.vx = 0;
      player.vz = 0;
      player.speed = 0;
      player.footVx = 0;
      player.footVz = 0;

      return;
    }

    let nearest = null;
    let nearestDistance = 6;

    for (const vehicle of traffic) {
      if (vehicle.car.wrecked) continue;

      const distance = Math.hypot(
        player.footX - vehicle.x,
        player.footZ - vehicle.z
      );

      if (distance < nearestDistance) {
        nearest = vehicle;
        nearestDistance = distance;
      }
    }

    if (!nearest) {
      showToast("MOVE CLOSER TO AN NPC CAR");
      return;
    }

    const witnessed =
      people.some(
        person =>
          Math.hypot(
            person.x - nearest.x,
            person.z - nearest.z
          ) < 38
      ) ||
      traffic.some(
        vehicle =>
          vehicle !== nearest &&
          Math.hypot(
            vehicle.x - nearest.x,
            vehicle.z - nearest.z
          ) < 32
      ) ||
      police.some(
        officer =>
          !officer.parked &&
          Math.hypot(
            officer.x - nearest.x,
            officer.z - nearest.z
          ) < 70
      );

    ejectTrafficDriver(nearest);
    nearest.speed = 0;

    traffic.splice(
      traffic.indexOf(nearest),
      1
    );

    playerCar = nearest.car;

    playerCar.group.position.set(
      nearest.x,
      0.27,
      nearest.z
    );

    player.x = nearest.x;
    player.z = nearest.z;
    player.yaw = playerCar.group.rotation.y;
    player.vx = 0;
    player.vz = 0;
    player.speed = 0;
    player.onFoot = false;

    player.footX = player.x;
    player.footZ = player.z;
    player.footVx = 0;
    player.footVz = 0;

    showToast("CARJACKED — DRIVER FLED");

    issueCrime(
      "CARJACKING REPORTED",
      witnessed ? 1.5 : 1,
      "vehicle-theft",
      15
    );
  }

  function resetGame() {
    runId++;
    crimeCooldowns.clear();

    policeIntel.x = 0;
    policeIntel.z = 0;
    policeIntel.seenAt = -Infinity;

    for (const person of fleeingDrivers) {
      scene.remove(person.model.group);
    }

    fleeingDrivers.length = 0;

    playerCar = personalCar;

    traffic.splice(
      0,
      traffic.length,
      ...trafficTemplate
    );

    for (const car of purchasedCars) {
      scene.remove(car.group);
    }

    purchasedCars.length = 0;

    player.x = 0;
    player.z = 0;
    player.yaw = 0;
    player.vx = 0;
    player.vz = 0;
    player.speed = 0;
    player.wanted = 0;
    player.onFoot = false;

    player.footX = 0;
    player.footZ = 2;
    player.footHeading = 0;
    player.footVx = 0;
    player.footVz = 0;

    restoreCar(
      personalCar,
      0xd94149
    );

    personalCar.group.position.set(
      0,
      0.27,
      0
    );

    playerModel.group.visible = false;

    score = 0;
    dayTime = 0;
    weatherTime = 0;
    signalTime = 0;
    weather = "clear";
    lawCooldown = 0;
    arrestProgress = 0;
    lastIntersectionKey = "";

    traffic.forEach(
      (vehicle, index) => {
        vehicle.position = rand(-470, 470);
        vehicle.speed = rand(5, 9);
        vehicle.aiState = "cruise";
        vehicle.x = 0;
        vehicle.z = 0;

        restoreCar(
          vehicle.car,
          trafficColors[
            index % trafficColors.length
          ]
        );

        transformTraffic(vehicle);
      }
    );

    for (const officer of police) {
      officer.state = "patrol";
      officer.arrestTimer = 0;
      officer.position = rand(-400, 400);
      officer.heading = 0;

      if (officer.officer) {
        officer.officer.group.visible = false;
      }

      restoreCar(
        officer.car,
        0xf0f2f5
      );

      transformTraffic(officer);
    }

    for (
      let i = debris.length - 1;
      i >= 0;
      i--
    ) {
      scene.remove(debris[i].mesh);
    }

    debris.length = 0;

    state = "menu";
    clearControls();

    $("overlay").hidden = false;
    $("dialog").hidden = true;
    $("mapOverlay").hidden = true;

    updateHud();
  }

  function restartGame() {
    resetGame();

    state = "playing";
    $("overlay").hidden = true;
    lastTime = performance.now();

    showToast("WELCOME TO THE CITY");
  }

  function respawnHospital() {
    const fee = 75;

    cash = Math.max(0, cash - fee);
    restoreCar(playerCar);

    player.x = hospital.x;
    player.z = hospital.z + 28;
    player.yaw = 0;
    player.vx = 0;
    player.vz = 0;
    player.speed = 0;
    player.onFoot = false;
    player.wanted = 0;

    player.footX = player.x;
    player.footZ = player.z;
    player.footVx = 0;
    player.footVz = 0;

    playerCar.group.position.set(
      player.x,
      0.27,
      player.z
    );

    state = "playing";
    $("overlay").hidden = true;

    saveMoney();

    showToast(`HOSPITAL FEE: $${fee}`);
    updateHud();
  }

  function showOverlay(
    title,
    text,
    button
  ) {
    $("overlayTitle").textContent = title;
    $("overlayText").textContent = text;
    $("mainButton").textContent = button;
    $("overlay").hidden = false;
  }

  function startOrResume() {
    if (
      state === "dead" ||
      state === "arrested"
    ) {
      respawnHospital();
      return;
    }

    if (state === "paused") {
      state = "playing";
      $("overlay").hidden = true;
      lastTime = performance.now();
      return;
    }

    resetGame();

    state = "playing";
    $("overlay").hidden = true;

    showToast("WELCOME TO THE CITY");
  }

  function updateHud() {
    const health = $("carHealth");

    health.textContent =
      `${Math.ceil(playerCar.health)}%`;

    health.style.color =
      playerCar.health > 60
        ? "#5affac"
        : playerCar.health > 25
          ? "#ffd35a"
          : "#ff6878";

    $("cash").textContent =
      `$${cash.toLocaleString()}`;

    $("score").textContent =
      Math.floor(score).toLocaleString();

    $("speed").textContent =
      String(
        Math.round(
          player.speed * 3.6
        )
      );

    const forward =
      player.vx * -Math.sin(player.yaw) +
      player.vz * -Math.cos(player.yaw);

    $("gear").textContent =
      player.onFoot
        ? "W"
        : forward < -0.3
          ? "R"
          : player.speed < 1
            ? "N"
            : "D";

    const fullStars =
      Math.floor(player.wanted);

    const halfStar =
      player.wanted - fullStars >= 0.25;

    const emptyStars =
      5 -
      fullStars -
      (halfStar ? 1 : 0);

    $("wanted").innerHTML =
      "★".repeat(fullStars) +
      (
        halfStar
          ? '<span class="halfStar">★</span>'
          : ""
      ) +
      `<span class="emptyStars">${
        "★".repeat(emptyStars)
      }</span>`;

    const minutes = Math.floor(
      (dayTime % 210) / 210 * 1440
    );

    const hours = String(
      Math.floor(minutes / 60)
    ).padStart(2, "0");

    const mins = String(
      minutes % 60
    ).padStart(2, "0");

    $("worldStatus").textContent =
      `${hours}:${mins} · ${
        weather.toUpperCase()
      }`;
  }

  function drawMap(canvas) {
    const context = canvas.getContext("2d");
    const size = canvas.width;
    const pad = 20;
    const scale = (size - pad * 2) / 1400;

    const mx = x =>
      pad + (x + 700) * scale;

    const mz = z =>
      pad + (z + 700) * scale;

    context.clearRect(
      0,
      0,
      size,
      size
    );

    context.fillStyle = "#173426";
    context.fillRect(
      0,
      0,
      size,
      size
    );

    context.fillStyle = "#303740";

    context.fillRect(
      mx(-560),
      mz(-560),
      1120 * scale,
      1120 * scale
    );

    context.fillStyle = "#287e9d";

    context.fillRect(
      mx(565),
      mz(-700),
      50 * scale,
      1400 * scale
    );

    roads.forEach(road => {
      context.fillStyle = "#424a51";

      context.fillRect(
        mx(road - 9),
        mz(-700),
        18 * scale,
        1400 * scale
      );

      context.fillRect(
        mx(-700),
        mz(road - 9),
        1400 * scale,
        18 * scale
      );
    });

    blockData.forEach(block => {
      context.fillStyle =
        block.isPark
          ? "#4f7d44"
          : block.home
            ? "#55764c"
            : block.isStore
              ? "#704e78"
              : block.isStation
                ? "#315084"
                : "#5b626a";

      context.fillRect(
        mx(block.x - 28),
        mz(block.z - 28),
        56 * scale,
        56 * scale
      );
    });

    function dot(x, z, radius, color) {
      context.fillStyle = color;
      context.beginPath();

      context.arc(
        mx(x),
        mz(z),
        radius,
        0,
        Math.PI * 2
      );

      context.fill();
    }

    traffic.forEach(vehicle =>
      dot(
        vehicle.x,
        vehicle.z,
        Math.max(3, size / 260),
        "#ff9b54"
      )
    );

    police.forEach(officer =>
      dot(
        officer.x,
        officer.z,
        Math.max(4, size / 230),
        "#438cff"
      )
    );

    people.forEach(person =>
      dot(
        person.x,
        person.z,
        Math.max(2, size / 360),
        "#f2ce70"
      )
    );

    dot(
      player.onFoot
        ? player.footX
        : player.x,

      player.onFoot
        ? player.footZ
        : player.z,

      Math.max(5, size / 150),
      "#fff"
    );

    context.fillStyle = "#fff";

    context.font =
      `900 ${
        Math.max(14, size / 36)
      }px system-ui`;

    context.fillText(
      "RIVER",
      mx(590),
      mz(-420)
    );
  }

  const rainCount = mobile ? 250 : 650;
  const rainPositions =
    new Float32Array(rainCount * 3);

  for (let i = 0; i < rainCount; i++) {
    rainPositions[i * 3] = rand(-45, 45);
    rainPositions[i * 3 + 1] = rand(0, 45);
    rainPositions[i * 3 + 2] = rand(-45, 45);
  }

  const rainGeometry =
    new THREE.BufferGeometry();

  rainGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(
      rainPositions,
      3
    )
  );

  const rain = new THREE.Points(
    rainGeometry,

    new THREE.PointsMaterial({
      color: 0xc6e4f5,
      size: 0.13,
      transparent: true,
      opacity: 0.75
    })
  );

  rain.visible = false;
  scene.add(rain);

  let lightning = 0;

  function updateWeather(dt) {
    dayTime += dt;
    weatherTime += dt;

    if (weatherTime > 48) {
      weatherTime = 0;

      const options = [
        "clear",
        "rain",
        "fog",
        "storm"
      ];

      weather =
        options[
          Math.floor(
            Math.random() * options.length
          )
        ];

      showToast(
        `WEATHER: ${weather.toUpperCase()}`
      );
    }

    const daylight =
      (
        Math.sin(
          dayTime /
            210 *
            Math.PI *
            2 -
            Math.PI /
            2
        ) +
        1
      ) /
      2;

    sun.intensity =
      0.22 +
      daylight * 2.3;

    hemi.intensity =
      0.85 +
      daylight * 1.1;

    hemi.color.set(0xdcecff);
    hemi.groundColor.set(0x65716a);

    for (const material of facadeMaterials) {
      material.emissiveIntensity =
        0.12 +
        (1 - daylight) * 1.15;
    }

    architecture.light.emissiveIntensity =
      0.35 +
      (1 - daylight) * 1.8;

    sun.position.set(
      player.x - 35,
      12 + daylight * 70,
      player.z + 25
    );

    scene.background =
      new THREE.Color(0x101b31).lerp(
        new THREE.Color(0x91cce5),
        daylight
      );

    if (weather === "fog") {
      scene.fog.color.set(0x9ca9ad);
      scene.fog.near = 40;
      scene.fog.far = 240;
    } else if (
      weather === "rain" ||
      weather === "storm"
    ) {
      scene.fog.color.set(0x536c7e);
      scene.fog.near = 75;
      scene.fog.far = 430;
    } else {
      scene.fog.color.copy(scene.background);
      scene.fog.near = 160;
      scene.fog.far = 760;
    }

    rain.visible =
      weather === "rain" ||
      weather === "storm";

    if (rain.visible) {
      rain.position.set(
        player.x,
        0,
        player.z
      );

      for (let i = 0; i < rainCount; i++) {
        const index = i * 3;

        rainPositions[index + 1] -=
          dt *
          (
            weather === "storm"
              ? 38
              : 28
          );

        rainPositions[index] -=
          dt *
          (
            weather === "storm"
              ? 8
              : 4
          );

        if (rainPositions[index + 1] < 0) {
          rainPositions[index] = rand(-45, 45);
          rainPositions[index + 1] = rand(20, 45);
          rainPositions[index + 2] = rand(-45, 45);
        }
      }

      rainGeometry.attributes.position.needsUpdate =
        true;
    }

    if (
      weather === "storm" &&
      Math.random() < dt * 0.12
    ) {
      lightning = 0.18;
      sun.intensity = 5;
    }

    lightning = Math.max(
      0,
      lightning - dt
    );

    const headLevel =
      daylight < 0.35
        ? 5
        : 1;

    if (!playerCar.brokenLights.left) {
      playerCar.headL.material.emissiveIntensity =
        headLevel;
    }

    if (!playerCar.brokenLights.right) {
      playerCar.headR.material.emissiveIntensity =
        headLevel;
    }
  }

  const focus = new THREE.Vector3();
  const target = new THREE.Vector3();
  const offset = new THREE.Vector3();

  function updateCamera(dt) {
    const x = player.onFoot
      ? player.footX
      : player.x;

    const z = player.onFoot
      ? player.footZ
      : player.z;

    focus.lerp(
      new THREE.Vector3(
        x,
        player.onFoot ? 1.3 : 1.2,
        z
      ),

      1 - Math.exp(-12 * dt)
    );

    const horizontal =
      Math.cos(cameraPitch) *
      cameraDistance;

    offset.set(
      Math.sin(cameraYaw) * horizontal,
      Math.sin(cameraPitch) * cameraDistance,
      Math.cos(cameraYaw) * horizontal
    );

    target.copy(focus).add(offset);

    camera.position.lerp(
      target,
      1 - Math.exp(-10 * dt)
    );

    if (cameraShake > 0) {
      camera.position.x +=
        (Math.random() - 0.5) *
        cameraShake;

      camera.position.y +=
        (Math.random() - 0.5) *
        cameraShake;

      camera.position.z +=
        (Math.random() - 0.5) *
        cameraShake;

      cameraShake = Math.max(
        0,
        cameraShake - dt * 1.8
      );
    }

    camera.lookAt(focus);
  }

  function showToast(text) {
    $("toast").textContent = text;
    $("toast").classList.add("show");
    toastTime = 1.5;
  }

  function saveMoney() {
    try {
      localStorage.setItem(
        "cityCash",
        String(cash)
      );

      localStorage.setItem(
        "cityBank",
        String(bank)
      );
    } catch {}
  }

  function clearControls() {
    keys.clear();
    held.clear();

    document
      .querySelectorAll(".pad")
      .forEach(button =>
        button.classList.remove("active")
      );
  }

  function toggleMap() {
    if (state === "map") {
      state = "playing";
      $("mapOverlay").hidden = true;
      $("mapButton").textContent = "MAP";
      lastTime = performance.now();
    } else if (state === "playing") {
      state = "map";
      $("mapOverlay").hidden = false;
      $("mapButton").textContent = "×";
      drawMap($("bigMap"));
    }
  }

  function togglePause() {
    if (state === "playing") {
      state = "paused";
      clearControls();

      showOverlay(
        "PAUSED",
        "Game paused.",
        "RESUME"
      );
    } else if (state === "paused") {
      state = "playing";
      $("overlay").hidden = true;
      lastTime = performance.now();
    }
  }

  $("mainButton").onclick = startOrResume;
  $("resetButton").onclick = restartGame;
  $("pauseButton").onclick = togglePause;
  $("exitButton").onclick = toggleExit;
  $("mapButton").onclick = toggleMap;
  $("dialogClose").onclick = closeDialog;

  $("cameraButton").onclick = () => {
    cameraYaw =
      player.onFoot
        ? player.footHeading
        : player.yaw;

    cameraPitch = 0.38;
    cameraDistance = 9;
  };

  $("inventoryButton").onclick = () => {
    if (state !== "playing") return;

    setDialog(
      "INVENTORY",
      `Cash $${cash} · Bank $${bank}`,
      [
        {
          label:
            `SNACKS ${inventory.snacks} · ` +
            `BAIT ${inventory.bait} · ` +
            `FISH ${inventory.fish} · ` +
            `KITS ${inventory.repairKits}`,
          run: () => {}
        },
        {
          label: "SELL ALL FISH — $20 EACH",
          secondary: true,
          run: () => {
            if (!inventory.fish) {
              showToast("NO FISH");
              return;
            }

            cash += inventory.fish * 20;
            inventory.fish = 0;

            saveMoney();
            updateHud();
            showToast("FISH SOLD");
          }
        }
      ]
    );
  };

  document
    .querySelectorAll("[data-control]")
    .forEach(button => {
      const action = button.dataset.control;

      button.addEventListener(
        "pointerdown",
        event => {
          event.preventDefault();
          event.stopPropagation();

          if (state !== "playing") {
            return;
          }

          held.set(
            event.pointerId,
            action
          );

          button.classList.add("active");

          try {
            button.setPointerCapture(
              event.pointerId
            );
          } catch {}
        }
      );

      const release = event => {
        held.delete(event.pointerId);

        button.classList.toggle(
          "active",
          [...held.values()].includes(action)
        );
      };

      button.addEventListener(
        "pointerup",
        release
      );

      button.addEventListener(
        "pointercancel",
        release
      );

      button.addEventListener(
        "lostpointercapture",
        release
      );
    });

  window.addEventListener(
    "pointerup",
    event => held.delete(event.pointerId),
    true
  );

  window.addEventListener(
    "pointercancel",
    event => held.delete(event.pointerId),
    true
  );

  window.addEventListener(
    "blur",
    clearControls
  );

  window.addEventListener(
    "keydown",
    event => {
      if (
        [
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          "Space"
        ].includes(event.code)
      ) {
        event.preventDefault();
      }

      if (event.code === "KeyF") {
        toggleExit();
        return;
      }

      if (event.code === "KeyE") {
        interact();
        return;
      }

      if (event.code === "KeyI") {
        if (state === "playing") {
          $("inventoryButton").click();
        }
        return;
      }

      if (event.code === "KeyM") {
        toggleMap();
        return;
      }

      if (event.code === "KeyC") {
        $("cameraButton").click();
        return;
      }

      if (
        event.code === "KeyP" ||
        event.code === "Escape"
      ) {
        if (state === "dialog") {
          closeDialog();
        } else if (state === "map") {
          toggleMap();
        } else {
          togglePause();
        }

        return;
      }

      if (event.code === "KeyR") {
        restartGame();
        return;
      }

      if (state === "playing") {
        keys.add(event.code);
      }
    }
  );

  window.addEventListener(
    "keyup",
    event => keys.delete(event.code)
  );

  const cameraPointers = new Map();
  let pinch = 0;

  function pinchDistance() {
    const points =
      [...cameraPointers.values()];

    return points.length < 2
      ? 0
      : Math.hypot(
          points[0].x - points[1].x,
          points[0].y - points[1].y
        );
  }

  renderer.domElement.addEventListener(
    "pointerdown",
    event => {
      if (state !== "playing") {
        return;
      }

      cameraPointers.set(
        event.pointerId,
        {
          x: event.clientX,
          y: event.clientY
        }
      );

      try {
        renderer.domElement.setPointerCapture(
          event.pointerId
        );
      } catch {}

      pinch = pinchDistance();
    }
  );

  renderer.domElement.addEventListener(
    "pointermove",
    event => {
      if (!cameraPointers.has(event.pointerId)) {
        return;
      }

      const previous =
        cameraPointers.get(event.pointerId);

      const current = {
        x: event.clientX,
        y: event.clientY
      };

      cameraPointers.set(
        event.pointerId,
        current
      );

      if (cameraPointers.size === 1) {
        cameraYaw -=
          (
            current.x - previous.x
          ) * 0.006;

        cameraPitch = clamp(
          cameraPitch -
            (
              current.y - previous.y
            ) * 0.004,
          0.12,
          1.05
        );
      } else {
        const distance =
          pinchDistance();

        if (pinch && distance) {
          cameraDistance = clamp(
            cameraDistance *
              pinch /
              distance,
            4,
            16
          );
        }

        pinch = distance;
      }
    }
  );

  function releaseCamera(event) {
    cameraPointers.delete(event.pointerId);
    pinch = pinchDistance();
  }

  renderer.domElement.addEventListener(
    "pointerup",
    releaseCamera
  );

  renderer.domElement.addEventListener(
    "pointercancel",
    releaseCamera
  );

  renderer.domElement.addEventListener(
    "lostpointercapture",
    releaseCamera
  );

  renderer.domElement.addEventListener(
    "wheel",
    event => {
      if (state !== "playing") {
        return;
      }

      event.preventDefault();

      cameraDistance = clamp(
        cameraDistance +
          event.deltaY * 0.008,
        4,
        16
      );
    },
    { passive: false }
  );

  document.addEventListener(
    "selectstart",
    event => event.preventDefault()
  );

  document.addEventListener(
    "dragstart",
    event => event.preventDefault()
  );

  document.addEventListener(
    "contextmenu",
    event => event.preventDefault()
  );

  function resize() {
    camera.aspect =
      innerWidth / innerHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(
      innerWidth,
      innerHeight
    );

    renderer.setPixelRatio(
      Math.min(
        devicePixelRatio || 1,
        mobile ? 1.4 : 1.8
      )
    );

    if (!$("mapOverlay").hidden) {
      drawMap($("bigMap"));
    }
  }

  window.addEventListener(
    "resize",
    resize
  );

  let hudClock = 0;

  function animate(now) {
    requestAnimationFrame(animate);

    const dt = Math.min(
      (now - lastTime) / 1000,
      0.07
    );

    lastTime = now;

    if (state === "playing") {
      update(dt);
      updateWeather(dt);
    } else {
      updateWeather(dt * 0.2);
    }

    updateCamera(
      Math.max(dt, 0.001)
    );

    const phase = Math.floor(
      (signalTime % 16) / 4
    );

    for (const signal of signals) {
      const greenLight =
        signal.axis === "x"
          ? phase === 0
          : phase === 2;

      const amberLight =
        signal.axis === "x"
          ? phase === 1
          : phase === 3;

      signal.green.visible = greenLight;
      signal.amber.visible = amberLight;
      signal.red.visible =
        !greenLight &&
        !amberLight;
    }

    if (toastTime > 0) {
      toastTime -= dt;

      if (toastTime <= 0) {
        $("toast").classList.remove("show");
      }
    }

    hudClock += dt;

    if (hudClock > 0.15) {
      updateHud();
      drawMap($("miniMap"));

      if (!$("mapOverlay").hidden) {
        drawMap($("bigMap"));
      }

      hudClock = 0;
    }

    renderer.render(
      scene,
      camera
    );
  }

  resize();
  updateHud();
  drawMap($("miniMap"));

  loading.style.opacity = "0";

  setTimeout(() => {
    loading.hidden = true;
  }, 250);

  requestAnimationFrame(animate);

  return {
    THREE,
    scene,
    camera,
    renderer,
    inventory,

    getSnapshot: () => ({
      state,
      cash,
      bank,
      score,
      wanted: player.wanted,
      onFoot: player.onFoot,
      x: player.onFoot ? player.footX : player.x,
      z: player.onFoot ? player.footZ : player.z,
      weather,
      dayTime,
      inventory: { ...inventory },
      vehicle: {
        health: playerCar.health,
        disabled: playerCar.disabled,
        wrecked: playerCar.wrecked
      }
    }),

    getPlayer: () => ({ ...player }),
    getVehicle: () => playerCar,

    adjustCash: amount => {
      cash = Math.max(0, cash + amount);
      saveMoney();
      updateHud();
      return cash;
    },

    addInventory: (item, amount = 1) => {
      if (
        !Object.prototype.hasOwnProperty.call(
          inventory,
          item
        )
      ) {
        return false;
      }

      inventory[item] = Math.max(
        0,
        (inventory[item] || 0) + amount
      );

      updateHud();
      return inventory[item];
    },

    showToast,
    showOverlay,
    setDialog,
    closeDialog,
    interact,
    toggleExit,
    toggleMap,
    togglePause,
    restartGame,
    saveMoney
  };
}
