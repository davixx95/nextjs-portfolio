import React from "react";
import experienceData from "@/data/experience.json";
import stackData from "@/data/stack.json";
import { WorkExperience } from "@/types";

/** Facts about the machine shown in `neofetch` / `uname`. Edit freely. */
export const MACHINE = {
  user: "davide",
  host: "nixos",
  os: "NixOS 26.11 x86_64",
  kernel: "6.18.60",
  shell: "zsh",
};

export const CAREER_START_YEAR = 2022;

// neofetch's "nixos_small" logo
const LOGO = String.raw`  \\  \\ //
 ==\\__\\/ //
   //   \\//
==//     //==
 //\\___//
// /\\  \\==
  // \\  \\`;

const NIX_LIGHT = "#7ebae4";
const NIX_DARK = "#5277c3";

function Logo() {
  return (
    <pre
      aria-hidden
      className="m-0 leading-[1.35] [text-shadow:none] font-bold"
    >
      {LOGO.split("").map((ch, i) =>
        ch === "\\" ? (
          <span key={i} style={{ color: NIX_LIGHT }}>
            {ch}
          </span>
        ) : ch === "/" || ch === "=" || ch === "_" ? (
          <span key={i} style={{ color: NIX_DARK }}>
            {ch}
          </span>
        ) : (
          ch
        ),
      )}
    </pre>
  );
}

const PALETTE = [
  "#1f2937",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#5277c3",
  "#a855f7",
  "#7ebae4",
  "#e5e7eb",
];

export function Neofetch() {
  const experiences = experienceData as WorkExperience[];
  const current = experiences.find((e) => e.isCurrent);
  const years = new Date().getFullYear() - CAREER_START_YEAR;
  const companies = [...experiences]
    .reverse()
    .map((e) => e.company.split(" ")[0]);

  const rows: [string, string][] = [
    ["OS", MACHINE.os],
    ["Kernel", MACHINE.kernel],
    ["Uptime", `${years}+ years shipping React`],
    ["Shell", MACHINE.shell],
    [
      "Role",
      current ? `${current.role} @ ${current.company}` : "Front End Developer",
    ],
    ["Focus", "Enterprise web apps"],
    ["History", companies.join(" → ")],
    ["Location", "Rome, Italy (Remote)"],
    ["Stack", (stackData as string[]).join(", ")],
  ];

  const title = `${MACHINE.user}@${MACHINE.host}`;

  return (
    // Logo and info always side by side, as in real neofetch: the info
    // column wraps its own lines instead of dropping below the logo.
    <div className="flex items-start gap-x-[1.5ch] py-1">
      <div className="shrink-0">
        <Logo />
      </div>
      <div className="min-w-0 flex-1">
        <div>
          <span className="font-bold" style={{ color: NIX_LIGHT }}>
            {MACHINE.user}
          </span>
          <span className="text-emerald-200">@</span>
          <span className="font-bold" style={{ color: NIX_LIGHT }}>
            {MACHINE.host}
          </span>
        </div>
        <div className="text-emerald-700">{"-".repeat(title.length)}</div>
        {rows.map(([k, v]) => (
          <div key={k}>
            <span className="font-bold" style={{ color: NIX_LIGHT }}>
              {k}
            </span>
            <span className="text-emerald-200">: </span>
            <span>{v}</span>
          </div>
        ))}
        <div className="mt-2 flex [text-shadow:none]" aria-hidden>
          {PALETTE.map((c) => (
            <span
              key={c}
              className="inline-block h-[1em] w-[2.2ch]"
              style={{ background: c }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
