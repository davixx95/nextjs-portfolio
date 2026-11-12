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
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Html, useGLTF } from "@react-three/drei";
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
 * The DOM screen sits on the plane of the glass's edge; the glass is set
 * deep into the bezel, so `RIM` (the bezel's front opening) clips it when the
 * computer is turned (see `clipToRim`).
 */
const SCREEN = {
  center: [-0.348, 0.096, 1.061] as const,
  tilt: 0,
  width: 1.54,
  height: 1.02,
};
const SCREEN_ASPECT = SCREEN.width / SCREEN.height;
const RIM = { left: -1.2, right: 0.504, top: 0.676, bottom: -0.486, z: 1.258 };

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
 * Resting camera, seen slightly from above. The fit box includes the idle
 * sway range. Wide canvases show the whole terminal, keyboard included;
 * phones frame just the monitor so the screen and the keys stay legible.
 */
const REST = {
  wide: {
    fit: { width: 3.9, height: 3.0 },
    target: new THREE.Vector3(0.0, -0.05, 0.45),
  },
  compact: {
    fit: { width: 3.2, height: 2.1 },
    target: new THREE.Vector3(-0.05, -0.2, 0.7),
  },
};
const REST_DIRECTION = new THREE.Vector3(0.06, 0.32, 1).normalize();
const REST_YAW = -0.2; // turn the computer slightly towards the page text
const MODEL_Y = -1.05;

/** How much of the canvas the screen fills when focused (1 = edge to edge). */
const FOCUS_MARGIN = 1.2;

const MODEL_NAME = "hero-computer";
const SCREEN_NAME = "hero-computer-screen";

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
 * It's mounted before the model so it runs before drei's <Html> each frame,
 * which keeps the DOM screen glued to the 3D monitor without lag.
 */
function Rig({
  focused,
  reducedMotion,
  drag,
  insetBottom,
  compact,
  screenEl,
}: {
  focused: boolean;
  reducedMotion: boolean;
  drag: React.RefObject<DragState>;
  /** CSS px at the bottom of the canvas covered by UI (the touch chips). */
  insetBottom: number;
  /** Phone-sized canvas: use the tighter resting framing. */
  compact: boolean;
  /** The DOM screen, clipped to the bezel's opening every frame. */
  screenEl: React.RefObject<HTMLDivElement | null>;
}) {
  const state = useRef({
      look: REST.wide.target.clone(),
      eye: new THREE.Vector3(),
      clip: "",
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
    const g = s.model;
    if (!g) return;

    // idle sway + drag tilt
    const ease = (speed: number) => 1 - Math.exp(-delta * speed);
    s.sway = THREE.MathUtils.lerp(s.sway, focused || reducedMotion ? 0 : 1, ease(3));
    const d = drag.current;
    const tx = focused ? 0 : d.x;
    const ty = focused ? 0 : d.y;
    s.tilt.x = THREE.MathUtils.lerp(s.tilt.x, tx, ease(d.active ? 14 : 5));
    s.tilt.y = THREE.MathUtils.lerp(s.tilt.y, ty, ease(d.active ? 14 : 5));
    g.rotation.y = REST_YAW + s.tilt.y + Math.sin(t * 0.45) * 0.06 * s.sway;
    g.rotation.x = s.tilt.x + Math.sin(t * 0.7) * 0.012 * s.sway;
    g.position.y = MODEL_Y + Math.sin(t * 0.9) * 0.035 * s.sway;
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
      const rest = compact ? REST.compact : REST.wide;
      s.target.copy(rest.target);
      const dist = fitDistance(rest.fit.width, rest.fit.height, camera);
      s.pos.copy(rest.target).addScaledVector(REST_DIRECTION, dist);
    }

    const k = s.first || reducedMotion ? 1 : ease(4.5);
    s.first = false;
    camera.position.lerp(s.pos, k);
    s.look.lerp(s.target, k);
    camera.lookAt(s.look);
    camera.updateMatrixWorld();

    // The glass sits deep inside the bezel, but the DOM screen is drawn over
    // the canvas, so the 3D bezel can't hide it. Instead, project the bezel's
    // front opening onto the screen's plane (from the camera) and clip the DOM
    // screen to it: turning the computer then hides the far edge.
    const el = screenEl.current;
    if (el && s.screen) {
      s.eye.copy(camera.position);
      s.screen.worldToLocal(s.eye);
      const depth = RIM.z - SCREEN.center[2];
      const k = s.eye.z / (s.eye.z - depth);
      const pt = (x: number, y: number) => {
        const lx = s.eye.x + (x - SCREEN.center[0] - s.eye.x) * k;
        const ly = s.eye.y + (y - SCREEN.center[1] - s.eye.y) * k;
        const u = (lx / SCREEN.width + 0.5) * 100;
        const v = (0.5 - ly / SCREEN.height) * 100;
        return `${u.toFixed(2)}% ${v.toFixed(2)}%`;
      };
      const clip = `polygon(${pt(RIM.left, RIM.top)}, ${pt(RIM.right, RIM.top)}, ${pt(RIM.right, RIM.bottom)}, ${pt(RIM.left, RIM.bottom)})`;
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

function Computer({
  onReady,
  terminal,
  portal,
  insetBottom,
  keysRef,
  onQuickKey,
}: {
  onReady: () => void;
  terminal: ScreenProps;
  insetBottom: number;
  /** Stable DOM container for the <Html> screen (see HeroComputer). */
  portal: React.RefObject<HTMLDivElement | null>;
  keysRef: React.RefObject<HTMLDivElement | null>;
  onQuickKey: (cmd: string) => void;
}) {
  const { scene } = useGLTF(MODEL_URL);
  const size = useThree((st) => st.size);

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

  // Report ready only once a frame with the model (and the <Html> screen) has
  // actually been rendered, so the canvas fade-in never reveals an empty scene.
  const framesRendered = useRef(0);
  useFrame(() => {
    if (framesRendered.current++ === 1) onReady();
  });

  // Size the DOM terminal so it's ~1:1 with screen pixels when focused
  // (crisp text). Focus fits the screen by width or by height, whichever is
  // tighter, so wide canvases don't end up with downscaled text. Touch devices
  // use a 16px font (avoids iOS zoom-on-focus) rendered a bit smaller.
  const touch = terminal.touch;
  const fontSize = touch ? 16 : 13;
  const focusedScreenPx =
    Math.min(size.width, (size.height - insetBottom) * SCREEN_ASPECT) / FOCUS_MARGIN;
  const width = Math.round(
    THREE.MathUtils.clamp(focusedScreenPx * (touch ? 1.55 : 1), 380, 900),
  );
  const height = Math.round(width / SCREEN_ASPECT);

  return (
    <group name={MODEL_NAME} position={[0, MODEL_Y, 0]} rotation={[0, REST_YAW, 0]}>
      <group
        scale={MODEL_SCALE}
        position={[0, -MODEL_BOTTOM * MODEL_SCALE, -MODEL_PIVOT_Z * MODEL_SCALE]}
      >
        <primitive object={scene} />
        <group
          name={SCREEN_NAME}
          position={[SCREEN.center[0], SCREEN.center[1], SCREEN.center[2]]}
          rotation={[SCREEN.tilt, 0, 0]}
        >
          <Html
            portal={portal as React.RefObject<HTMLElement>}
            // drei's wrapper is `overflow: hidden`, which is still scrollable
            // from script/focus: the 3D plane's bounding box is far larger than
            // the canvas, so a focus/keyboard/selection auto-scroll would shift
            // the whole DOM screen off the monitor. `clip` can't scroll at all.
            wrapperClass="overflow-clip!"
            transform
            distanceFactor={(SCREEN.width * 400) / width}
            zIndexRange={[20, 0]}
            style={{ userSelect: "text" }}
          >
            <Terminal {...terminal} width={width} height={height} fontSize={fontSize} />
          </Html>
        </group>
        {/* quick-command keys on the blank bezel right of the screen */}
        <group position={[KEYS_PANEL.center[0], KEYS_PANEL.center[1], KEYS_PANEL.center[2]]}>
          <Html
            portal={portal as React.RefObject<HTMLElement>}
            wrapperClass="overflow-clip!"
            transform
            // same px-per-unit as the screen
            distanceFactor={(SCREEN.width * 400) / width}
            zIndexRange={[20, 0]}
          >
            <QuickKeys
              ref={keysRef}
              width={Math.round((width * KEYS_PANEL.width) / SCREEN.width)}
              height={Math.round((width * KEYS_PANEL.height) / SCREEN.width)}
              onKey={onQuickKey}
            />
          </Html>
        </group>
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
  const htmlPortalRef = useRef<HTMLDivElement>(null);
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
                // frame and the <Html> screen's transform stays in sync.
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
                  compact={isMobile}
                  screenEl={terminalRootRef}
                />
                <Suspense fallback={null}>
                  <Computer
                    onReady={onReady}
                    terminal={terminal}
                    portal={htmlPortalRef}
                    insetBottom={insetBottom}
                    keysRef={keysRef}
                    onQuickKey={runCommand}
                  />
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
                Fixed mount point for the <Html> screen. Without it drei picks
                `events.connected || gl.domElement.parentNode`, which changes once R3F
                connects its events after the first render; drei then unmounts and
                re-creates the screen's React root mid-commit ("Attempted to
                synchronously unmount a root...") and can leave it empty. It must
                cover exactly the canvas box, since drei positions from its corner.
              */}
              <div ref={htmlPortalRef} className="pointer-events-none absolute inset-0" />
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
