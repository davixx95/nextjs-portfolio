import experienceData from "@/data/experience.json";
import projectsData from "@/data/projects.json";
import skillsData from "@/data/skills.json";
import metricsData from "@/data/metrics.json";
import { WorkExperience, Project, SkillCategory, Metric } from "@/types";

/**
 * A tiny in-memory filesystem for the hero terminal.
 *
 * Content is generated from the same JSON files that drive the rest of the
 * page, so editing `src/data/*.json` updates the terminal automatically.
 */

export type FsFile = {
  type: "file";
  content: string;
  /** Binary files can't be `cat`-ed; `open` navigates to `href` instead. */
  binary?: boolean;
  href?: string;
};

export type FsDir = {
  type: "dir";
  children: Record<string, FsNode>;
};

export type FsNode = FsFile | FsDir;

export const HOME_LABEL = "~";
export const HOME_ABSOLUTE = "/home/davide";

export const CONTACT = {
  email: "davide@fedele.dev",
  linkedin: "https://linkedin.com/in/davide-fedele",
  github: "https://github.com/davixx95",
  resume: "/resume.pdf",
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const file = (content: string): FsFile => ({ type: "file", content });
const dir = (children: Record<string, FsNode>): FsDir => ({
  type: "dir",
  children,
});

function buildAbout(experiences: WorkExperience[], metrics: Metric[]) {
  const current = experiences.find((e) => e.isCurrent);
  return [
    "# Davide Fedele",
    `${current?.role ?? "Front End Developer"} · Rome, Italy (Remote)`,
    "",
    "Frontend Engineer specializing in React and Next.js, building web",
    "and mobile products for enterprise clients. Growing toward",
    "full-stack ownership: CI/CD pipelines, Node.js and platform upgrades.",
    "",
    "## Quick facts",
    ...metrics.map((m) => `- ${m.value} ${m.label.toLowerCase()}: ${m.description}`),
    "",
    "## Right now",
    ...(current ? [`- ${current.role} @ ${current.company}`] : []),
    "- Available for new projects & roles",
    "- Daily driver: NixOS + Hyprland + nvim",
    "",
    "Next: `ls experience` or `cat contact.txt`",
  ].join("\n");
}

function buildContact() {
  return [
    "# Get in touch",
    "",
    `email     ${CONTACT.email}`,
    `linkedin  ${CONTACT.linkedin}`,
    `github    ${CONTACT.github}`,
    "",
    "Or just type `contact` to open the contact form.",
  ].join("\n");
}

function buildExperience(e: WorkExperience) {
  return [
    `# ${e.role} @ ${e.company}`,
    `${e.period} · ${e.location} · ${e.type}`,
    "",
    ...e.highlights.map((h) => `- ${h}`),
    "",
    `Stack: ${e.techStack.join(", ")}`,
  ].join("\n");
}

function buildProject(p: Project) {
  return [
    `# ${p.title}`,
    `status: ${p.status}`,
    "",
    p.description,
    "",
    `Tags: ${p.tags.join(", ")}`,
    ...(p.githubUrl ? [`Code: ${p.githubUrl}`] : []),
    ...(p.liveUrl ? [`Live: ${p.liveUrl}`] : []),
  ].join("\n");
}

function buildSkills(c: SkillCategory) {
  return [
    `# ${c.category}`,
    "",
    ...c.skills.map((s) => `${s.isPrimary ? "★" : "·"} ${s.name}`),
    "",
    "★ = daily driver",
  ].join("\n");
}

export function buildFs(): FsDir {
  const experiences = experienceData as WorkExperience[];
  const projects = projectsData as Project[];
  const skills = skillsData as SkillCategory[];
  const metrics = metricsData as Metric[];

  return dir({
    "about.md": file(buildAbout(experiences, metrics)),
    "contact.txt": file(buildContact()),
    "resume.pdf": {
      type: "file",
      content: "",
      binary: true,
      href: CONTACT.resume,
    },
    experience: dir(
      Object.fromEntries(
        experiences.map((e) => [`${slugify(e.company)}.md`, file(buildExperience(e))]),
      ),
    ),
    projects: dir(
      Object.fromEntries(
        projects.map((p) => [`${slugify(p.title)}.md`, file(buildProject(p))]),
      ),
    ),
    skills: dir(
      Object.fromEntries(
        skills.map((c) => [`${slugify(c.category)}.txt`, file(buildSkills(c))]),
      ),
    ),
    ".secrets": file(
      [
        "nice try.",
        "",
        "the only secret here is that this whole site is a static export",
        "and this 'computer' is ~270 triangles and a <div>.",
        "",
        "(psst: try `sudo`)",
      ].join("\n"),
    ),
  });
}

/* ---------------------------------------------------------------- paths -- */

/** Resolve `input` relative to `cwd` (segments below ~). `..` never goes above ~. */
export function resolvePath(cwd: string[], input: string): string[] {
  let segments: string[];
  let rest = input.trim();

  if (rest === "") return [...cwd];
  if (rest === HOME_LABEL) return [];

  if (rest.startsWith(HOME_ABSOLUTE)) {
    rest = rest.slice(HOME_ABSOLUTE.length);
    segments = [];
  } else if (rest.startsWith("~/") || rest.startsWith("/")) {
    rest = rest.replace(/^~?\//, "");
    segments = [];
  } else {
    segments = [...cwd];
  }

  for (const part of rest.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") segments.pop();
    else segments.push(part);
  }
  return segments;
}

export function getNode(root: FsDir, segments: string[]): FsNode | null {
  let node: FsNode = root;
  for (const seg of segments) {
    if (node.type !== "dir") return null;
    const next: FsNode | undefined = node.children[seg];
    if (!next) return null;
    node = next;
  }
  return node;
}

export function formatPath(segments: string[]) {
  return segments.length ? `${HOME_LABEL}/${segments.join("/")}` : HOME_LABEL;
}

export function formatAbsolute(segments: string[]) {
  return segments.length ? `${HOME_ABSOLUTE}/${segments.join("/")}` : HOME_ABSOLUTE;
}

export function listDir(node: FsDir, showHidden = false) {
  return Object.entries(node.children)
    .filter(([name]) => showHidden || !name.startsWith("."))
    .sort(([a, an], [b, bn]) => {
      // directories first, then alphabetical
      if (an.type !== bn.type) return an.type === "dir" ? -1 : 1;
      return a.localeCompare(b);
    });
}
