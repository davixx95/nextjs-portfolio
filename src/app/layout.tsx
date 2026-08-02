import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "@/app/globals.css";
import CustomScrollbar from "@/components/ui/CustomScrollbar";

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

export const metadata: Metadata = {
  title: "Davide Fedele | Senior Fullstack & Systems Engineer",
  description:
    "Engineering clean, high-performance web applications, cloud architecture, and microservices with Next.js, TypeScript, and Docker.",
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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-background text-text-main font-sans antialiased min-h-screen flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          {children}
          <CustomScrollbar />
        </ThemeProvider>
      </body>
    </html>
  );
}
