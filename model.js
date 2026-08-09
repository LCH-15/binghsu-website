import * as THREE from "./node_modules/three/build/three.module.js";
import { GLTFLoader } from "./node_modules/three/examples/jsm/loaders/GLTFLoader.js";
import modelAsset from "./assets/thinking.glb";

const stage = document.querySelector(".hero-3d");
const canvas = document.querySelector(".hero-3d-canvas");
const home = document.querySelector(".home");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

if (stage && canvas && home) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.01, 100);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  const clock = new THREE.Clock();
  const pointer = new THREE.Vector2();
  const targetPointer = new THREE.Vector2();
  // Keep each visit distinct without exposing the back, top, or underside of the model.
  const viewingSide = Math.random() < 0.5 ? -1 : 1;
  const baseRotation = new THREE.Euler(
    THREE.MathUtils.lerp(-0.22, -0.1, Math.random()),
    viewingSide * THREE.MathUtils.lerp(0.28, 0.88, Math.random()),
    viewingSide * THREE.MathUtils.lerp(0.02, 0.14, Math.random())
  );
  const basePosition = new THREE.Vector3();
  let model;
  let interaction = 0;
  let interactionTarget = 0;
  let scrollProgress = 0;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.localClippingEnabled = false;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  // Match the larger transparent canvas so hover lift has room above the model.
  camera.position.set(0, 0, 13.42);

  scene.add(new THREE.HemisphereLight(0xf3f2ff, 0x3d3e9e, 2.3));
  const keyLight = new THREE.DirectionalLight(0xffffff, 4.2);
  keyLight.position.set(3, 5, 6);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xa9b5ff, 2.4);
  fillLight.position.set(-5, 1, 3);
  scene.add(fillLight);

  function resize() {
    const { width, height } = stage.getBoundingClientRect();
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  function updateScrollState() {
    const progress = Math.min(1, Math.max(0, -home.getBoundingClientRect().top / window.innerHeight));
    scrollProgress = progress;
    // The positive offset lets the model leave the viewport more slowly than the title.
    stage.style.setProperty("--hero-model-parallax", `${(progress * window.innerHeight * 0.28).toFixed(1)}px`);
  }

  new GLTFLoader().load(
    modelAsset,
    (gltf) => {
      model = gltf.scene;
      const bounds = new THREE.Box3().setFromObject(model);
      const center = bounds.getCenter(new THREE.Vector3());
      const size = bounds.getSize(new THREE.Vector3());
      const longestSide = Math.max(size.x, size.y, size.z);
      const scale = 4.3 / longestSide;

      model.scale.setScalar(scale);
      model.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
      basePosition.copy(model.position);
      model.rotation.copy(baseRotation);
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = false;
          child.receiveShadow = false;
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((material) => {
            // The scanned sculpture has inward-facing polygons around the head.
            // Render both sides so those polygons do not disappear at valid viewing angles.
            material.side = THREE.DoubleSide;
            material.needsUpdate = true;
          });
        }
      });
      scene.add(model);
    },
    undefined,
    () => stage.classList.add("is-unavailable")
  );

  function setInteraction(active) {
    interactionTarget = active ? 1 : 0;
  }

  stage.addEventListener("pointerenter", () => setInteraction(true));
  stage.addEventListener("pointerleave", () => setInteraction(false));
  stage.addEventListener("pointerdown", () => setInteraction(true));
  stage.addEventListener("pointerup", () => setInteraction(false));
  stage.addEventListener("pointermove", (event) => {
    const rect = stage.getBoundingClientRect();
    targetPointer.set((event.clientX - rect.left) / rect.width - 0.5, (event.clientY - rect.top) / rect.height - 0.5);
  });

  function render() {
    const elapsed = clock.getElapsedTime();
    const motionEnabled = !reducedMotion.matches;
    interaction += (interactionTarget - interaction) * 0.08;
    pointer.lerp(targetPointer, 0.055);

    if (model) {
      const floatOffset = motionEnabled ? Math.sin(elapsed * 1.25) * 0.11 : 0;
      const rotationOffset = motionEnabled ? Math.sin(elapsed * 0.75) * 0.025 : 0;
      model.position.y = basePosition.y + floatOffset + interaction * 0.18;
      model.rotation.x = baseRotation.x + pointer.y * 0.11;
      model.rotation.y = baseRotation.y + pointer.x * 0.2;
      model.rotation.z = baseRotation.z + rotationOffset + (motionEnabled ? scrollProgress * 0.95 : 0);
      renderer.toneMappingExposure = 1.08 + interaction * 0.13;
    }

    renderer.render(scene, camera);
    window.requestAnimationFrame(render);
  }

  resize();
  updateScrollState();
  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("scroll", updateScrollState, { passive: true });
  render();
}
