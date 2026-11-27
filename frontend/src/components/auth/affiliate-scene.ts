import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function createAffiliateScene(
  host: HTMLElement,
  onContextLost: (event: Event) => void,
) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.16;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.addEventListener('webglcontextlost', onContextLost);
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera();
  const target = new THREE.Vector3(0, 1.4, 0);
  const root = new THREE.Group();
  scene.add(root, new THREE.HemisphereLight('#fffaf5', '#9D8266', 1.65));
  const key = new THREE.DirectionalLight('#fff7ed', 2.8);
  key.position.set(-4, 8, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, far: 22 });
  key.shadow.normalBias = 0.025;
  key.shadow.bias = -0.00015;
  key.shadow.radius = 3;
  scene.add(key);
  const fill = new THREE.DirectionalLight('#fff6df', 0.8);
  fill.position.set(5, 4, -5);
  scene.add(fill);

  const finish = (color: string) => new THREE.MeshStandardMaterial({ color, roughness: 0.74 });
  const gold = finish('#C59B58');
  const brass = finish('#B88E4F');
  const cream = finish('#FBF5EB');
  const sand = finish('#EEDFC6');
  const white = finish('#FFFFFF');
  const dark = finish('#443324');
  const skin = finish('#CF9770');
  const lightSkin = finish('#E7B694');
  const screen = finish('#E5BF81');
  const textures: THREE.Texture[] = [];
  const pointer = new THREE.Vector2();
  let paused = false;
  let onscreen = true;
  let disposed = false;
  let time = 0;
  let previous = 0;
  let frame = 0;

  function mesh(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number) {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(x, y, z);
    object.castShadow = material instanceof THREE.MeshStandardMaterial;
    object.receiveShadow = object.castShadow;
    parent.add(object);
    return object;
  }

  function box(parent: THREE.Object3D, size: [number, number, number], material: THREE.Material, x: number, y: number, z: number) {
    return mesh(parent, new RoundedBoxGeometry(...size, 2, Math.min(...size) * 0.18), material, x, y, z);
  }

  function beam(start: [number, number, number], end: [number, number, number], thickness: number, material: THREE.Material) {
    const a = new THREE.Vector3(...start);
    const b = new THREE.Vector3(...end);
    const center = a.clone().lerp(b, 0.5);
    const piece = box(root, [thickness, a.distanceTo(b), thickness], material, center.x, center.y, center.z);
    piece.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
  }

  function textTexture(text: string, badge: boolean) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 160;
    const ctx = canvas.getContext('2d')!;
    if (badge) {
      ctx.beginPath();
      ctx.roundRect(5, 13, 502, 134, 44);
      ctx.fillStyle = '#FFFCF5';
      ctx.fill();
      ctx.strokeStyle = '#D3AF75';
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    ctx.fillStyle = '#523920';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = badge ? '700 58px sans-serif' : '700 100px Georgia';
    ctx.fillText(text, 256, 82, 455);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    textures.push(map);
    return map;
  }

  function label(text: string, width: number, height: number, x: number, y: number, z: number) {
    const map = textTexture(text, true);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, toneMapped: false }));
    sprite.scale.set(width, height, 1);
    sprite.position.set(x, y, z);
    root.add(sprite);
    return sprite;
  }

  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 128;
  const shadowContext = shadowCanvas.getContext('2d')!;
  const gradient = shadowContext.createRadialGradient(64, 64, 8, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(82, 57, 32, .29)');
  gradient.addColorStop(1, 'rgba(82, 57, 32, 0)');
  shadowContext.fillStyle = gradient;
  shadowContext.fillRect(0, 0, 128, 128);
  const shadowMap = new THREE.CanvasTexture(shadowCanvas);
  textures.push(shadowMap);
  const shadowMaterial = new THREE.MeshBasicMaterial({ map: shadowMap, transparent: true, depthWrite: false });
  const shadow = mesh(root, new THREE.PlaneGeometry(9.4, 7.4), shadowMaterial, 0, -0.29, 0.1);
  shadow.rotation.x = -Math.PI / 2;
  box(root, [7.9, 0.22, 5.3], brass, 0, -0.17, 0);
  box(root, [7.9, 0.14, 5.3], cream, 0, -0.04, 0);
  box(root, [5.95, 0.08, 3.05], sand, 0, 0.035, -0.94);
  for (let x = -2.46; x < 2.9; x += 0.82) {
    box(root, [0.012, 0.005, 3], cream, x, 0.078, -0.94);
  }

  // Each gable rests on two posts while the sides stay open.
  for (const z of [-2.48, 0.26]) {
    for (const x of [-2.9, 2.9]) {
      beam([x, 0.05, z], [x, 2.65, z], 0.14, gold);
      beam([x, 2.65, z], [0, 3.79, z], 0.105, brass);
    }
    beam([-2.9, 2.65, z], [2.9, 2.65, z], 0.11, gold);
  }
  for (const [x, y] of [[-2.9, 2.65], [0, 3.79], [2.9, 2.65]]) {
    beam([x, y, -2.48], [x, y, 0.26], 0.12, gold);
  }
  for (const x of [-0.44, 0.44]) {
    beam([x, 3.61, 0.26], [x, 3.18, 0.26], 0.025, brass);
  }
  box(root, [1.45, 0.30, 0.1], cream, 0, 3.04, 0.26);
  const signLettering = new THREE.MeshBasicMaterial({
    map: textTexture('ScanMS', false), transparent: true, depthWrite: false, toneMapped: false,
  });
  mesh(root, new THREE.PlaneGeometry(1.24, 0.28), signLettering, 0, 3.04, 0.315);

  for (const x of [-1.78, 1.78]) {
    beam([x, 3.04, -2.48], [x, 2.47, -2.48], 0.023, brass);
    const pendant = mesh(root, new THREE.ConeGeometry(0.18, 0.17, 24), cream, x, 2.45, -2.48);
    pendant.castShadow = false;
    mesh(root, new THREE.SphereGeometry(0.071, 16, 12), white, x, 2.371, -2.48);
  }

  const shelfX = 0.25;
  const shelfZ = -0.25;
  for (const x of [shelfX - 0.91, shelfX + 0.91]) {
    box(root, [0.09, 1.28, 0.46], brass, x, 0.7, shelfZ);
  }
  const shelfHeights = [0.24, 0.68, 1.12];
  const photos = [
    'vitamin-c-15-serum.jpg', 'spf50-oil-control.jpg', 'amino-cleanser-ph55.jpg',
    'linen-dress.jpg', 'granola-500g.jpg', 'chamomile-tea-50g.webp',
    'wireless-earbuds.jpg', 'thermos-500ml.jpg', 'hydro-boost-50g.jpg',
  ];
  const loader = new THREE.TextureLoader();
  shelfHeights.forEach((height, row) => {
    box(root, [1.91, 0.055, 0.47], white, shelfX, height, shelfZ);
    for (let column = 0; column < 3; column++) {
      const x = shelfX + (column - 1) * 0.53;
      box(root, [0.34, 0.34, 0.18], cream, x, height + 0.195, shelfZ);
      const face = new THREE.MeshBasicMaterial({ color: '#EEDFC6' });
      mesh(root, new THREE.PlaneGeometry(0.29, 0.29), face, x, height + 0.195, shelfZ + 0.094);
      const map = loader.load('/assets/products/real/' + photos[row * 3 + column], loaded => {
        if (disposed) return;
        const { width, height: imageHeight } = loaded.image;
        const ratio = width / imageHeight;
        loaded.repeat.set(Math.min(1, 1 / ratio), Math.min(1, ratio));
        loaded.offset.set((1 - loaded.repeat.x) / 2, (1 - loaded.repeat.y) / 2);
        face.color.set('#FFFFFF');
        face.map = loaded;
        face.needsUpdate = true;
        if (paused || !onscreen) draw();
      });
      map.colorSpace = THREE.SRGBColorSpace;
      textures.push(map);
    }
  });

  function person(x: number, z: number, outfit: THREE.Material, complexion: THREE.Material, angle = 0) {
    const figure = new THREE.Group();
    figure.position.set(x, 0.08, z);
    figure.rotation.y = angle;
    root.add(figure);
    const head = new THREE.Group();
    head.position.set(0, 0.88, 0);
    figure.add(head);
    mesh(head, new THREE.SphereGeometry(0.147, 24, 16), complexion, 0, 0, 0).scale.set(0.93, 1.13, 1);
    mesh(head, new THREE.SphereGeometry(0.153, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.59), dark, 0, 0.026, -0.016);
    for (const side of [-1, 1]) {
      mesh(head, new THREE.SphereGeometry(0.022, 10, 8), complexion, side * 0.132, -0.013, 0.012);
      mesh(head, new THREE.SphereGeometry(0.012, 10, 8), dark, side * 0.048, -0.018, 0.132);
    }
    mesh(head, new THREE.SphereGeometry(0.023, 10, 8), complexion, 0, -0.048, 0.139);
    box(figure, [0.11, 0.12, 0.11], complexion, 0, 0.71, 0);
    const torso = mesh(figure, new THREE.CapsuleGeometry(0.143, 0.18, 6, 14), outfit, 0, 0.51, 0);
    torso.scale.set(1, 0.83, 0.73);
    const legs = [-0.09, 0.09].map(offset => {
      const leg = new THREE.Group();
      leg.position.set(offset, 0.35, 0);
      figure.add(leg);
      mesh(leg, new THREE.CapsuleGeometry(0.053, 0.075, 5, 12), dark, 0, -0.072, 0);
      const knee = new THREE.Group();
      knee.position.y = -0.146;
      leg.add(knee);
      mesh(knee, new THREE.CapsuleGeometry(0.046, 0.071, 5, 12), dark, 0, -0.065, 0);
      box(knee, [0.137, 0.077, 0.21], white, 0, -0.134, 0.038);
      return { leg, knee };
    });
    const freeArm = mesh(figure, new THREE.CapsuleGeometry(0.046, 0.17, 5, 12), outfit, -0.173, 0.50, 0.035);
    freeArm.rotation.x = -0.37;
    const arm = new THREE.Group();
    arm.position.set(0.173, 0.62, 0);
    figure.add(arm);
    mesh(arm, new THREE.CapsuleGeometry(0.048, 0.151, 5, 12), outfit, 0, -0.092, 0);
    mesh(arm, new THREE.SphereGeometry(0.047, 12, 10), complexion, 0, -0.223, 0);
    return { figure, arm, freeArm, head, legs };
  }

  const team = [
    { name: 'Quản trị', x: -1.95, outfit: dark },
    { name: 'Quản lý Shop', x: 0.04, outfit: brass },
    { name: 'Vận hành', x: 2.07, outfit: gold, seatOffset: -0.7 },
  ];
  const staff = team.map(({ name, x, outfit, seatOffset = 0 }) => {
    const seatX = x + seatOffset;
    const member = person(seatX, -1.97, outfit, lightSkin, 0.09);
    box(root, [1.41, 0.48, 0.43], sand, x, 0.32, -1.53);
    box(root, [1.49, 0.075, 0.49], white, x, 0.58, -1.53);
    box(root, [0.41, 0.245, 0.056], dark, seatX + 0.25, 0.75, -1.54);
    box(root, [0.35, 0.18, 0.012], screen, seatX + 0.25, 0.75, -1.505);
    label(name, seatOffset ? 1.02 : 1.26, 0.37, seatX, 1.37, -1.7);
    return member;
  });

  const creator = person(-2.03, 1.24, brass, skin, 0.44);
  box(creator.arm, [0.15, 0.24, 0.052], dark, 0, -0.26, 0.065);
  box(creator.arm, [0.116, 0.185, 0.011], screen, 0, -0.26, 0.096);
  mesh(creator.freeArm, new THREE.SphereGeometry(0.043, 12, 10), skin, 0, -0.12, 0);
  const creatorLabel = label('KOL', 0.7, 0.31, -2.1, 1.36, 1.24);

  const shopper = person(2.94, 2.05, cream, skin, -0.95);
  const seatedBuyer = person(2.72, 0.77, sand, lightSkin, -0.64);
  const standingCheckout = new THREE.Vector3(0.92, 0.08, 0.62);
  const chair = new THREE.Group();
  chair.position.copy(seatedBuyer.figure.position);
  chair.position.y = 0.07;
  chair.rotation.y = seatedBuyer.figure.rotation.y;
  root.add(chair);
  box(chair, [0.43, 0.073, 0.39], cream, 0, 0.24, 0);
  for (const x of [-0.17, 0.17]) {
    box(chair, [0.043, 0.24, 0.043], brass, x, 0.12, 0.15);
    box(chair, [0.043, 0.54, 0.043], brass, x, 0.27, -0.16);
  }
  box(chair, [0.40, 0.145, 0.06], cream, 0, 0.48, -0.16);
  for (const buyer of [shopper, seatedBuyer]) {
    box(buyer.arm, [0.135, 0.215, 0.045], dark, 0, -0.25, 0.064);
    box(buyer.arm, [0.102, 0.170, 0.009], screen, 0, -0.25, 0.091);
  }
  seatedBuyer.figure.position.y -= 0.155;
  seatedBuyer.legs.forEach(({ leg, knee }) => {
    leg.rotation.x = -1.42;
    knee.rotation.x = 1.42;
  });
  const purchase = new THREE.Group();
  shopper.figure.add(purchase);
  purchase.position.set(-0.22, 0.27, 0.16);
  box(purchase, [0.22, 0.25, 0.14], gold, 0, 0, 0);
  mesh(purchase, new THREE.TorusGeometry(0.066, 0.012, 8, 20), dark, 0, 0.135, 0);
  const buyerLabel = label('Khách mua', 1.11, 0.33, 3.25, 1.44, 2.12);

  const route = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-1.56, 0.48, 1.45),
    new THREE.Vector3(0.2, 2.28, 2.25),
    new THREE.Vector3(2.71, 0.92, 2.05),
  );
  const seatedRoute = new THREE.QuadraticBezierCurve3(
    route.v0.clone(),
    new THREE.Vector3(0.3, 2.7, 2.3),
    new THREE.Vector3(2.72, 0.82, 1.0),
  );
  const routeMaterial = finish('#D7B789');
  for (let index = 0; index < 21; index++) {
    const p = route.getPoint(index / 20);
    mesh(root, new THREE.SphereGeometry(0.022, 8, 6), routeMaterial, p.x, p.y, p.z);
  }
  const affiliateLink = label('Link tiếp thị', 1.35, 0.43, 0, 0, 0);
  affiliateLink.material.depthTest = false;
  const opened = label('Đã mở link', 1.35, 0.43, 0, 0, 0);
  opened.material.depthTest = false;
  const order = label('Đã đặt hàng', 1.4, 0.44, 0, 0, 0);
  order.material.depthTest = false;
  const seatedOrder = label('Đã đặt hàng', 1.4, 0.44, 2.72, 1.43, 0.95);
  seatedOrder.material.depthTest = false;

  const productPreview = new THREE.Group();
  root.add(productPreview);
  const previewCanvas = document.createElement('canvas');
  previewCanvas.width = 600;
  previewCanvas.height = 250;
  const previewContext = previewCanvas.getContext('2d')!;
  const previewMap = new THREE.CanvasTexture(previewCanvas);
  previewMap.colorSpace = THREE.SRGBColorSpace;
  textures.push(previewMap);
  const preview = new THREE.Sprite(new THREE.SpriteMaterial({
    map: previewMap, transparent: true, depthTest: false, depthWrite: false, toneMapped: false,
  }));
  preview.scale.set(1.64, 0.69, 1);
  preview.renderOrder = 5;
  productPreview.add(preview);

  const sharedProducts = [
    { name: 'Serum Vitamin C 15%', photo: photos[0] },
    { name: 'Kem chống nắng SPF50+', photo: photos[1] },
    { name: 'Sữa rửa mặt pH 5.5', photo: photos[2] },
    { name: 'Granola hạt dinh dưỡng', photo: photos[4] },
    { name: 'Tai nghe không dây', photo: photos[6] },
  ];
  let currentProduct = -1;

  function paintProduct(name: string, image: HTMLImageElement) {
    previewContext.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    previewContext.beginPath();
    previewContext.roundRect(12, 12, 576, 226, 38);
    previewContext.fillStyle = '#FFFCF5';
    previewContext.fill();
    previewContext.strokeStyle = '#C59B58';
    previewContext.lineWidth = 4;
    previewContext.stroke();
    if (image.naturalWidth) {
      const size = Math.min(image.width, image.height);
      previewContext.drawImage(image, (image.width - size) / 2, (image.height - size) / 2, size, size, 37, 46, 157, 157);
    }
    previewContext.fillStyle = '#523920';
    previewContext.font = 'bold 38px sans-serif';
    previewContext.fillText(name, 217, 104, 350);
    previewContext.font = '32px sans-serif';
    previewContext.fillText('Qua link của KOL', 217, 165);
    previewMap.needsUpdate = true;
  }
  const productImages = sharedProducts.map(({ name, photo }, index) => {
    const image = new Image();
    image.onload = () => { if (!disposed && currentProduct === index) paintProduct(name, image); };
    image.src = '/assets/products/real/' + photo;
    return image;
  });

  const smooth = (start: number, end: number, elapsed: number) => THREE.MathUtils.smoothstep(elapsed, start, end);
  const cycleDuration = 17;
  const exit = new THREE.Vector3(3.76, 0.08, 2.37);
  const routeEntry = new THREE.Vector3(2.94, 0.08, 2.05);
  const departure = new THREE.QuadraticBezierCurve3(
    standingCheckout.clone(),
    new THREE.Vector3(1.55, 0.08, 2.60),
    exit,
  );
  const travelDirection = new THREE.Vector3();

  function walk(figure: ReturnType<typeof person>, progress: number, strength: number) {
    const stride = Math.sin(progress * Math.PI * 10) * strength;
    figure.legs[0].leg.rotation.x = stride;
    figure.legs[1].leg.rotation.x = -stride;
    figure.freeArm.rotation.x = stride * 0.65;
    figure.figure.position.y = 0.08 + Math.abs(stride) * 0.055;
  }

  function draw() {
    const cycleTime = time + 1.45;
    const cycle = cycleTime % cycleDuration;
    const elapsed = cycle - 1.45;
    const productIndex = Math.floor(cycleTime / cycleDuration) % sharedProducts.length;
    if (productIndex !== currentProduct) {
      currentProduct = productIndex;
      paintProduct(sharedProducts[productIndex].name, productImages[productIndex]);
    }
    const arrival = smooth(0.15, 1.44, cycle);
    const seatedShare = smooth(8.9, 9.35, elapsed) * (1 - smooth(10.65, 11.15, elapsed));
    const share = Math.max(seatedShare, smooth(0, 0.8, elapsed) * (1 - smooth(2.75, 3.5, elapsed)));
    const approach = smooth(4, 6.65, elapsed);
    const standingPhone = smooth(6.5, 7.04, elapsed) * (1 - smooth(8.3, 8.95, elapsed));
    const depart = smooth(9.85, 14.1, elapsed);
    const visibility = smooth(0.05, 0.35, cycle) * (1 - smooth(14.1, 14.45, elapsed));
    const tap = smooth(2.65, 3.2, elapsed) * (1 - smooth(4, 4.6, elapsed));
    const reposition = smooth(10, 11.6, elapsed) - smooth(12.25, 14.15, elapsed);
    const creatorStride = Math.sin(reposition * Math.PI) * 0.4;
    creator.figure.position.x = -2.03 + reposition * 0.48;
    creator.figure.position.z = 1.24 + reposition * 0.25;
    creator.figure.rotation.y = 0.44 + share * 0.53 - reposition * 0.55;
    walk(creator, reposition, creatorStride);
    const phoneTap = Math.sin(time * 11) * 0.15 + Math.sin(time * 5) * 0.05;
    creator.arm.rotation.x = -1.2 - share * 0.43 + phoneTap * 0.22;
    creator.arm.rotation.z = -0.54;
    creator.freeArm.rotation.x = -1.14 - share * 0.25 + phoneTap;
    creator.freeArm.rotation.z = 0.78 + phoneTap * 0.56;
    creator.head.rotation.y = Math.sin(time * 2) * 0.16 + share * 0.24;
    creator.head.rotation.x = 0.23 + share * 0.1 + Math.sin(time * 3) * 0.055;
    creatorLabel.position.set(creator.figure.position.x - 0.07, 1.36 + Math.abs(creatorStride) * 0.08, creator.figure.position.z);
    shopper.figure.position.copy(exit).lerp(routeEntry, arrival);
    shopper.figure.position.lerp(standingCheckout, approach);
    shopper.figure.rotation.y = THREE.MathUtils.lerp(-1.95, -0.95, smooth(0.95, 1.44, cycle)) - approach * 1.67;
    if (elapsed >= 9.35) {
      departure.getPointAt(depart, shopper.figure.position);
      departure.getTangentAt(depart, travelDirection);
      const exitAngle = Math.atan2(travelDirection.x, travelDirection.z) - Math.PI * 2;
      shopper.figure.rotation.y = THREE.MathUtils.lerp(-2.62, exitAngle, smooth(9.35, 10.1, elapsed));
    }
    shopper.figure.visible = visibility > 0.01;
    shopper.figure.scale.setScalar(visibility);
    shopper.head.rotation.x = tap * 0.28 + standingPhone * 0.25;
    shopper.arm.rotation.x = -0.25 - Math.max(tap, standingPhone) * 1.42;
    shopper.arm.rotation.z = -standingPhone * 0.35;
    const walking = Math.sin(arrival * Math.PI) + Math.sin(approach * Math.PI) + Math.sin(depart * Math.PI);
    walk(shopper, arrival + approach + depart * 1.8, walking * 0.5);
    shopper.freeArm.rotation.x -= standingPhone * (1.1 + Math.sin(time * 9) * 0.16);
    shopper.freeArm.rotation.z = standingPhone * 0.72;
    purchase.scale.setScalar(smooth(8, 8.45, elapsed));
    const seatedPhone = smooth(10.45, 11.1, elapsed) * (1 - smooth(13.15, 14, elapsed));
    seatedBuyer.head.rotation.x = 0.18 + seatedPhone * 0.19;
    seatedBuyer.head.rotation.y = Math.sin(time * 1.8) * 0.11;
    seatedBuyer.arm.rotation.x = -1.03 - seatedPhone * 0.58;
    seatedBuyer.arm.rotation.z = -0.24;
    seatedBuyer.freeArm.rotation.x = -0.3 - seatedPhone * (0.8 + Math.sin(time * 9) * 0.15);
    seatedBuyer.freeArm.rotation.z = seatedPhone * 0.71;
    staff.forEach((member, index) => {
      const phase = (time + index * 1.7) % 6;
      const gesture = smooth(2.5, 3.4, phase) * (1 - smooth(4.55, 5.25, phase));
      const typing = (1 - gesture) * Math.sin(time * 11 + index);
      const direction = index === 2 ? -1 : 1;
      member.figure.position.x = team[index].x + (team[index].seatOffset ?? 0) + gesture * direction * 0.21;
      member.figure.position.y = 0.08 + gesture * 0.07;
      member.figure.rotation.y = 0.09 + gesture * direction * 0.64;
      member.head.rotation.y = gesture * direction * 0.25 + Math.sin(time * 1.8 + index) * 0.14;
      member.head.rotation.x = (1 - gesture) * 0.21 + Math.sin(time * 3 + index) * 0.08;
      member.arm.rotation.x = -1 + typing * 0.16 - gesture * 0.63;
      member.arm.rotation.z = gesture * (0.58 + Math.sin(time * 7) * 0.12);
      member.freeArm.rotation.x = -0.61 - typing * 0.15;
    });
    buyerLabel.position.set(shopper.figure.position.x + 0.31, 1.42, shopper.figure.position.z + 0.07);
    buyerLabel.material.opacity = visibility;
    const sharingWithSeatedBuyer = elapsed >= 8.9;
    affiliateLink.position.copy(sharingWithSeatedBuyer
      ? seatedRoute.getPoint(smooth(9.13, 10.77, elapsed))
      : route.getPoint(smooth(0.35, 3.08, elapsed)));
    affiliateLink.position.y += 0.24;
    affiliateLink.material.opacity = sharingWithSeatedBuyer
      ? seatedShare
      : smooth(0, 0.35, elapsed) * (1 - smooth(2.95, 3.2, elapsed));
    opened.position.set(shopper.figure.position.x, 1.06, shopper.figure.position.z + 0.28);
    opened.material.opacity = smooth(3.05, 3.3, elapsed) * (1 - smooth(5.25, 5.55, elapsed));
    const previewBuyer = sharingWithSeatedBuyer ? seatedBuyer : shopper;
    productPreview.position.set(previewBuyer.figure.position.x - 0.38, 1.89, previewBuyer.figure.position.z + 0.28);
    preview.material.opacity = sharingWithSeatedBuyer
      ? smooth(10.9, 11.27, elapsed) * (1 - smooth(12.85, 13.2, elapsed))
      : smooth(3.52, 3.9, elapsed) * (1 - smooth(7.28, 7.72, elapsed));
    order.position.set(shopper.figure.position.x - 0.24, 1.84, shopper.figure.position.z + 0.15);
    order.material.opacity = smooth(7.78, 8.15, elapsed) * (1 - smooth(11.2, 11.72, elapsed));
    seatedOrder.material.opacity = smooth(13.05, 13.45, elapsed) * (1 - smooth(14.85, 15.25, elapsed));
    camera.position.set(4.1 + pointer.x * 0.8 + Math.sin(time * 0.55) * 0.37, 5.5 + pointer.y * 0.42, 10);
    camera.lookAt(target);
    renderer.render(scene, camera);
  }

  function tick(now: number) {
    if (previous) time += Math.min((now - previous) / 1000, 0.05);
    previous = now;
    draw();
    frame = requestAnimationFrame(tick);
  }

  function sync() {
    cancelAnimationFrame(frame);
    previous = 0;
    if (onscreen && !paused && !document.hidden) frame = requestAnimationFrame(tick);
    else if (onscreen) draw();
  }

  function resize() {
    const { clientWidth: width, clientHeight: height } = host;
    if (!width || !height) return;
    const aspect = width / height;
    const vertical = Math.max(6.55, 10.25 / aspect);
    camera.left = -vertical * aspect / 2;
    camera.right = vertical * aspect / 2;
    camera.top = vertical / 2;
    camera.bottom = -vertical / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    draw();
  }

  const move = (event: PointerEvent) => {
    if (paused || event.pointerType !== 'mouse') return;
    const bounds = host.getBoundingClientRect();
    pointer.set((event.clientX - bounds.left) / bounds.width - 0.5, (event.clientY - bounds.top) / bounds.height - 0.5);
  };
  const leave = () => pointer.set(0, 0);
  const sizeObserver = new ResizeObserver(resize);
  const visibilityObserver = new IntersectionObserver(([entry]) => {
    onscreen = entry.isIntersecting;
    sync();
  });
  sizeObserver.observe(host);
  visibilityObserver.observe(host);
  host.addEventListener('pointermove', move);
  host.addEventListener('pointerleave', leave);
  document.addEventListener('visibilitychange', sync);
  resize();
  sync();

  return {
    setPaused(value: boolean) {
      paused = value;
      if (paused) leave();
      sync();
    },
    dispose() {
      disposed = true;
      productImages.forEach(image => { image.onload = null; });
      cancelAnimationFrame(frame);
      sizeObserver.disconnect();
      visibilityObserver.disconnect();
      host.removeEventListener('pointermove', move);
      host.removeEventListener('pointerleave', leave);
      document.removeEventListener('visibilitychange', sync);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      const materials = new Set<THREE.Material>();
      scene.traverse(object => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          materials.add(object.material);
        }
        if (object instanceof THREE.Sprite) materials.add(object.material);
      });
      materials.forEach(material => material.dispose());
      textures.forEach(texture => texture.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
