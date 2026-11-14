"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { buildFs, formatPath } from "./fs";
import { complete, execute, ShellContext, Clickable } from "./commands";
import { MACHINE } from "./Neofetch";

export type TerminalMode = "photo" | "booting" | "shell";

export interface TerminalController {
  /** Run a command line, booting instantly first if needed. */
  run: (line: string) => void;
  boot: () => void;
}

export interface TerminalProps {
  width: number;
  height: number;
  fontSize: number;
  focused: boolean;
  reducedMotion: boolean;
  /** Touch devices: don't pop the on-screen keyboard unless the input is tapped. */
  touch: boolean;
  currentTheme?: string;
  onRequestFocus: () => void;
  onRequestBlur: () => void;
  onContact: () => void;
  onSetTheme: (theme: "dark" | "light") => void;
  controllerRef: React.RefObject<TerminalController | null>;
  rootRef: React.RefObject<HTMLDivElement | null>;
}

interface Line {
  id: number;
  node: React.ReactNode;
}

const MAX_LINES = 300;

/**
 * The text area, inset from the screen's edges (in % of its size) so it
 * stays inside the glass. HeroComputer clips the screen to the glass's
 * barrel-shaped outline, which curves in by up to ~4.5% at the sides and
 * ~6% at the top and bottom near the corners; text at the old 1em padding
 * ran under the curve.
 */
const GLASS_SAFE: React.CSSProperties = {
  top: "7%",
  bottom: "7%",
  left: "5.5%",
  right: "5%",
};

const BOOT_LINES: [string, string][] = [
  ["dim", "<<< NixOS Stage 1 >>>"],
  ["dim", "loading module dm_mod..."],
  ["dim", "running udev..."],
  ["dim", "mounting /mnt-root..."],
  ["dim", "<<< NixOS Stage 2 >>>"],
  ["ok", "Started Journal Service."],
  ["ok", "Reached target Local File Systems."],
  ["ok", "Started Network Manager."],
  ["ok", "Mounted /home/davide/experience."],
  ["ok", "Started Home Manager environment for davide."],
  ["ok", "Started portfolio.service - Davide's Portfolio."],
  ["ok", "Reached target Graphical Interface."],
  ["plain", ""],
  ["plain", `${MACHINE.host} login: ${MACHINE.user} (automatic login)`],
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function Prompt({ cwd }: { cwd: string[] }) {
  return (
    <span className="shrink-0 whitespace-pre">
      <span className="font-bold text-emerald-300">
        {MACHINE.user}@{MACHINE.host}
      </span>{" "}
      <span className="text-[#7ebae4]">{formatPath(cwd)}</span>
      <span className="text-emerald-200"> $ </span>
    </span>
  );
}

function BootLine({ kind, text }: { kind: string; text: string }) {
  if (kind === "ok")
    return (
      <div className="whitespace-pre">
        <span className="text-emerald-200">[ </span>
        <span className="font-bold text-emerald-400">OK</span>
        <span className="text-emerald-200"> ] </span>
        {text}
      </div>
    );
  if (kind === "dim") return <div className="text-emerald-600">{text}</div>;
  return <div className="whitespace-pre">{text || " "}</div>;
}

export function Terminal({
  width,
  height,
  fontSize,
  focused,
  reducedMotion,
  touch,
  currentTheme,
  onRequestFocus,
  onRequestBlur,
  onContact,
  onSetTheme,
  controllerRef,
  rootRef,
}: TerminalProps) {
  const fs = useMemo(() => buildFs(), []);

  const [mode, setMode] = useState<TerminalMode>("photo");
  const [lines, setLines] = useState<Line[]>([]);
  const [input, setInput] = useState("");
  const [cwd, setCwd] = useState<string[]>([]);
  const [promptVisible, setPromptVisible] = useState(true);

  // mirrors `mode` synchronously for async sequences and imperative calls
  const modeRef = useRef<TerminalMode>("photo");
  const setModeSync = useCallback((m: TerminalMode) => {
    modeRef.current = m;
    setMode(m);
  }, []);
  const cwdRef = useRef<string[]>([]);
  const historyRef = useRef<string[]>([]);
  const historyIdx = useRef<number | null>(null);
  const lineId = useRef(0);
  const bootRun = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Latest props for async sequences / callbacks handed to other roots.
  const props = useRef({
    reducedMotion,
    currentTheme,
    onContact,
    onSetTheme,
    onRequestBlur,
  });
  useLayoutEffect(() => {
    props.current = {
      reducedMotion,
      currentTheme,
      onContact,
      onSetTheme,
      onRequestBlur,
    };
  });

  const push = useCallback((...nodes: React.ReactNode[]) => {
    setLines((prev) => {
      const next = [
        ...prev,
        ...nodes.map((node) => ({ id: ++lineId.current, node })),
      ];
      return next.length > MAX_LINES ? next.slice(-MAX_LINES) : next;
    });
  }, []);

  const runLineRef = useRef<(line: string) => void>(() => {});

  const runLine = useCallback(
    (line: string) => {
      const trimmed = line.trim();
      const echo = (
        <div className="flex">
          <Prompt cwd={cwdRef.current} />
          <span className="whitespace-pre-wrap break-all">{line}</span>
        </div>
      );
      if (trimmed) {
        historyRef.current = [...historyRef.current, trimmed].slice(-100);
      }
      historyIdx.current = null;

      let cleared = false;
      let exited = false;
      const ctx: ShellContext = {
        fs,
        cwd: cwdRef.current,
        history: historyRef.current,
        clear: () => {
          cleared = true;
        },
        run: (l) => runLineRef.current(l),
        exit: () => {
          exited = true;
        },
        onContact: () => props.current.onContact(),
        setTheme: (t) => props.current.onSetTheme(t),
        currentTheme: props.current.currentTheme,
      };

      const outputs = trimmed ? execute(trimmed, ctx) : [];
      cwdRef.current = ctx.cwd;
      setCwd(ctx.cwd);

      if (exited) {
        bootRun.current++;
        setLines([]);
        setInput("");
        setModeSync("photo");
        props.current.onRequestBlur();
        return;
      }
      if (cleared) {
        setLines(outputs.map((node) => ({ id: ++lineId.current, node })));
        return;
      }
      push(echo, ...outputs);
    },
    [fs, push, setModeSync],
  );
  useLayoutEffect(() => {
    runLineRef.current = runLine;
  }, [runLine]);

  const showWelcome = useCallback(() => {
    setLines([]);
    push(
      <div className="text-emerald-600">
        Last login: {new Date().toDateString()} on tty1
      </div>,
    );
    runLineRef.current("neofetch");
    push(
      <div className="text-emerald-500">
        type{" "}
        <Clickable
          className="text-amber-300"
          onClick={() => runLineRef.current("help")}
        >
          help
        </Clickable>{" "}
        to get started, or{" "}
        <Clickable
          className="text-amber-300"
          onClick={() => runLineRef.current("ls")}
        >
          ls
        </Clickable>{" "}
        to look around.
      </div>,
    );
    setInput("");
    setPromptVisible(true);
    setModeSync("shell");
  }, [push, setModeSync]);

  /** photo → booting → shell. `instant` skips straight to the shell. */
  const boot = useCallback(
    async (instant = false) => {
      if (modeRef.current !== "photo") return;
      const run = ++bootRun.current;
      const alive = () => bootRun.current === run;

      if (instant || props.current.reducedMotion) {
        showWelcome();
        return;
      }

      setModeSync("booting");
      setPromptVisible(false);
      setLines([]);
      for (const [kind, text] of BOOT_LINES) {
        if (!alive()) return;
        push(<BootLine kind={kind} text={text} />);
        await sleep(45 + Math.random() * 70);
      }
      await sleep(450);
      if (!alive()) return;

      // "type" neofetch at a fresh prompt
      setLines([]);
      push(
        <div className="text-emerald-600">
          Last login: {new Date().toDateString()} on tty1
        </div>,
      );
      setPromptVisible(true);
      const cmd = "neofetch";
      for (let i = 1; i <= cmd.length; i++) {
        if (!alive()) return;
        setInput(cmd.slice(0, i));
        await sleep(70 + Math.random() * 60);
      }
      await sleep(250);
      if (!alive()) return;
      setInput("");
      // reuse the instant path for the actual output (minus the duplicate header)
      setLines([]);
      showWelcome();
    },
    [push, showWelcome, setModeSync],
  );

  const skipBoot = useCallback(() => {
    if (modeRef.current === "booting") {
      bootRun.current++;
      showWelcome();
    } else if (modeRef.current === "photo") {
      boot(true);
    }
  }, [boot, showWelcome]);

  // Imperative API for the mobile command chips.
  useEffect(() => {
    controllerRef.current = {
      run: (line) => {
        if (modeRef.current !== "shell") skipBoot();
        runLineRef.current(line);
      },
      boot: () => boot(),
    };
  }, [boot, skipBoot, controllerRef]);

  // Cancel any running boot sequence on unmount.
  useEffect(() => () => void bootRun.current++, []);

  // Keep the newest output in view.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, mode]);

  const focusInput = useCallback(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (!focused) {
      inputRef.current?.blur();
      if (document.activeElement === rootRef.current) rootRef.current?.blur();
      return;
    }
    if (touch) return;
    if (mode === "shell") focusInput();
    else rootRef.current?.focus({ preventScroll: true });
  }, [focused, mode, touch, focusInput, rootRef]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onRequestBlur();
      return;
    }
    if (mode === "booting") {
      e.preventDefault();
      skipBoot();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      runLine(input);
      setInput("");
    } else if (e.key === "Tab") {
      e.preventDefault();
      const { value, options } = complete(input, { fs, cwd: cwdRef.current });
      if (options.length) {
        push(
          <div className="flex">
            <Prompt cwd={cwdRef.current} />
            <span className="whitespace-pre">{input}</span>
          </div>,
          <div className="flex flex-wrap gap-x-[3ch] text-emerald-300">
            {options.map((o) => (
              <span key={o}>{o}</span>
            ))}
          </div>,
        );
      }
      setInput(value);
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const history = historyRef.current;
      if (!history.length) return;
      let idx = historyIdx.current;
      if (e.key === "ArrowUp")
        idx = idx === null ? history.length - 1 : Math.max(0, idx - 1);
      else
        idx = idx === null ? null : idx + 1 >= history.length ? null : idx + 1;
      historyIdx.current = idx;
      setInput(idx === null ? "" : history[idx]);
    } else if (e.ctrlKey && e.key.toLowerCase() === "l") {
      e.preventDefault();
      setLines([]);
    } else if (e.ctrlKey && e.key.toLowerCase() === "c") {
      if (window.getSelection()?.toString()) return; // allow copying
      e.preventDefault();
      push(
        <div className="flex">
          <Prompt cwd={cwdRef.current} />
          <span className="whitespace-pre">{input}^C</span>
        </div>,
      );
      setInput("");
    }
  };

  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <div
      ref={rootRef}
      className="crt-screen relative overflow-clip rounded-[14px] bg-[#030806] font-mono text-emerald-400 antialiased outline-none"
      style={{ width, height, fontSize, lineHeight: 1.45 }}
      tabIndex={-1}
      onKeyDown={(e) => {
        // The input handles keys in shell mode; this covers photo/boot screens.
        if (mode === "shell") return;
        if (e.key === "Escape") return onRequestBlur();
        if (e.metaKey || e.altKey || e.key === "Tab" || e.key === "Shift")
          return;
        e.preventDefault();
        if (mode === "photo") boot();
        else skipBoot();
      }}
      // Keep pointer events away from the 3D scene behind the screen
      // (otherwise drags here would also rotate the computer).
      onPointerMove={stop}
      onPointerUp={stop}
      onPointerDown={(e) => {
        e.stopPropagation();
        if (!focused) onRequestFocus();
      }}
      onClick={(e) => {
        if (mode === "photo") {
          boot();
          return;
        }
        if (mode === "booting") {
          skipBoot();
          return;
        }
        const selecting = !!window.getSelection()?.toString();
        if (!selecting && (!touch || e.target === inputRef.current))
          focusInput();
      }}
    >
      {mode === "photo" ? (
        <div className="absolute inset-0">
          <Image
            src="/headshot.webp"
            alt="Davide Fedele"
            fill
            sizes="640px"
            className="object-cover object-[50%_35%] contrast-110 saturate-[0.85]"
          />
          <div className="absolute inset-0 bg-emerald-500/15 mix-blend-color" />
          {/* Padding in % of the screen width keeps the caption inside the
              glass's curved corners (see GLASS_SAFE below). */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-[6.5%] pb-[5.5%] pt-[3em]">
            <div className="font-bold tracking-wide text-emerald-300">
              DAVIDE FEDELE
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRequestFocus();
                boot();
              }}
              className="mt-0.5 text-emerald-400 outline-none focus-visible:underline"
            >
              ▶ press to boot <span className="crt-blink">█</span>
            </button>
          </div>
        </div>
      ) : (
        <div
          ref={scrollRef}
          role="log"
          aria-live="polite"
          aria-label="Terminal output"
          className={cn(
            "crt-scroll absolute px-[0.4em] py-[0.2em]",
            focused ? "overflow-y-auto overscroll-contain" : "overflow-hidden",
          )}
          style={GLASS_SAFE}
        >
          {lines.map((l) => (
            <div key={l.id} className="break-words">
              {l.node}
            </div>
          ))}
          <div className={cn("flex", !promptVisible && "hidden")}>
            <Prompt cwd={cwd} />
            <input
              ref={inputRef}
              value={input}
              readOnly={mode !== "shell"}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              aria-label="Terminal input. Type help for a list of commands."
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="send"
              className="min-w-0 flex-1 border-0 bg-transparent p-0 text-emerald-300 caret-emerald-300 outline-none"
              style={{ fontSize: "inherit", lineHeight: "inherit" }}
            />
          </div>
        </div>
      )}

      {/* CRT overlays */}
      <div
        aria-hidden
        className="crt-scanlines pointer-events-none absolute inset-0"
      />
      <div
        aria-hidden
        className="crt-flicker pointer-events-none absolute inset-0"
      />
      <div
        aria-hidden
        className="crt-vignette pointer-events-none absolute inset-0"
      />
    </div>
  );
}
