import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { Block, World } from "../engine/types";
import { elbowPosition, sampleMotion, smooth } from "./motion";
export const colors: Record<string, string> = {
  red: "#d76055",
  green: "#75a96d",
  blue: "#5c8dce",
  white: "#bdc5c8",
  grey: "#dde1e2",
};
export function blockName(b: Block, zh = true) {
  return zh
    ? `${({ red: "红色", green: "绿色", blue: "蓝色", white: "", grey: "" } as Record<string, string>)[b.color] ?? b.color}${({ block: "积木", cube: "立方块", pyramid: "棱锥", box: "盒子", table: "桌面", arm: "机械臂" } as Record<string, string>)[b.type] ?? b.type}`
    : `${b.color} ${b.type}`;
}
export type CameraAction = {
  id: number;
  kind: "reset" | "in" | "out" | "left" | "right";
};
type Props = {
  dark: boolean;
  world: World | null;
  selected: string | null;
  onSelect: (id: string) => void;
  wireframe: boolean;
  labels: boolean;
  cameraAction: CameraAction;
  paused: boolean;
  speed: number;
  onComplete: (id: number) => void;
};
export default function WorldView(props: Props) {
  const host = useRef<HTMLDivElement>(null),
    latest = useRef(props);
  latest.current = props;
  const [error, setError] = useState(false);
  useEffect(() => {
    if (error && props.world?.frameId) props.onComplete(props.world.frameId);
  }, [error, props.world, props.onComplete]);
  useEffect(() => {
    const mount = host.current!;
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
    renderer.setClearColor(0xf7f7f7, 0);
    mount.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const ambient = new THREE.HemisphereLight(0xffffff, 0x949ca0, 2.1);
    scene.add(ambient);
    const light = new THREE.DirectionalLight(0xfff9ef, 2.5);
    light.position.set(-35, 80, 45);
    light.castShadow = true;
    light.shadow.mapSize.set(2048, 2048);
    Object.assign(light.shadow.camera, {
      left: -70,
      right: 70,
      top: 85,
      bottom: -65,
      far: 200,
    });
    light.shadow.bias = -0.001;
    light.shadow.normalBias = 0.15;
    scene.add(light);
    const camera = new THREE.OrthographicCamera(-50, 50, 38, -38, 0.1, 250);
    camera.position.set(76, 67, 88);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(13, 20, 17);
    controls.enableDamping = true;
    controls.minZoom = 0.65;
    controls.maxZoom = 2.4;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.enablePan = false;
    const grid = new THREE.GridHelper(36, 18, 0xb4bdc0, 0xcbd1d3);
    grid.position.set(18, 4.025, 18);
    scene.add(grid);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(220, 220),
      new THREE.ShadowMaterial({ opacity: 0.12 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    const meshes = new Map<string, THREE.Group>(),
      targets: THREE.Object3D[] = [];
    const material = (color: string, metalness = 0.05) =>
      new THREE.MeshStandardMaterial({ color, roughness: 0.48, metalness });
    function paintLabel(c: HTMLCanvasElement, text: string, dark: boolean) {
      const ctx = c.getContext("2d")!;
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.fillStyle = dark ? "#202427ee" : "#ffffffee";
      ctx.beginPath();
      ctx.roundRect(2, 2, 252, 60, 9);
      ctx.fill();
      ctx.fillStyle = dark ? "#e5e9ec" : "#30373b";
      ctx.font = "25px monospace";
      ctx.textAlign = "center";
      ctx.fillText(text, 128, 42);
    }
    function label(text: string) {
      const c = document.createElement("canvas");
      c.width = 256;
      c.height = 64;
      paintLabel(c, text, latest.current.dark);
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: new THREE.CanvasTexture(c),
          depthTest: false,
        }),
      );
      sprite.scale.set(7.5, 1.875, 1);
      sprite.name = "label";
      sprite.renderOrder = 20;
      return sprite;
    }
    function create(b: Block) {
      const group = new THREE.Group(),
        m = material(colors[b.color] ?? "#aaa");
      group.userData.id = b.ID;
      function add(geo: THREE.BufferGeometry, x: number, y: number, z: number) {
        const mesh = new THREE.Mesh(geo, m);
        mesh.position.set(x, y, z);
        mesh.castShadow = b.type !== "box";
        mesh.receiveShadow = true;
        mesh.userData.id = b.ID;
        group.add(mesh);
        targets.push(mesh);
        const lines = new THREE.LineSegments(
          new THREE.EdgesGeometry(geo),
          new THREE.LineBasicMaterial({
            color: 0x47535a,
            transparent: true,
            opacity: b.type === "box" ? 0.45 : 0.16,
          }),
        );
        lines.position.copy(mesh.position);
        group.add(lines);
      }
      if (b.type === "pyramid") {
        const geo = new THREE.ConeGeometry(1, 1, 4);
        geo.rotateY(Math.PI / 4);
        geo.scale(b.dx / Math.sqrt(2), b.dy, b.dz / Math.sqrt(2));
        add(geo, b.dx / 2, b.dy / 2, b.dz / 2);
      } else if (b.type === "box") {
        add(new THREE.BoxGeometry(b.dx, 1, b.dz), b.dx / 2, 0.5, b.dz / 2);
        for (const x of [0.5, b.dx - 0.5])
          add(new THREE.BoxGeometry(1, b.dy, b.dz), x, b.dy / 2, b.dz / 2);
        for (const z of [0.5, b.dz - 0.5])
          add(new THREE.BoxGeometry(b.dx - 2, b.dy, 1), b.dx / 2, b.dy / 2, z);
        m.transparent = true;
        m.opacity = 0.12;
        m.depthWrite = false;
      } else
        add(
          new THREE.BoxGeometry(b.dx, b.dy, b.dz),
          b.dx / 2,
          b.dy / 2,
          b.dz / 2,
        );
      if (b.type !== "table") {
        const tag = label(b.ID);
        tag.position.set(b.dx / 2, b.dy + 2.1, b.dz / 2);
        group.add(tag);
      }
      group.position.set(b.x, b.y, b.z);
      scene.add(group);
      meshes.set(b.ID, group);
    }
    // Fixed pedestal, rotating shoulder and elbow, level wrist, and parallel jaws.
    const rig = new THREE.Group();
    scene.add(rig);
    const dark = material("#373e42", 0.6),
      silver = material("#aeb8bd", 0.65),
      inset = material("#67737c", 0.7);
    function part(geo: THREE.BufferGeometry, m: THREE.Material = dark) {
      const mesh = new THREE.Mesh(geo, m);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      rig.add(mesh);
      return mesh;
    }
    const base = part(new THREE.CylinderGeometry(3.5, 4.1, 2.2, 32));
    base.position.set(-7, 1.1, 18);
    const pedestal = part(new THREE.CylinderGeometry(2.1, 2.8, 7, 24), silver);
    pedestal.position.set(-7, 5.5, 18);
    const shoulder = new THREE.Vector3(-7, 10, 18);
    const upper = part(new THREE.BoxGeometry(1.9, 1, 2.5), silver),
      forearm = part(new THREE.BoxGeometry(1.5, 1, 2), silver);
    const upperInset = part(new THREE.BoxGeometry(1.98, 1, 0.5), inset),
      lowerInset = part(new THREE.BoxGeometry(1.58, 1, 0.45), inset);
    const joints = [0, 1, 2].map(() =>
      part(new THREE.SphereGeometry(1.7, 20, 14)),
    );
    joints[2].scale.setScalar(0.64);
    const wrist = new THREE.Group();
    rig.add(wrist);
    const wristMount = new THREE.Mesh(
      new THREE.CylinderGeometry(0.75, 0.75, 2, 16),
      dark,
    );
    wristMount.position.y = 1;
    wrist.add(wristMount);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(1, 0.7, 1.5), silver);
    wrist.add(rail);
    const jawL = new THREE.Group(),
      jawR = new THREE.Group();
    wrist.add(jawL, jawR);
    const fingers = [jawL, jawR].map((group, i) => {
      const finger = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1, 1.2), dark);
      const pad = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.7, 1.35), inset);
      pad.position.x = i === 0 ? 0.3 : -0.3;
      group.add(finger, pad);
      finger.castShadow = true;
      return { finger, pad };
    });
    const up = new THREE.Vector3(0, 1, 0);
    function link(
      mesh: THREE.Mesh,
      a: THREE.Vector3,
      b: THREE.Vector3,
      trim = 0,
    ) {
      const delta = b.clone().sub(a);
      mesh.position.copy(a).add(b).multiplyScalar(0.5);
      mesh.quaternion.setFromUnitVectors(up, delta.clone().normalize());
      mesh.scale.y = Math.max(0.1, delta.length() - trim);
    }
    let lastObject: Block | undefined;
    let jawWidth = 4,
      jawHeight = 4.4,
      jawContact = 4.15;
    function pose(state: World, grip: number, delta: number) {
      const arm = state.objects.find((b) => b.type === "arm");
      if (!arm) return;
      const end = new THREE.Vector3(arm.x + 1, arm.y, arm.z + 1),
        elbow = new THREE.Vector3(
          ...elbowPosition(shoulder.toArray(), end.toArray()),
        );
      link(upper, shoulder, elbow, 2.5);
      link(forearm, elbow, end, 2);
      link(upperInset, shoulder, elbow, 7);
      link(lowerInset, elbow, end, 6);
      joints[0].position.copy(shoulder);
      joints[1].position.copy(elbow);
      joints[2].position.copy(end).add(new THREE.Vector3(0, 1.5, 0));
      wrist.position.copy(end);
      const b = state.objects.find(
        (b) => b.ID === (state.motion?.objectId ?? state.held),
      );
      if (b) lastObject = b;
      const targetWidth = lastObject?.dx ?? 4,
        targetHeight = (lastObject?.dy ?? 6) * 0.4 + 2;
      const targetContact =
        lastObject?.type === "pyramid"
          ? targetWidth * 0.4 + 0.35
          : targetWidth + 0.15;
      const blend = 1 - Math.exp(-delta * 0.01);
      jawWidth += (targetWidth - jawWidth) * blend;
      jawHeight += (targetHeight - jawHeight) * blend;
      jawContact += (targetContact - jawContact) * blend;
      const width = jawWidth,
        height = jawHeight,
        contact = jawContact;
      const gap = (width + 4) * (1 - grip) + contact * grip;
      rail.scale.x = width + 5;
      [jawL, jawR].forEach((jaw, i) => {
        jaw.position.x = ((i === 0 ? -1 : 1) * gap) / 2;
        fingers[i].finger.scale.y = height;
        fingers[i].finger.position.y = -height / 2;
        fingers[i].pad.position.y = -height + 0.7;
      });
    }
    const resize = () => {
      const { width, height } = mount.getBoundingClientRect();
      if (width < 1 || height < 1) return;
      renderer.setSize(width, height);
      const aspect = width / height;
      camera.left = -38 * aspect;
      camera.right = 38 * aspect;
      camera.top = 38;
      camera.bottom = -38;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();
    let down = [0, 0];
    const raycaster = new THREE.Raycaster();
    const pointerDown = (e: PointerEvent) => {
      down = [e.clientX, e.clientY];
    };
    const pointerUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
      const rect = renderer.domElement.getBoundingClientRect();
      raycaster.setFromCamera(
        new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          (-(e.clientY - rect.top) / rect.height) * 2 + 1,
        ),
        camera,
      );
      const hits = raycaster
        .intersectObjects(targets)
        .filter((h) => h.object.userData.id !== "table");
      const hit =
        hits.find((h) => !String(h.object.userData.id).startsWith("box")) ??
        hits[0];
      if (hit) latest.current.onSelect(hit.object.userData.id);
    };
    renderer.domElement.addEventListener("pointerdown", pointerDown);
    renderer.domElement.addEventListener("pointerup", pointerUp);
    const lost = (e: Event) => {
      e.preventDefault();
      setError(true);
    };
    renderer.domElement.addEventListener("webglcontextlost", lost);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0,
      previousTime = performance.now(),
      accepted = -1,
      cameraId = -1,
      displayed: World | null = null,
      grip = 0;
    let appliedDark: boolean | undefined;
    let segment: {
      from: World;
      to: World;
      elapsed: number;
      duration: number;
      fromGrip: number;
    } | null = null;
    function render(now: number) {
      frame = requestAnimationFrame(render);
      const delta = Math.min(80, now - previousTime);
      previousTime = now;
      const p = latest.current;
      const themeChanged = appliedDark !== p.dark;
      if (themeChanged) {
        appliedDark = p.dark;
        ambient.intensity = p.dark ? 1.5 : 2.1;
        ambient.groundColor.set(p.dark ? 0x465366 : 0x949ca0);
        light.intensity = p.dark ? 2 : 2.5;
        floor.material.opacity = p.dark ? 0.3 : 0.12;
        grid.material.color.set(p.dark ? 0x849299 : 0xffffff);
      }
      if (p.cameraAction.id !== cameraId) {
        cameraId = p.cameraAction.id;
        const kind = p.cameraAction.kind;
        if (kind === "reset") {
          camera.position.set(76, 67, 88);
          controls.target.set(13, 20, 17);
          camera.zoom = 1;
        } else if (kind === "in" || kind === "out")
          camera.zoom = THREE.MathUtils.clamp(
            camera.zoom * (kind === "in" ? 1.18 : 1 / 1.18),
            0.65,
            2.4,
          );
        else {
          const offset = camera.position
            .clone()
            .sub(controls.target)
            .applyAxisAngle(up, kind === "left" ? 0.25 : -0.25);
          camera.position.copy(controls.target).add(offset);
        }
        camera.updateProjectionMatrix();
      }
      const next = p.world;
      if (next && next.frameId !== accepted) {
        accepted = next.frameId ?? 0;
        if (!displayed) {
          displayed = structuredClone(next);
          grip = next.held ? 1 : 0;
          if (accepted)
            queueMicrotask(() => latest.current.onComplete(accepted));
        } else {
          const moved = next.objects.some((b) => {
            const old = displayed!.objects.find((a) => a.ID === b.ID);
            return (
              old && Math.hypot(b.x - old.x, b.y - old.y, b.z - old.z) > 0.001
            );
          });
          segment = {
            from: structuredClone(displayed),
            to: next,
            elapsed: 0,
            duration: next.motion?.duration ?? (moved ? 80 : 0),
            fromGrip: grip,
          };
        }
      }
      if (segment && !p.paused) {
        segment.elapsed += delta * p.speed * (reduced.matches ? 2 : 1);
        const progress = segment.duration
          ? Math.min(1, segment.elapsed / segment.duration)
          : 1;
        displayed = sampleMotion(segment.from, segment.to, progress);
        grip =
          segment.fromGrip +
          ((segment.to.motion?.grip ?? (segment.to.held ? 1 : 0)) -
            segment.fromGrip) *
            smooth(progress);
        if (progress === 1) {
          const completed = segment.to.frameId!;
          segment = null;
          queueMicrotask(() => latest.current.onComplete(completed));
        }
      }
      if (displayed) {
        for (const b of displayed.objects) {
          if (b.type === "arm") continue;
          if (!meshes.has(b.ID)) create(b);
          const g = meshes.get(b.ID)!;
          g.position.set(b.x, b.y, b.z);
          g.traverse((o) => {
            if (o instanceof THREE.Mesh) {
              const m = o.material as THREE.MeshStandardMaterial;
              m.wireframe = p.wireframe && b.type !== "table";
              m.emissive.set(b.ID === p.selected ? 0x263137 : 0);
              m.emissiveIntensity = 0.16;
              if (b.type === "table")
                m.color.set(p.dark ? 0x41494f : (colors[b.color] ?? "#dde1e2"));
            }
            if (o instanceof THREE.LineSegments) {
              (o.material as THREE.LineBasicMaterial).color.set(
                p.dark ? 0xaab9c1 : 0x47535a,
              );
            }
            if (o.name === "label") {
              o.visible = p.labels || b.ID === p.selected;
              if (themeChanged && o instanceof THREE.Sprite) {
                const texture = o.material.map!;
                paintLabel(texture.image as HTMLCanvasElement, b.ID, p.dark);
                texture.needsUpdate = true;
              }
            }
          });
        }
        pose(displayed, grip, p.paused ? 0 : delta);
      }
      controls.update();
      renderer.render(scene, camera);
    }
    frame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", pointerDown);
      renderer.domElement.removeEventListener("pointerup", pointerUp);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      const geometries = new Set<THREE.BufferGeometry>(),
        materials = new Set<THREE.Material>();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) {
          geometries.add(o.geometry);
          for (const m of Array.isArray(o.material) ? o.material : [o.material])
            materials.add(m);
        } else if (o instanceof THREE.Sprite) {
          o.material.map?.dispose();
          materials.add(o.material);
        }
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);
  return (
    <div
      className="world-canvas"
      ref={host}
      role="img"
      aria-label="三维积木世界与关节机械臂"
    >
      {error && (
        <p className="canvas-error">
          无法显示三维场景。仍可使用对话与物体面板。
        </p>
      )}
    </div>
  );
}
