import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { Block, World } from "../engine/types";
export const colors: Record<string, string> = {
  red: "#ed6659",
  green: "#8cca74",
  blue: "#699deb",
  white: "#cbd2cf",
  grey: "#34444b",
};
export function blockName(b: Block, zh = true) {
  return zh
    ? `${({ red: "红色", green: "绿色", blue: "蓝色", white: "白色", grey: "" } as Record<string, string>)[b.color] ?? b.color}${({ block: "积木", cube: "立方块", pyramid: "棱锥", box: "盒子", table: "桌面", arm: "机械臂" } as Record<string, string>)[b.type] ?? b.type}`
    : `${b.color} ${b.type}`;
}
export default function WorldView({
  world,
  selected,
  onSelect,
  wireframe,
  labels,
  cameraKey,
}: {
  world: World | null;
  selected: string | null;
  onSelect: (id: string) => void;
  wireframe: boolean;
  labels: boolean;
  cameraKey: number;
}) {
  const mount = useRef<HTMLDivElement>(null),
    current = useRef(world),
    selection = useRef(selected),
    callback = useRef(onSelect),
    options = useRef({ wireframe, labels, cameraKey });
  current.current = world;
  selection.current = selected;
  callback.current = onSelect;
  options.current = { wireframe, labels, cameraKey };
  const [error, setError] = useState(false);
  useEffect(() => {
    const host = mount.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setError(true);
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x101c24, 0);
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 300);
    camera.position.set(57, 49, 66);
    const control = new OrbitControls(camera, renderer.domElement);
    control.target.set(16, 8, 16);
    control.enableDamping = true;
    control.minDistance = 30;
    control.maxDistance = 125;
    control.maxPolarAngle = Math.PI / 2.04;
    scene.add(new THREE.AmbientLight(0xcfe2f2, 1.9));
    const key = new THREE.DirectionalLight(0xffffff, 3.2);
    key.position.set(-15, 65, 35);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, {
      left: -50,
      right: 50,
      top: 50,
      bottom: -50,
      far: 180,
    });
    key.shadow.bias = -0.001;
    scene.add(key);
    scene.add(new THREE.HemisphereLight(0xc7e5ff, 0x203535, 1.4));
    const meshes = new Map<string, THREE.Group>();
    const targets: THREE.Object3D[] = [];
    const grid = new THREE.GridHelper(36, 18, 0x668085, 0x3b515b);
    grid.position.set(18, 4.035, 18);
    scene.add(grid);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(160, 160),
      new THREE.ShadowMaterial({ opacity: 0.16 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(16, -0.02, 16);
    ground.receiveShadow = true;
    scene.add(ground);
    const label = (name: string) => {
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 64;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#14232bea";
      ctx.beginPath();
      ctx.roundRect(4, 4, 248, 56, 10);
      ctx.fill();
      ctx.fillStyle = "#d4e1e5";
      ctx.font = "24px monospace";
      ctx.textAlign = "center";
      ctx.fillText(name.toUpperCase(), 128, 41);
      const texture = new THREE.CanvasTexture(canvas);
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: texture,
          depthTest: false,
          transparent: true,
        }),
      );
      sprite.scale.set(7.5, 1.875, 1);
      sprite.renderOrder = 10;
      return sprite;
    };
    const create = (b: Block) => {
      const group = new THREE.Group();
      group.userData.id = b.ID;
      const material = new THREE.MeshStandardMaterial({
        color: colors[b.color] ?? "#bbb",
        roughness: 0.65,
        metalness: 0.04,
      });
      const add = (geo: THREE.BufferGeometry, x = 0, y = 0, z = 0) => {
        const mesh = new THREE.Mesh(geo, material);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.id = b.ID;
        group.add(mesh);
        targets.push(mesh);
        const lines = new THREE.LineSegments(
          new THREE.EdgesGeometry(geo),
          new THREE.LineBasicMaterial({
            color: b.type === "table" ? 0x66818d : 0x132c36,
            transparent: true,
            opacity: 0.32,
          }),
        );
        lines.position.copy(mesh.position);
        group.add(lines);
      };
      if (b.type === "pyramid") {
        const geo = new THREE.ConeGeometry(1, 1, 4);
        geo.rotateY(Math.PI / 4);
        geo.scale(b.dx / Math.sqrt(2), b.dy, b.dz / Math.sqrt(2));
        add(geo, b.dx / 2, b.dy / 2, b.dz / 2);
      } else if (b.type === "box") {
        add(new THREE.BoxGeometry(b.dx, 1, b.dz), b.dx / 2, 0.5, b.dz / 2);
        add(new THREE.BoxGeometry(1, b.dy, b.dz), 0.5, b.dy / 2, b.dz / 2);
        add(
          new THREE.BoxGeometry(1, b.dy, b.dz),
          b.dx - 0.5,
          b.dy / 2,
          b.dz / 2,
        );
        add(new THREE.BoxGeometry(b.dx - 2, b.dy, 1), b.dx / 2, b.dy / 2, 0.5);
        add(
          new THREE.BoxGeometry(b.dx - 2, b.dy, 1),
          b.dx / 2,
          b.dy / 2,
          b.dz - 0.5,
        );
        material.transparent = true;
        material.opacity = 0.28;
        material.depthWrite = false;
      } else if (b.type === "arm") {
        material.color.set("#b9ced2");
        add(new THREE.CylinderGeometry(0.23, 0.23, 23, 12), 1, 14, 1);
        add(new THREE.BoxGeometry(3.8, 0.6, 3.8), 1, 1, 1);
        add(new THREE.BoxGeometry(0.45, 1.8, 0.45), -0.6, 0.2, -0.6);
        add(new THREE.BoxGeometry(0.45, 1.8, 0.45), 2.6, 0.2, 2.6);
      } else
        add(
          new THREE.BoxGeometry(b.dx, b.dy, b.dz),
          b.dx / 2,
          b.dy / 2,
          b.dz / 2,
        );
      if (!["table", "arm"].includes(b.type)) {
        const tag = label(b.ID);
        tag.position.set(b.dx / 2, b.dy + 2.3, b.dz / 2);
        tag.name = "label";
        group.add(tag);
      }
      group.position.set(b.x, b.y, b.z);
      scene.add(group);
      meshes.set(b.ID, group);
    };
    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    const raycaster = new THREE.Raycaster();
    let down = [0, 0];
    const pointerDown = (e: PointerEvent) => {
      down = [e.clientX, e.clientY];
    };
    const pick = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
      const r = renderer.domElement.getBoundingClientRect();
      raycaster.setFromCamera(
        new THREE.Vector2(
          ((e.clientX - r.left) / r.width) * 2 - 1,
          (-(e.clientY - r.top) / r.height) * 2 + 1,
        ),
        camera,
      );
      const hit = raycaster
        .intersectObjects(targets)
        .find((h) => !["table", "shrdlu-arm"].includes(h.object.userData.id));
      if (hit) callback.current(hit.object.userData.id);
    };
    renderer.domElement.addEventListener("pointerdown", pointerDown);
    renderer.domElement.addEventListener("pointerup", pick);
    let frame = 0,
      lastCamera = options.current.cameraKey;
    const render = () => {
      frame = requestAnimationFrame(render);
      if (lastCamera !== options.current.cameraKey) {
        camera.position.set(57, 49, 66);
        control.target.set(16, 8, 16);
        lastCamera = options.current.cameraKey;
      }
      for (const b of current.current?.objects ?? []) {
        if (!meshes.has(b.ID)) create(b);
        const g = meshes.get(b.ID)!;
        g.position.lerp(new THREE.Vector3(b.x, b.y, b.z), 0.24);
        g.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            const m = o.material as THREE.MeshStandardMaterial;
            m.wireframe = options.current.wireframe && b.type !== "table";
            m.emissive.set(b.ID === selection.current ? 0x36462d : 0);
            m.emissiveIntensity = 0.3;
          }
          if (o.name === "label")
            o.visible = options.current.labels || b.ID === selection.current;
        });
      }
      control.update();
      renderer.render(scene, camera);
    };
    render();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      control.dispose();
      renderer.domElement.removeEventListener("pointerup", pick);
      renderer.domElement.removeEventListener("pointerdown", pointerDown);
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) {
          o.geometry.dispose();
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m) => m.dispose());
        } else if (o instanceof THREE.Sprite) {
          o.material.map?.dispose();
          o.material.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);
  return (
    <div
      ref={mount}
      className="world-canvas"
      role="img"
      aria-label="可旋转的 SHRDLU 三维积木世界"
    >
      {error && (
        <div className="canvas-error">
          WebGL 无法启动。仍可通过下方物体列表查看世界并使用对话。
        </div>
      )}
    </div>
  );
}
