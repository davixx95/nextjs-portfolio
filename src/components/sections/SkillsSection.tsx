import React from "react";
import { SkillCategory } from "@/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Cpu } from "lucide-react";

interface SkillsSectionProps {
  skillCategories: SkillCategory[];
}

export function SkillsSection({ skillCategories }: SkillsSectionProps) {
  return (
    <section id="skills" className="py-20 bg-surface/20 border-y border-border/40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-10">
        {/* Section Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono text-primary uppercase tracking-wider">
            <Cpu className="w-4 h-4" />
            <span>TECHNICAL PROFICIENCY</span>
          </div>
          <h2 className="text-3xl font-bold font-sans text-text-main">
            Skills & Core Competencies
          </h2>
          <p className="text-sm text-text-muted max-w-xl">
            A comprehensive overview of technologies, frameworks, and architecture paradigms I use daily.
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {skillCategories.map((cat) => (
            <Card key={cat.category} hoverable className="space-y-4">
              <h3 className="text-lg font-bold font-sans text-text-main border-b border-border/60 pb-2">
                {cat.category}
              </h3>
              <div className="flex flex-wrap gap-2.5">
                {cat.skills.map((skill) => (
                  <Badge
                    key={skill.name}
                    variant={skill.isPrimary ? "primary" : "standard"}
                  >
                    {skill.name}
                  </Badge>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
