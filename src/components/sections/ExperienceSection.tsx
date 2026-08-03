import React from "react";
import { WorkExperience } from "@/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Briefcase, Calendar, MapPin } from "lucide-react";

interface ExperienceSectionProps {
  experiences: WorkExperience[];
}

export function ExperienceSection({ experiences }: ExperienceSectionProps) {
  return (
    <section id="experience" className="py-20 space-y-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-10">
        {/* Section Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono text-primary uppercase tracking-wider">
            <Briefcase className="w-4 h-4" />
            <span>CAREER TRAJECTORY</span>
          </div>
          <h2 className="text-3xl font-bold font-sans text-text-main">
            Work Experience
          </h2>
          <p className="text-sm text-text-muted max-w-xl">
            A track record of engineering scalable web systems, optimizing
            frontend performance, and leading DevOps initiatives.
          </p>
        </div>

        {/* Timeline List */}
        <div className="relative border-l-2 border-border ml-3 md:ml-4 pl-6 md:pl-8 space-y-8">
          {experiences.map((exp) => (
            <div key={exp.id} className="relative group">
              {/* Timeline Dot */}
              <div className="absolute -left-[31px] md:-left-[39px] top-6 w-4 h-4 rounded-full bg-surface border-2 border-primary group-hover:bg-primary transition-colors" />

              <Card hoverable className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-text-main font-sans">
                      {exp.role}
                    </h3>
                    <div className="text-sm font-mono text-primary font-medium mt-0.5">
                      {exp.company}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono text-text-muted">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {exp.period}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {exp.location}
                    </span>
                  </div>
                </div>

                {/* Highlights List */}
                <ul className="space-y-2 text-sm text-text-muted list-disc list-inside">
                  {exp.highlights.map((highlight, idx) => (
                    <li key={idx} className="leading-relaxed">
                      <span className="text-text-main font-sans">
                        {highlight}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Tech Stack Tags */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border/60">
                  {exp.techStack.map((tech) => (
                    <Badge key={tech} variant="standard">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
