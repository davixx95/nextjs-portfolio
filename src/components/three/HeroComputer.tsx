"use client";

import React, {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useTheme } from "next-themes";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Terminal, TerminalController, TerminalProps } from "@/components/terminal/Terminal";
import { HERO_COMPUTER_HEIGHT, HeroComputerPoster } from "./HeroComputerPoster";

/* ------------------------------------------------------------- constants -- */

// "Vintage Terminal" by NoMoreFeelings, via Sketchfab (CC BY). Optimized by
// scripts/optimize-terminal-model.mjs: 73 KB, ~1.2k triangles.
const MODEL_URL = "/models/vintage-terminal.glb";
const MODEL_SCALE = 1;
/** Model-space y of the model's lowest point and z of the case's middle (the turn pivot). */
const MODEL_BOTTOM = -1.134;
const MODEL_PIVOT_Z = 0.2;

/**
 * The CRT, in model units (read from the GLB's `screen` and `bezel` meshes).
 * The DOM screen is the glass's bounding box, on the plane of its edge.
 */
const SCREEN = {
  center: [-0.348, 0.096, 1.061] as const,
  tilt: 0,
  width: 1.54,
  height: 1.02,
};
const SCREEN_ASPECT = SCREEN.width / SCREEN.height;
/**
 * The glass's outline (its edge vertices, clockwise from the top middle). It's
 * barrel-shaped, so the DOM screen is clipped to it; a plain rectangle covers
 * the bezel's top lip and leaves a gap at the bottom, which reads as the
 * screen sitting too high.
 */
const GLASS_OUTLINE: [number, number][] = [
  [-0.3479, 0.6051], [-0.0126, 0.5938], [0.314, 0.5608], [0.3537, 0.5439],
  [0.3715, 0.5062], [0.4136, 0.3151], [0.4222, 0.0959], [0.4136, -0.1234],
  [0.3715, -0.3145], [0.3537, -0.3521], [0.314, -0.3691], [-0.0126, -0.402],
  [-0.3479, -0.4134], [-0.6832, -0.402], [-1.0097, -0.3691], [-1.0494, -0.3521],
  [-1.0673, -0.3145], [-1.1093, -0.1234], [-1.1179, 0.0959], [-1.1093, 0.3151],
  [-1.0673, 0.5062], [-1.0494, 0.5439], [-1.0097, 0.5608], [-0.6832, 0.5938],
];
/**
 * The bezel's front opening. The glass is set deep behind it, so when the
 * computer is turned this hides part of the glass (see the clip in `Rig`).
 */
const RIM = { left: -1.2, right: 0.504, top: 0.676, bottom: -0.486, z: 1.258 };

/** Clips a polygon to an axis-aligned rectangle (Sutherland–Hodgman). */
function clipToRect(
  poly: [number, number][],
  r: { left: number; right: number; bottom: number; top: number },
) {
  const edges: [(p: [number, number]) => boolean, (a: [number, number], b: [number, number]) => [number, number]][] = [
    [(p) => p[0] >= r.left, (a, b) => [r.left, a[1] + ((b[1] - a[1]) * (r.left - a[0])) / (b[0] - a[0])]],
    [(p) => p[0] <= r.right, (a, b) => [r.right, a[1] + ((b[1] - a[1]) * (r.right - a[0])) / (b[0] - a[0])]],
    [(p) => p[1] >= r.bottom, (a, b) => [a[0] + ((b[0] - a[0]) * (r.bottom - a[1])) / (b[1] - a[1]), r.bottom]],
    [(p) => p[1] <= r.top, (a, b) => [a[0] + ((b[0] - a[0]) * (r.top - a[1])) / (b[1] - a[1]), r.top]],
  ];
  let out = poly;
  for (const [inside, cross] of edges) {
    const input = out;
    out = [];
    for (let i = 0; i < input.length; i++) {
      const a = input[(i + input.length - 1) % input.length];
      const b = input[i];
      if (inside(b)) {
        if (!inside(a)) out.push(cross(a, b));
        out.push(b);
      } else if (inside(a)) {
        out.push(cross(a, b));
      }
    }
    if (!out.length) break;
  }
  return out;
}

/**
 * The quick-command keys fill the blank bezel right of the screen (model
 * units: centre and size of the panel, on the case's front face).
 */
const KEYS_PANEL = { center: [0.95, -0.02, 1.262] as const, width: 0.62, height: 0.86 };
const QUICK_KEYS: { label: string; cmd: string }[] = [
  { label: "about", cmd: "cat about.md" },
  { label: "work", cmd: "ls experience" },
  { label: "skills", cmd: "ls skills" },
  { label: "help", cmd: "help" },
];

/**
 * Resting camera, seen slightly from above. Its target and distance are
 * solved from the model's actual vertices across the whole idle sway (see
 * `fitRest`), so the terminal is centred and never cut off at any canvas
 * shape. `REST_WINDOW` is the part of the canvas it must fit in, in NDC
 * (-1..1); the bottom is kept clear of the CSS fade.
 */
const REST_WINDOW = { left: -0.94, right: 0.94, bottom: -0.8, top: 0.94 };
const REST_DIRECTION = new THREE.Vector3(0.06, 0.32, 1).normalize();
const REST_YAW = -0.2; // turn the computer slightly towards the page text
const MODEL_Y = -1.05;
/** Idle sway amplitudes (also used by the fit). */
const SWAY = { yaw: 0.06, pitch: 0.012, bob: 0.035 };

/**
 * Solves the resting camera target and distance so that `points` (world
 * space, already spread over the sway range) fill `REST_WINDOW`, centred.
 * Iterates because perspective makes the fit slightly non-linear.
 */
function fitRest(points: THREE.Vector3[], camera: THREE.PerspectiveCamera, out: THREE.Vector3) {
  const f = REST_DIRECTION.clone().negate();
  const r = new THREE.Vector3().crossVectors(f, new THREE.Vector3(0, 1, 0)).normalize();
  const u = new THREE.Vector3().crossVectors(r, f);
  const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  const tanH = tanV * camera.aspect;
  const win = REST_WINDOW;
  const box = new THREE.Box3().setFromPoints(points);
  box.getCenter(out);
  let dist = box.getSize(new THREE.Vector3()).length() * 2;
  const eye = new THREE.Vector3();
  const v = new THREE.Vector3();
  for (let i = 0; i < 24; i++) {
    eye.copy(out).addScaledVector(REST_DIRECTION, dist);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of points) {
      v.subVectors(p, eye);
      const z = v.dot(f);
      const x = v.dot(r) / z / tanH;
      const y = v.dot(u) / z / tanV;
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    // shift so the model's centre lands on the window's centre...
    const dx = (minX + maxX) / 2 - (win.left + win.right) / 2;
    const dy = (minY + maxY) / 2 - (win.bottom + win.top) / 2;
    out.addScaledVector(r, dx * tanH * dist).addScaledVector(u, dy * tanV * dist);
    // ...and move in/out so its larger extent just fills the window
    const s = Math.max((maxX - minX) / (win.right - win.left), (maxY - minY) / (win.top - win.bottom));
    dist *= s;
  }
  return dist;
}

/** Every mesh vertex of the model, in the model group's own (unrotated) space. */
function collectHull(model: THREE.Object3D) {
  model.updateMatrixWorld(true);
  const toModel = model.matrixWorld.clone().invert();
  const points: THREE.Vector3[] = [];
  model.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    const pos = mesh.isMesh ? mesh.geometry.getAttribute("position") : null;
    if (!pos) return;
    const m = mesh.matrixWorld.clone().premultiply(toModel);
    for (let i = 0; i < pos.count; i++) {
      points.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(m));
    }
  });
  return points;
}

/** The hull in world space at both ends of the idle yaw and bob. */
function swayedPoints(hull: THREE.Vector3[]) {
  const out: THREE.Vector3[] = [];
  const m = new THREE.Matrix4();
  for (const yaw of [REST_YAW - SWAY.yaw, REST_YAW + SWAY.yaw]) {
    for (const bob of [-SWAY.bob, SWAY.bob]) {
      m.makeRotationY(yaw).setPosition(0, MODEL_Y + bob, 0);
      for (const p of hull) out.push(p.clone().applyMatrix4(m));
    }
  }
  return out;
}

/** How much of the canvas the screen fills when focused (1 = edge to edge). */
const FOCUS_MARGIN = 1.2;

const MODEL_NAME = "hero-computer";
const SCREEN_NAME = "hero-computer-screen";
const KEYS_NAME = "hero-computer-keys";

type Point = [number, number];

/**
 * A CSS `matrix3d` that maps a `w`×`h` element (transform-origin at its top
 * left) exactly onto the quad `p` (top-left, top-right, bottom-right,
 * bottom-left, in px). It's a projective (homography) transform, so the
 * element gets the same perspective as the 3D surface it's pinned to.
 */
function quadToMatrix3d(w: number, h: number, [p0, p1, p2, p3]: Point[]) {
  const dx1 = p1[0] - p2[0], dx2 = p3[0] - p2[0], dx3 = p0[0] - p1[0] + p2[0] - p3[0];
  const dy1 = p1[1] - p2[1], dy2 = p3[1] - p2[1], dy3 = p0[1] - p1[1] + p2[1] - p3[1];
  const det = dx1 * dy2 - dx2 * dy1;
  const g = (dx3 * dy2 - dx2 * dy3) / det;
  const k = (dx1 * dy3 - dx3 * dy1) / det;
  const a = (p1[0] - p0[0] + g * p1[0]) / w, b = (p3[0] - p0[0] + k * p3[0]) / h;
  const d = (p1[1] - p0[1] + g * p1[1]) / w, e = (p3[1] - p0[1] + k * p3[1]) / h;
  const m = [a, d, 0, g / w, b, e, 0, k / h, 0, 0, 1, 0, p0[0], p0[1], 0, 1];
  return `matrix3d(${m.map((v) => +v.toFixed(9)).join(",")})`;
}

/**
 * Touch devices, focused: the quick keys are out of frame, so command chips
 * overlay the bottom of the canvas instead.
 */
const CHIPS_INSET_PX = 44;

const MOBILE_COMMANDS = ["neofetch", "ls", "cat about.md", "ls experience", "help", "clear"];

useGLTF.preload(MODEL_URL);

function hasWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * R3F's `fallback` prop only renders for browsers without <canvas> at all;
 * when WebGL context creation fails, <Canvas> throws. Catch that here and
 * show the flat poster instead of taking the hero down.
 */
class WebGLBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/* ----------------------------------------------------------------- hooks -- */

function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", cb);
      return () => mql.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

function useElementSize(ref: React.RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize((s) => (s.width === width && s.height === height ? s : { width, height }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

function useInView(ref: React.RefObject<HTMLElement | null>) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.05,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return inView;
}

/* ----------------------------------------------------------------- scene -- */

interface DragState {
  active: boolean;
  lastX: number;
  lastY: number;
  /** target tilt (radians) */
  x: number;
  y: number;
}

const fitDistance = (w: number, h: number, camera: THREE.PerspectiveCamera) => {
  const vfov = THREE.MathUtils.degToRad(camera.fov);
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
  return Math.max(w / 2 / Math.tan(hfov / 2), h / 2 / Math.tan(vfov / 2));
};

/**
 * Drives every animated transform (camera fly-in, idle sway, drag tilt).
 * It's mounted before the model, and pins the DOM layers after moving the
 * camera in the same frame, which keeps them glued to the 3D monitor.
 */
function Rig({
  focused,
  reducedMotion,
  drag,
  insetBottom,
  screenEl,
  screenHost,
  keysHost,
}: {
  focused: boolean;
  reducedMotion: boolean;
  drag: React.RefObject<DragState>;
  /** CSS px at the bottom of the canvas covered by UI (the touch chips). */
  insetBottom: number;
  /** The DOM screen, clipped to the visible glass every frame. */
  screenEl: React.RefObject<HTMLDivElement | null>;
  /** DOM layers pinned onto the screen and the keys panel every frame. */
  screenHost: React.RefObject<HTMLDivElement | null>;
  keysHost: React.RefObject<HTMLDivElement | null>;
}) {
  const state = useRef({
      keys: null as THREE.Object3D | null,
      corner: new THREE.Vector3(),
      look: new THREE.Vector3(),
      eye: new THREE.Vector3(),
      clip: "",
      /** model vertices in the model group's own space, for the rest fit */
      hull: null as THREE.Vector3[] | null,
      restKey: "",
      restTarget: new THREE.Vector3(),
      restDist: 10,
      pos: new THREE.Vector3(),
      target: new THREE.Vector3(),
      normal: new THREE.Vector3(),
      quat: new THREE.Quaternion(),
      scale: new THREE.Vector3(),
      tilt: new THREE.Vector2(),
      up: new THREE.Vector3(),
      sway: reducedMotion ? 0 : 1,
      first: true,
    model: null as THREE.Object3D | null,
    screen: null as THREE.Object3D | null,
  });

  useFrame((three, rawDelta) => {
    const s = state.current;
    const delta = Math.min(rawDelta, 0.1);
    const camera = three.camera as THREE.PerspectiveCamera;
    const t = three.clock.elapsedTime;
    s.model ??= three.scene.getObjectByName(MODEL_NAME) ?? null;
    s.screen ??= three.scene.getObjectByName(SCREEN_NAME) ?? null;
    s.keys ??= three.scene.getObjectByName(KEYS_NAME) ?? null;
    const g = s.model;
    if (!g) return;

    // Re-solve the resting framing whenever the canvas changes shape.
    const restKey = `${three.size.width}x${three.size.height}`;
    if (restKey !== s.restKey) {
      s.hull ??= collectHull(g);
      if (s.hull.length) {
        s.restDist = fitRest(swayedPoints(s.hull), camera, s.restTarget);
        s.restKey = restKey;
      }
    }

    // idle sway + drag tilt
    const ease = (speed: number) => 1 - Math.exp(-delta * speed);
    s.sway = THREE.MathUtils.lerp(s.sway, focused || reducedMotion ? 0 : 1, ease(3));
    const d = drag.current;
    const tx = focused ? 0 : d.x;
    const ty = focused ? 0 : d.y;
    s.tilt.x = THREE.MathUtils.lerp(s.tilt.x, tx, ease(d.active ? 14 : 5));
    s.tilt.y = THREE.MathUtils.lerp(s.tilt.y, ty, ease(d.active ? 14 : 5));
    g.rotation.y = REST_YAW + s.tilt.y + Math.sin(t * 0.45) * SWAY.yaw * s.sway;
    g.rotation.x = s.tilt.x + Math.sin(t * 0.7) * SWAY.pitch * s.sway;
    g.position.y = MODEL_Y + Math.sin(t * 0.9) * SWAY.bob * s.sway;
    g.updateMatrixWorld(true);

    // camera: rest framing, or square-on to the screen when focused
    if (focused && s.screen) {
      s.screen.getWorldPosition(s.target);
      s.screen.getWorldQuaternion(s.quat);
      s.screen.getWorldScale(s.scale);
      s.normal.set(0, 0, 1).applyQuaternion(s.quat);
      // Fit the screen into the canvas area above `insetBottom`, then shift the
      // view so the screen is centred in that area rather than the full canvas.
      const H = three.size.height;
      const free = Math.max(H - insetBottom, 1) / H;
      const w = SCREEN.width * s.scale.x;
      const h = SCREEN.height * s.scale.y;
      const dist = Math.max(fitDistance(w, 0, camera), fitDistance(0, h / free, camera)) * FOCUS_MARGIN;
      s.pos.copy(s.target).addScaledVector(s.normal, dist);
      if (insetBottom > 0) {
        const worldPerPx = (2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) / H;
        s.up.set(0, 1, 0).addScaledVector(s.normal, -s.normal.y).normalize();
        const shift = (insetBottom / 2) * worldPerPx;
        s.pos.addScaledVector(s.up, -shift);
        s.target.addScaledVector(s.up, -shift);
      }
    } else {
      s.target.copy(s.restTarget);
      s.pos.copy(s.restTarget).addScaledVector(REST_DIRECTION, s.restDist);
    }

    const k = s.first || reducedMotion ? 1 : ease(4.5);
    s.first = false;
    camera.position.lerp(s.pos, k);
    s.look.lerp(s.target, k);
    camera.lookAt(s.look);
    camera.updateMatrixWorld();

    // Pin the DOM layers onto their 3D surfaces: project each surface's corners
    // with the same camera that draws the canvas and map the element onto that
    // quad. Everything stays in canvas px, so it lines up to the pixel (drei's
    // <Html transform> builds a CSS 3D camera in scene units instead, which
    // the browser paints several px off at this scale).
    const pin = (host: HTMLElement | null, anchor: THREE.Object3D | null, w: number, h: number) => {
      if (!host || !anchor) return;
      const pw = parseFloat(host.style.width);
      const ph = parseFloat(host.style.height);
      if (!pw || !ph) return;
      const quad = ([[-1, 1], [1, 1], [1, -1], [-1, -1]] as const).map(([sx, sy]): Point => {
        s.corner.set((sx * w) / 2, (sy * h) / 2, 0);
        anchor.localToWorld(s.corner).project(camera);
        return [((s.corner.x + 1) / 2) * three.size.width, ((1 - s.corner.y) / 2) * three.size.height];
      });
      host.style.setProperty("transform", quadToMatrix3d(pw, ph, quad));
    };
    pin(screenHost.current, s.screen, SCREEN.width, SCREEN.height);
    pin(keysHost.current, s.keys, KEYS_PANEL.width, KEYS_PANEL.height);

    // The DOM screen is drawn over the canvas, so the 3D bezel can't hide it.
    // Clip it to what's actually visible of the glass instead: its barrel
    // outline, minus whatever the bezel's front opening hides from the camera.
    // The opening is parallel to the glass, so seen from the camera it lands
    // on the glass's plane as a plain rectangle.
    const el = screenEl.current;
    if (el && s.screen) {
      s.eye.copy(camera.position);
      s.screen.worldToLocal(s.eye);
      const depth = RIM.z - SCREEN.center[2];
      const k = s.eye.z / (s.eye.z - depth);
      const onGlass = (x: number, y: number): [number, number] => [
        s.eye.x + (x - SCREEN.center[0] - s.eye.x) * k + SCREEN.center[0],
        s.eye.y + (y - SCREEN.center[1] - s.eye.y) * k + SCREEN.center[1],
      ];
      const [left, top] = onGlass(RIM.left, RIM.top);
      const [right, bottom] = onGlass(RIM.right, RIM.bottom);
      const visible = clipToRect(GLASS_OUTLINE, { left, right, bottom, top });
      const pct = ([x, y]: [number, number]) =>
        `${(((x - SCREEN.center[0]) / SCREEN.width + 0.5) * 100).toFixed(2)}% ${((0.5 - (y - SCREEN.center[1]) / SCREEN.height) * 100).toFixed(2)}%`;
      const clip = visible.length ? `polygon(${visible.map(pct).join(", ")})` : "inset(50%)";
      if (clip !== s.clip) {
        el.style.setProperty("clip-path", clip);
        s.clip = clip;
      }
    }
  });

  return null;
}

type ScreenProps = Omit<TerminalProps, "width" | "height" | "fontSize">;

/**
 * A column of chunky keys moulded into the bezel. Sized in em off the panel
 * width, so it scales with the model like the screen does.
 */
function QuickKeys({
  ref,
  width,
  height,
  onKey,
}: {
  ref: React.RefObject<HTMLDivElement | null>;
  width: number;
  height: number;
  onKey: (cmd: string) => void;
}) {
  return (
    <div
      ref={ref}
      className="flex flex-col justify-center gap-[0.45em] px-[0.5em] font-mono select-none"
      style={{ width, height, fontSize: width * 0.13 }}
      // keep presses away from the drag-to-tilt handler on the canvas
      onPointerDown={(e) => e.stopPropagation()}
    >
      <span className="pl-[0.15em] text-[0.62em] font-bold tracking-[0.25em] text-[#6f6858] [text-shadow:0_0.06em_0_rgba(255,255,255,0.5)]">
        QUICK KEYS
      </span>
      {QUICK_KEYS.map(({ label, cmd }) => (
        <button
          key={label}
          type="button"
          onClick={() => onKey(cmd)}
          title={cmd}
          className="flex items-center gap-[0.5em] rounded-[0.3em] border-b-[0.18em] border-black/60 bg-[#24251f] px-[0.5em] py-[0.3em] text-left text-emerald-400 shadow-[0_0.1em_0.2em_rgba(0,0,0,0.35)] transition-[transform,border-width,color] hover:text-emerald-300 active:translate-y-[0.12em] active:border-b-[0.06em] outline-none focus-visible:ring-[0.12em] focus-visible:ring-emerald-400"
        >
          <span className="text-emerald-700">▸</span>
          {label}
        </button>
      ))}
    </div>
  );
}

function Computer({ onReady }: { onReady: () => void }) {
  const { scene } = useGLTF(MODEL_URL);

  useLayoutEffect(() => {
    const screenMaterial = new THREE.MeshBasicMaterial({ color: "#030806" });
    scene.traverse((obj) => {
      if (!(obj as THREE.Mesh).isMesh) return;
      const mesh = obj as THREE.Mesh;
      const material = mesh.material as THREE.MeshStandardMaterial;
      if (material.name === "screen") {
        mesh.material = screenMaterial;
        return;
      }
      // Only the front is ever seen, so skip the back faces.
      material.side = THREE.FrontSide;
    });
  }, [scene]);

  // Report ready only once a frame with the model (and the pinned DOM layers)
  // has actually been rendered, so the canvas fade-in never reveals an empty
  // scene.
  const framesRendered = useRef(0);
  useFrame(() => {
    if (framesRendered.current++ === 1) onReady();
  });

  return (
    <group name={MODEL_NAME} position={[0, MODEL_Y, 0]} rotation={[0, REST_YAW, 0]}>
      <group
        scale={MODEL_SCALE}
        position={[0, -MODEL_BOTTOM * MODEL_SCALE, -MODEL_PIVOT_Z * MODEL_SCALE]}
      >
        <primitive object={scene} />
        {/* anchors the DOM terminal and quick keys are pinned to (see Rig) */}
        <group
          name={SCREEN_NAME}
          position={[SCREEN.center[0], SCREEN.center[1], SCREEN.center[2]]}
          rotation={[SCREEN.tilt, 0, 0]}
        />
        <group
          name={KEYS_NAME}
          position={[KEYS_PANEL.center[0], KEYS_PANEL.center[1], KEYS_PANEL.center[2]]}
        />
      </group>
      {/* phosphor glow spilling onto the keyboard */}
      <pointLight
        position={[
          SCREEN.center[0] * MODEL_SCALE,
          (SCREEN.center[1] - MODEL_BOTTOM) * MODEL_SCALE,
          (RIM.z - MODEL_PIVOT_Z) * MODEL_SCALE + 0.4,
        ]}
        color="#34d399"
        intensity={3}
        distance={3.5}
        decay={2}
      />
    </group>
  );
}

/* ------------------------------------------------------------- component -- */

export default function HeroComputer({ onContact }: { onContact: () => void }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const exitRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const keysRef = useRef<HTMLDivElement>(null);
  const terminalRootRef = useRef<HTMLDivElement>(null);
  const screenHostRef = useRef<HTMLDivElement>(null);
  const keysHostRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<TerminalController>(null);
  const drag = useRef<DragState>({ active: false, lastX: 0, lastY: 0, x: 0, y: 0 });

  const [focused, setFocused] = useState(false);
  const [ready, setReady] = useState(false);
  const [webgl] = useState(hasWebGL);
  const inView = useInView(wrapperRef);
  const touch = useMediaQuery("(pointer: coarse)");
  const isMobile = useMediaQuery("(max-width: 767px)");
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const { resolvedTheme, setTheme } = useTheme();

  const onReady = useCallback(() => setReady(true), []);
  const focus = useCallback(() => setFocused(true), []);
  const blur = useCallback(() => setFocused(false), []);
  const openContact = useCallback(() => {
    setFocused(false);
    onContact();
  }, [onContact]);
  const runCommand = useCallback((cmd: string) => {
    setFocused(true);
    controllerRef.current?.run(cmd);
  }, []);

  // Leave focus mode on outside clicks / Escape anywhere.
  useEffect(() => {
    if (!focused) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      const inside = [terminalRootRef, exitRef, chipsRef, keysRef].some((r) => r.current?.contains(target));
      if (inside) return;
      setFocused(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFocused(false);
    document.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [focused]);

  // Belt and braces for browsers without `overflow: clip` (Safari < 16): if
  // anything scrolls a container of the screen (not the terminal's own log),
  // snap it back so the DOM screen stays glued to the monitor.
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const onScroll = (e: Event) => {
      const el = e.target as HTMLElement;
      const screen = terminalRootRef.current;
      if (el === wrapper || !screen || !el.contains?.(screen)) return;
      if (el.scrollTop || el.scrollLeft) {
        el.scrollTop = 0;
        el.scrollLeft = 0;
      }
    };
    wrapper.addEventListener("scroll", onScroll, true);
    return () => wrapper.removeEventListener("scroll", onScroll, true);
  }, []);

  // Drag anywhere on the canvas (outside the screen) to tilt the computer.
  const canDrag = !focused && !touch;
  const dragHandlers = {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      if (!canDrag || e.button !== 0) return;
      drag.current.active = true;
      drag.current.lastX = e.clientX;
      drag.current.lastY = e.clientY;
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
      const d = drag.current;
      if (!d.active) return;
      const rect = e.currentTarget.getBoundingClientRect();
      d.y = THREE.MathUtils.clamp(d.y + ((e.clientX - d.lastX) / rect.width) * 2.4, -0.7, 0.7);
      d.x = THREE.MathUtils.clamp(d.x + ((e.clientY - d.lastY) / rect.height) * 1.2, -0.25, 0.3);
      d.lastX = e.clientX;
      d.lastY = e.clientY;
    },
    onPointerUp: () => {
      // snap back
      Object.assign(drag.current, { active: false, x: 0, y: 0 });
    },
  };

  const insetBottom = touch ? CHIPS_INSET_PX : 0;

  // Size the DOM terminal so it's ~1:1 with screen pixels when focused
  // (crisp text). Focus fits the screen by width or by height, whichever is
  // tighter, so wide canvases don't end up with downscaled text. Touch devices
  // use a 16px font (avoids iOS zoom-on-focus) rendered a bit smaller.
  const canvasSize = useElementSize(wrapperRef);
  const fontSize = touch ? 16 : 13;
  const focusedScreenPx =
    Math.min(canvasSize.width, (canvasSize.height - insetBottom) * SCREEN_ASPECT) / FOCUS_MARGIN;
  const screenW = Math.round(THREE.MathUtils.clamp(focusedScreenPx * (touch ? 1.55 : 1), 380, 900));
  const screenH = Math.round(screenW / SCREEN_ASPECT);
  // the keys panel uses the same px-per-unit as the screen
  const keysW = Math.round((screenW * KEYS_PANEL.width) / SCREEN.width);
  const keysH = Math.round((screenW * KEYS_PANEL.height) / SCREEN.width);

  const terminal: ScreenProps = {
    focused,
    reducedMotion,
    touch,
    currentTheme: resolvedTheme,
    onRequestFocus: focus,
    onRequestBlur: blur,
    onContact: openContact,
    onSetTheme: setTheme,
    controllerRef,
    rootRef: terminalRootRef,
  };

  return (
    <div className="relative">
      <div
        ref={wrapperRef}
        className={cn(
          "relative isolate select-none",
          HERO_COMPUTER_HEIGHT,
          canDrag && "cursor-grab active:cursor-grabbing",
        )}
        {...dragHandlers}
        onPointerCancel={dragHandlers.onPointerUp}
      >
        {webgl ? (
          <WebGLBoundary fallback={<HeroComputerPoster />}>
            {/*
              Canvas + screen fade in together once the first frame is drawn;
              `hero-computer-fade` also masks out the bottom edge at rest.
            */}
            <div
              className={cn(
                "hero-computer-fade absolute inset-0",
                ready ? "opacity-100" : "opacity-0",
                focused && "is-focused",
              )}
            >
              <Canvas
                // "demand" (not "never") off-screen, so resizes still render a
                // frame and the pinned DOM layers stay in sync.
                frameloop={inView ? "always" : "demand"}
                dpr={isMobile ? [1, 1.5] : [1, 2]}
                camera={{ fov: 30, near: 0.1, far: 60, position: [0, 1, 12] }}
                gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
                shadows={false}
                style={{ touchAction: "pan-y" }}
                aria-label="Interactive 3D retro computer with a terminal on its screen"
              >
                <ambientLight intensity={0.4} />
                <hemisphereLight args={["#fff8e7", "#2a2620", 0.9]} />
                <directionalLight position={[4, 6, 5]} intensity={2.6} />
                <directionalLight position={[-5, 2, -3]} intensity={0.6} color="#7ebae4" />
                <Rig
                  focused={focused}
                  reducedMotion={reducedMotion}
                  drag={drag}
                  insetBottom={insetBottom}
                  screenEl={terminalRootRef}
                  screenHost={screenHostRef}
                  keysHost={keysHostRef}
                />
                <Suspense fallback={null}>
                  <Computer onReady={onReady} />
                </Suspense>
                <ContactShadows
                  position={[0, MODEL_Y - 0.02, 0]}
                  opacity={resolvedTheme === "dark" ? 0.6 : 0.35}
                  scale={8}
                  blur={2.4}
                  far={2}
                  resolution={256}
                />
              </Canvas>

              {/*
                DOM layers over the canvas, pinned onto the 3D screen and keys
                panel every frame by Rig (a transform from their top-left
                corner, in this box's px). `overflow: clip` rather than hidden:
                a hidden box is still scrollable from script/focus, and a
                focus/keyboard/selection auto-scroll would shift them off the
                monitor.
              */}
              {canvasSize.width > 0 && (
                <div className="pointer-events-none absolute inset-0 overflow-clip">
                  <div
                    ref={screenHostRef}
                    className="pointer-events-auto absolute left-0 top-0 origin-top-left select-text"
                    style={{ width: screenW, height: screenH }}
                  >
                    <Terminal {...terminal} width={screenW} height={screenH} fontSize={fontSize} />
                  </div>
                  {/* quick-command keys on the blank bezel right of the screen */}
                  <div
                    ref={keysHostRef}
                    className="pointer-events-auto absolute left-0 top-0 origin-top-left"
                    style={{ width: keysW, height: keysH }}
                  >
                    <QuickKeys ref={keysRef} width={keysW} height={keysH} onKey={runCommand} />
                  </div>
                </div>
              )}
            </div>
          </WebGLBoundary>
        ) : (
          <HeroComputerPoster />
        )}

        {/* touch, focused: command chips over the bottom of the canvas */}
        {touch && focused && (
          <div
            ref={chipsRef}
            className="absolute inset-x-0 bottom-0 z-30 flex items-center gap-2 overflow-x-auto px-1 py-1.5 font-mono text-xs [scrollbar-width:none] sm:justify-center"
            style={{ height: CHIPS_INSET_PX }}
          >
            {MOBILE_COMMANDS.map((cmd) => (
              <button
                key={cmd}
                type="button"
                onClick={() => runCommand(cmd)}
                className="shrink-0 rounded-full border border-emerald-500/40 bg-surface/85 px-3 py-1.5 text-emerald-600 shadow-sm backdrop-blur-sm active:bg-emerald-500/15 dark:text-emerald-400"
              >
                <span className="text-text-muted">$ </span>
                {cmd}
              </button>
            ))}
          </div>
        )}

        {focused && (
          <div ref={exitRef} className="absolute right-2 top-2 z-30">
            <button
              type="button"
              onClick={blur}
              className="flex items-center gap-1.5 rounded-full border border-border bg-surface/80 px-3 py-1.5 font-mono text-xs text-text-muted shadow-lg backdrop-blur-md transition-colors hover:text-primary"
              aria-label="Leave the terminal"
            >
              <span className="hidden sm:inline">esc</span>
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* desktop hint */}
      {!touch && (
        <div className="mt-2 min-h-8 text-center font-mono text-xs text-text-muted">
          {focused ? (
            <p>
              <span className="text-primary">esc</span> to leave · try <span className="text-primary">ls</span>,{" "}
              <span className="text-primary">cat about.md</span>, <span className="text-primary">neofetch</span>
            </p>
          ) : (
            <p>
              <span className="text-primary">▸</span> click the screen to use the terminal · drag to tilt
            </p>
          )}
        </div>
      )}
    </div>
  );
}
