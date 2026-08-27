import experienceData from "@/data/experience.json";
import skillsData from "@/data/skills.json";
import { WorkExperience, SkillCategory } from "@/types";

const SITE_URL = "https://davide.fedele.dev";

const experiences = experienceData as WorkExperience[];
const skillCategories = skillsData as SkillCategory[];

const currentRole = experiences.find((exp) => exp.isCurrent);

const knowsAbout = skillCategories
  .flatMap((category) => category.skills)
  .filter((skill) => skill.isPrimary)
  .map((skill) => skill.name);

export function getPersonJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": `${SITE_URL}/#person`,
        name: "Davide Fedele",
        url: SITE_URL,
        image: `${SITE_URL}/headshot.webp`,
        jobTitle: "Senior Fullstack & Systems Engineer",
        description:
          "React ecosystem expert building resilient, high-performance web applications for enterprise clients.",
        email: "mailto:davide@fedele.dev",
        sameAs: [
          "https://github.com/davixx95",
          "https://linkedin.com/in/davide-fedele",
        ],
        address: {
          "@type": "PostalAddress",
          addressLocality: "Rome",
          addressCountry: "IT",
        },
        ...(currentRole && {
          worksFor: {
            "@type": "Organization",
            name: currentRole.company,
          },
        }),
        knowsAbout,
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: "Davide Fedele — Portfolio",
        publisher: { "@id": `${SITE_URL}/#person` },
      },
      {
        "@type": "ProfilePage",
        "@id": `${SITE_URL}/#profilepage`,
        url: SITE_URL,
        name: "Davide Fedele | Senior Fullstack & Systems Engineer",
        description:
          "Engineering clean, high-performance web applications, cloud architecture, and microservices with Next.js, TypeScript, and Docker.",
        isPartOf: { "@id": `${SITE_URL}/#website` },
        mainEntity: { "@id": `${SITE_URL}/#person` },
      },
    ],
  };
}
