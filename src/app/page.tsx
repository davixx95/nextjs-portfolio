import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/sections/HeroSection";
import { MetricsSection } from "@/components/sections/MetricsSection";
import { ExperienceSection } from "@/components/sections/ExperienceSection";
import { SkillsSection } from "@/components/sections/SkillsSection";
import { ProjectsSection } from "@/components/sections/ProjectsSection";

import experienceData from "@/data/experience.json";
import skillsData from "@/data/skills.json";
import projectsData from "@/data/projects.json";
import metricsData from "@/data/metrics.json";
import stackData from "@/data/stack.json";

import { WorkExperience, SkillCategory, Project, Metric } from "@/types";

export default function Home() {
  const experiences = experienceData as WorkExperience[];
  const skillCategories = skillsData as SkillCategory[];
  const projects = projectsData as Project[];
  const metrics = metricsData as Metric[];
  const coreStack = stackData as string[];

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <HeroSection coreStack={coreStack} />
        <MetricsSection metrics={metrics} />
        <ExperienceSection experiences={experiences} />
        <SkillsSection skillCategories={skillCategories} />
        <ProjectsSection projects={projects} />
      </main>
      <Footer />
    </div>
  );
}
