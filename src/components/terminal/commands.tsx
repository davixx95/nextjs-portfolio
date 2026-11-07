import React from "react";
import {
  CONTACT,
  FsDir,
  FsNode,
  formatAbsolute,
  getNode,
  listDir,
  resolvePath,
} from "./fs";
import { MACHINE, Neofetch } from "./Neofetch";

export type Output = React.ReactNode;

export interface ShellContext {
  fs: FsDir;
  /** Current directory (segments below ~). Mutated synchronously by `cd`. */
  cwd: string[];
  history: string[];
  clear: () => void;
  /** Run another command line (used by clickable output). */
  run: (line: string) => void;
  exit: () => void;
  onContact: () => void;
  setTheme: (theme: "dark" | "light") => void;
  currentTheme?: string;
}

interface Command {
  name: string;
  usage?: string;
  description: string;
  hidden?: boolean;
  run: (args: string[], ctx: ShellContext) => Output | void;
}

/* ------------------------------------------------------------ rendering -- */

export function Clickable({
  onClick,
  className,
  children,
  title,
}: {
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`cursor-pointer underline-offset-2 hover:underline focus-visible:underline outline-none ${className ?? ""}`}
    >
      {children}
    </button>
  );
}

const Err = ({ children }: { children: React.ReactNode }) => (
  <div className="text-red-400">{children}</div>
);
const Dim = ({ children }: { children: React.ReactNode }) => (
  <div className="text-emerald-600">{children}</div>
);

const TOKEN_RE = /(https?:\/\/[^\s]+|[\w.+-]+@[\w-]+\.[a-z.]+|\/resume\.pdf|`[^`]+`)/g;

/** Turns URLs, emails and `backtick commands` into clickable things. */
function linkify(text: string, ctx: ShellContext): React.ReactNode[] {
  return text.split(TOKEN_RE).map((part, i) => {
    if (i % 2 === 0) return part;
    if (part.startsWith("`")) {
      const cmd = part.slice(1, -1);
      return (
        <Clickable key={i} onClick={() => ctx.run(cmd)} className="text-amber-300" title={`run: ${cmd}`}>
          {cmd}
        </Clickable>
      );
    }
    const href = part.includes("@") && !part.startsWith("http") ? `mailto:${part}` : part;
    return (
      <a
        key={i}
        href={href}
        target={href.startsWith("http") ? "_blank" : undefined}
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="text-cyan-300 underline underline-offset-2 hover:text-cyan-200"
      >
        {part}
      </a>
    );
  });
}

/** Minimal markdown-ish renderer for `cat`. */
function Document({ content, ctx }: { content: string; ctx: ShellContext }) {
  return (
    <div className="py-0.5">
      {content.split("\n").map((line, i) => {
        if (line.startsWith("# "))
          return (
            <div key={i} className="font-bold text-emerald-200">
              {linkify(line.slice(2), ctx)}
            </div>
          );
        if (line.startsWith("## "))
          return (
            <div key={i} className="font-bold text-[#7ebae4]">
              {linkify(line.slice(3), ctx)}
            </div>
          );
        if (line.startsWith("- "))
          return (
            <div key={i} className="flex gap-[1ch]">
              <span className="text-emerald-600">-</span>
              <span className="min-w-0">{linkify(line.slice(2), ctx)}</span>
            </div>
          );
        return <div key={i}>{line === "" ? " " : linkify(line, ctx)}</div>;
      })}
    </div>
  );
}

function EntryName({
  name,
  node,
  path,
  ctx,
}: {
  name: string;
  node: FsNode;
  path: string;
  ctx: ShellContext;
}) {
  if (node.type === "dir") {
    return (
      <Clickable className="font-bold text-[#7ebae4]" onClick={() => ctx.run(`cd ${path} && ls`)}>
        {name}/
      </Clickable>
    );
  }
  if (node.binary) {
    return (
      <Clickable className="text-amber-300" onClick={() => ctx.run(`open ${path}`)}>
        {name}
      </Clickable>
    );
  }
  return (
    <Clickable className={name.startsWith(".") ? "text-emerald-600" : ""} onClick={() => ctx.run(`cat ${path}`)}>
      {name}
    </Clickable>
  );
}

const joinPath = (base: string, name: string) =>
  !base || base === "." ? name : `${base.replace(/\/$/, "")}/${name}`;

/* ------------------------------------------------------------- commands -- */

const commands: Command[] = [
  {
    name: "help",
    description: "show this help",
    run: (_args, ctx) => (
      <div className="py-0.5">
        <div className="font-bold text-emerald-200">Available commands</div>
        {commands
          .filter((c) => !c.hidden)
          .map((c) => (
            <div key={c.name} className="flex gap-[1ch]">
              <span className="w-[16ch] shrink-0">
                <Clickable className="text-amber-300" onClick={() => ctx.run(c.name)}>
                  {c.name}
                </Clickable>
                {c.usage ? <span className="text-emerald-600"> {c.usage}</span> : null}
              </span>
              <span className="min-w-0 text-emerald-400/80">{c.description}</span>
            </div>
          ))}
        <Dim>Tab completes · ↑/↓ history · click any name to open it · Esc to leave</Dim>
      </div>
    ),
  },
  {
    name: "ls",
    usage: "[-la] [dir]",
    description: "list directory contents",
    run: (args, ctx) => {
      const flags = args.filter((a) => a.startsWith("-")).join("");
      const showHidden = flags.includes("a");
      const long = flags.includes("l");
      const targets = args.filter((a) => !a.startsWith("-"));
      const target = targets[0] ?? "";
      const node = getNode(ctx.fs, resolvePath(ctx.cwd, target));

      if (!node) return <Err>ls: cannot access &apos;{target}&apos;: No such file or directory</Err>;
      if (node.type === "file") return <div>{target}</div>;

      const entries = listDir(node, showHidden);
      if (long) {
        return (
          <div>
            {entries.map(([name, child]) => (
              <div key={name} className="whitespace-pre">
                <span className="text-emerald-600">
                  {child.type === "dir" ? "drwxr-xr-x" : "-rw-r--r--"} {MACHINE.user}{" "}
                  {String(child.type === "dir" ? 4096 : child.binary ? 98304 : child.content.length).padStart(6)}{" "}
                </span>
                <EntryName name={name} node={child} path={joinPath(target, name)} ctx={ctx} />
              </div>
            ))}
          </div>
        );
      }
      return (
        <div className="flex flex-wrap gap-x-[3ch]">
          {entries.map(([name, child]) => (
            <EntryName key={name} name={name} node={child} path={joinPath(target, name)} ctx={ctx} />
          ))}
        </div>
      );
    },
  },
  {
    name: "cd",
    usage: "<dir>",
    description: "change directory",
    run: (args, ctx) => {
      const target = args[0] ?? "~";
      const segments = resolvePath(ctx.cwd, target);
      const node = getNode(ctx.fs, segments);
      if (!node) return <Err>cd: no such file or directory: {target}</Err>;
      if (node.type !== "dir") return <Err>cd: not a directory: {target}</Err>;
      ctx.cwd = segments;
    },
  },
  {
    name: "cat",
    usage: "<file>",
    description: "print a file",
    run: (args, ctx) => {
      if (!args.length) return <Err>usage: cat &lt;file&gt; (try `cat about.md`)</Err>;
      return (
        <>
          {args.map((arg) => {
            const node = getNode(ctx.fs, resolvePath(ctx.cwd, arg));
            if (!node) return <Err key={arg}>cat: {arg}: No such file or directory</Err>;
            if (node.type === "dir") return <Err key={arg}>cat: {arg}: Is a directory</Err>;
            if (node.binary)
              return (
                <div key={arg}>
                  <span className="text-red-400">cat: {arg}: binary file </span>
                  (try{" "}
                  <Clickable className="text-amber-300" onClick={() => ctx.run(`open ${arg}`)}>
                    open {arg}
                  </Clickable>
                  )
                </div>
              );
            return <Document key={arg} content={node.content} ctx={ctx} />;
          })}
        </>
      );
    },
  },
  {
    name: "neofetch",
    description: "system info (about me, really)",
    run: () => <Neofetch />,
  },
  {
    name: "whoami",
    description: "who am I?",
    run: (_args, ctx) => (
      <div>
        {MACHINE.user}
        <Dim>
          {"// Davide Fedele, front end developer in Rome. Try "}
          <Clickable className="text-amber-300" onClick={() => ctx.run("cat about.md")}>
            cat about.md
          </Clickable>
        </Dim>
      </div>
    ),
  },
  {
    name: "open",
    usage: "<thing>",
    description: "open resume.pdf, github or linkedin",
    run: (args, ctx) => {
      const target = (args[0] ?? "").toLowerCase();
      const links: Record<string, string> = {
        github: CONTACT.github,
        linkedin: CONTACT.linkedin,
        resume: CONTACT.resume,
        cv: CONTACT.resume,
      };
      let href = links[target];
      if (!href && target) {
        const node = getNode(ctx.fs, resolvePath(ctx.cwd, args[0]));
        if (node?.type === "file" && node.href) href = node.href;
        else if (node?.type === "file") return commands.find((c) => c.name === "cat")!.run(args, ctx);
      }
      if (!href) return <Err>usage: open &lt;resume.pdf | github | linkedin&gt;</Err>;
      window.open(href, "_blank", "noopener,noreferrer");
      return <Dim>opening {href} ...</Dim>;
    },
  },
  {
    name: "contact",
    description: "open the contact form",
    run: (_args, ctx) => {
      ctx.onContact();
      return <Dim>launching contact form ...</Dim>;
    },
  },
  {
    name: "theme",
    usage: "[dark|light]",
    description: "switch the site theme",
    run: (args, ctx) => {
      const wanted = args[0];
      if (wanted && wanted !== "dark" && wanted !== "light")
        return <Err>theme: unknown theme &apos;{wanted}&apos; (dark | light)</Err>;
      const next = (wanted ?? (ctx.currentTheme === "dark" ? "light" : "dark")) as "dark" | "light";
      ctx.setTheme(next);
      return <Dim>theme set to {next}. (this screen stays dark. it&apos;s a CRT.)</Dim>;
    },
  },
  {
    name: "pwd",
    description: "print working directory",
    run: (_args, ctx) => <div>{formatAbsolute(ctx.cwd)}</div>,
  },
  {
    name: "history",
    description: "show command history",
    run: (_args, ctx) => (
      <div>
        {ctx.history.map((h, i) => (
          <div key={i} className="whitespace-pre">
            <span className="text-emerald-600">{String(i + 1).padStart(4)} </span>
            {h}
          </div>
        ))}
      </div>
    ),
  },
  {
    name: "echo",
    usage: "<text>",
    description: "print text",
    run: (args) => <div className="whitespace-pre-wrap">{args.join(" ").replace(/^["']|["']$/g, "")}</div>,
  },
  {
    name: "clear",
    description: "clear the screen (Ctrl+L)",
    run: (_args, ctx) => ctx.clear(),
  },
  {
    name: "exit",
    description: "power down to the photo",
    run: (_args, ctx) => ctx.exit(),
  },

  /* ---- hidden / easter eggs ---- */
  {
    name: "uname",
    hidden: true,
    description: "",
    run: (args) => (
      <div>{args.includes("-a") ? `Linux ${MACHINE.host} ${MACHINE.kernel} #1-NixOS SMP x86_64 GNU/Linux` : "Linux"}</div>
    ),
  },
  {
    name: "date",
    hidden: true,
    description: "",
    run: () => <div>{new Date().toString()}</div>,
  },
  {
    name: "sudo",
    hidden: true,
    description: "",
    run: () => <Err>{MACHINE.user} is not in the sudoers file. This incident will be reported.</Err>,
  },
  {
    name: "rm",
    hidden: true,
    description: "",
    run: () => (
      <Err>rm: cannot remove: read-only file system (it&apos;s NixOS. everything lives in /nix/store.)</Err>
    ),
  },
  {
    name: "nix-shell",
    hidden: true,
    description: "",
    run: (args) => {
      const pkg = args[args.indexOf("-p") + 1] || args[0];
      if (!pkg) return <Err>error: no shell.nix or default.nix found (try `nix-shell -p cowsay`)</Err>;
      return (
        <div>
          <Dim>these 1 paths will be fetched (0.00 MiB download, 0.00 MiB unpacked):</Dim>
          <Dim>{`  /nix/store/${"0123456789abcdfg".repeat(2)}-${pkg}`}</Dim>
          <div>
            {pkg} is now available in this shell. (not really. but reproducibly not really.)
          </div>
        </div>
      );
    },
  },
  ...["vim", "nvim", "vi", "nano", "emacs"].map<Command>((name) => ({
    name,
    hidden: true,
    description: "",
    run: () =>
      name === "nvim" ? (
        <div>good choice. sadly, this terminal is read-only. try `cat` instead.</div>
      ) : (
        <div>
          {name}? on <span className="text-[#7ebae4]">my</span> machine? we use nvim here. try `cat` instead.
        </div>
      ),
  })),
];

export const COMMAND_NAMES = commands.map((c) => c.name);
export const PUBLIC_COMMAND_NAMES = commands.filter((c) => !c.hidden).map((c) => c.name);

/* ------------------------------------------------------------ execution -- */

function tokenize(line: string) {
  return line.trim().split(/\s+/).filter(Boolean);
}

/** Run a full command line (supports `a && b`). Returns the output blocks. */
export function execute(line: string, ctx: ShellContext): Output[] {
  const out: Output[] = [];
  for (const part of line.split("&&")) {
    const [name, ...args] = tokenize(part);
    if (!name) continue;
    const command = commands.find((c) => c.name === name);
    if (!command) {
      out.push(
        <div>
          <span className="text-red-400">zsh: command not found: {name}</span>
          <span className="text-emerald-600"> · try </span>
          <Clickable className="text-amber-300" onClick={() => ctx.run("help")}>
            help
          </Clickable>
        </div>,
      );
      break;
    }
    const result = command.run(args, ctx);
    if (result !== undefined && result !== null) out.push(result);
  }
  return out;
}

/* ----------------------------------------------------------- completion -- */

const commonPrefix = (values: string[]) =>
  values.reduce((prefix, v) => {
    let i = 0;
    while (i < prefix.length && prefix[i] === v[i]) i++;
    return prefix.slice(0, i);
  }, values[0] ?? "");

/** Tab completion for command names (first word) and paths (other words). */
export function complete(
  input: string,
  ctx: Pick<ShellContext, "fs" | "cwd">,
): { value: string; options: string[] } {
  const endsWithSpace = /\s$/.test(input);
  const tokens = input.split(/\s+/);
  const last = endsWithSpace ? "" : (tokens.pop() ?? "");
  if (endsWithSpace) tokens.pop();
  const before = tokens.length ? tokens.join(" ") + " " : "";

  // complete the command name
  if (!before.trim()) {
    const matches = PUBLIC_COMMAND_NAMES.filter((n) => n.startsWith(last));
    if (matches.length === 1) return { value: matches[0] + " ", options: [] };
    const prefix = commonPrefix(matches);
    return { value: (prefix.length > last.length ? prefix : last), options: matches.length > 1 ? matches : [] };
  }

  // complete a path
  const slash = last.lastIndexOf("/");
  const dirPart = slash >= 0 ? last.slice(0, slash + 1) : "";
  const base = slash >= 0 ? last.slice(slash + 1) : last;
  const dirNode = getNode(ctx.fs, resolvePath(ctx.cwd, dirPart));
  if (!dirNode || dirNode.type !== "dir") return { value: input, options: [] };

  const matches = listDir(dirNode, base.startsWith(".")).filter(([name]) => name.startsWith(base));
  if (matches.length === 1) {
    const [name, node] = matches[0];
    return { value: before + dirPart + name + (node.type === "dir" ? "/" : " "), options: [] };
  }
  const names = matches.map(([name, node]) => (node.type === "dir" ? `${name}/` : name));
  const prefix = commonPrefix(matches.map(([n]) => n));
  return {
    value: before + dirPart + (prefix.length > base.length ? prefix : base),
    options: matches.length > 1 ? names : [],
  };
}
