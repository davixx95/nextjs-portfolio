export interface WorkExperience {
  id: string;
  company: string;
  role: string;
  location: string;
  period: string;
  isCurrent: boolean;
  type: string;
  highlights: string[];
  techStack: string[];
}

export interface SkillCategory {
  category: string;
  skills: {
    name: string;
    isPrimary?: boolean;
  }[];
}

export interface Project {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'in-development' | 'planned';
  tags: string[];
  githubUrl?: string;
  liveUrl?: string;
}

export interface Metric {
  id: string;
  label: string;
  value: string;
  description: string;
}
