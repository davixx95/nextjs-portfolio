import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "@/app/globals.css";
import CustomScrollbar from "@/components/ui/CustomScrollbar";
import { getPersonJsonLd } from "@/lib/structuredData";

const SITE_URL = "https://davide.fedele.dev";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const title = "Davide Fedele | Senior Fullstack & Systems Engineer";
const description =
  "Engineering clean, high-performance web applications, cloud architecture, and microservices with Next.js, TypeScript, and Docker.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title,
  description,
  keywords: [
    "Davide Fedele",
    "Fullstack Engineer",
    "Systems Engineer",
    "Next.js 15",
    "TypeScript",
    "Docker",
    "Web Developer Portfolio",
  ],
  authors: [{ name: "Davide Fedele" }],
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: "profile",
    url: SITE_URL,
    title,
    description,
    siteName: "Davide Fedele — Portfolio",
    images: [
      {
        url: "/headshot.webp",
        width: 640,
        height: 640,
        alt: "Davide Fedele",
      },
    ],
  },
  twitter: {
    card: "summary",
    title,
    description,
    images: ["/headshot.webp"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const personJsonLd = getPersonJsonLd();

  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-background text-text-main font-sans antialiased min-h-screen flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
        >
          {children}
          <CustomScrollbar />
        </ThemeProvider>
      </body>
    </html>
  );
}
