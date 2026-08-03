"use client";

import { useState } from "react";
import { Project } from "@/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FolderGit2, ExternalLink, Github, Layers } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import useMeasure from "react-use-measure";

interface ProjectsSectionProps {
  projects: Project[];
}

export function ProjectsSection({ projects }: ProjectsSectionProps) {
  const [ref, bounds] = useMeasure();
  const [activeTab, setActiveTab] = useState<string>("all");

  const tabs = [
    { id: "all", label: "All Projects" },
    { id: "active", label: "Active" },
    { id: "in-development", label: "In Development" },
    { id: "planned", label: "Planned" },
  ];

  const filteredProjects = projects.filter((project) => {
    if (activeTab === "all") return true;
    return project.status === activeTab;
  });

  const getStatusBadgeVariant = (status: Project["status"]) => {
    switch (status) {
      case "active":
        return "status-active";
      case "development":
        return "status-dev";
      case "planned":
        return "status-planned";
      default:
        return "standard";
    }
  };

  return (
    <section id="projects" className="py-20 space-y-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-10">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono text-primary uppercase tracking-wider">
              <FolderGit2 className="w-4 h-4" />
              <span>FEATURED WORK & BACKLOG</span>
            </div>
            <h2 className="text-3xl font-bold font-sans text-text-main">
              Projects & Engineering Work
            </h2>
            <p className="text-sm text-text-muted max-w-xl">
              Open-source applications, tools, and planned architecture
              side-projects.
            </p>
          </div>

          {/* Interactive Filter Tabs */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-surface border border-border rounded-lg text-xs font-mono">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`cursor-pointer px-3 py-1.5 rounded-md transition-all duration-200 ${activeTab === tab.id
                    ? "bg-primary text-white shadow-sm"
                    : "text-text-muted hover:text-text-main hover:bg-border/30"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Projects Grid */}
        <motion.div
          animate={{ height: bounds.height > 0 ? bounds.height : "auto" }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="relative"
        >
          <div ref={ref}>
            <motion.div
              layout
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              <AnimatePresence mode="popLayout">
                {filteredProjects.map((project) => (
                  <motion.div
                    key={project.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card
                      hoverable
                      className="flex flex-col justify-between space-y-6 h-full"
                    >
                      <div className="space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-xl font-bold font-sans text-text-main">
                                {project.title}
                              </h3>
                            </div>
                          </div>

                          <Badge
                            variant={getStatusBadgeVariant(project.status)}
                          >
                            {project.status.toUpperCase()}
                          </Badge>
                        </div>

                        <p className="text-sm text-text-muted leading-relaxed font-sans">
                          {project.description}
                        </p>
                      </div>

                      <div className="space-y-4 pt-4 border-t border-border/60">
                        {/* Tech Tags */}
                        <div className="flex flex-wrap gap-2">
                          {project.tags.map((tag) => (
                            <Badge key={tag} variant="standard">
                              {tag}
                            </Badge>
                          ))}
                        </div>

                        {/* External Links */}
                        <div className="flex items-center gap-4 text-xs font-mono pt-1">
                          {project.githubUrl && (
                            <a
                              href={project.githubUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-text-muted hover:text-primary transition-colors"
                            >
                              <Github className="w-3.5 h-3.5" />
                              <span>Code Repository</span>
                            </a>
                          )}

                          {project.liveUrl && (
                            <a
                              href={project.liveUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-primary hover:underline transition-all"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Live Preview</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>

            <AnimatePresence>
              {filteredProjects.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="py-12 mt-6 text-center text-sm font-mono text-text-muted bg-surface/50 border border-border rounded-xl"
                >
                  <Layers className="w-8 h-8 mx-auto text-text-muted mb-2 opacity-50" />
                  No projects found in status: {activeTab}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
