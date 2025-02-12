import "./globals.css";
import { ThemeProvider, ThemeToggle } from "@forge/ui/theme";
import type { Metadata, Viewport } from "next";
import { TRPCReactProvider } from "~/trpc/react";
import { GeistSans } from "geist/font/sans"; 
import { GeistMono } from "geist/font/mono";

export const metadata: Metadata = {
  title: "Sam",
  description: "Sam's Awesome Dev Application",
  openGraph: {
    title: "Sam Dev App",
    description: "Sam's Awesome Dev Application",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#C1CEFE" },
    { media: "(prefers-color-scheme: dark)", color: "#624CAB" },
  ],
};

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body suppressHydrationWarning className="theme-container">
        <ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem>
          <TRPCReactProvider>
            <div>
              {props.children}
            </div>
            <div className="top">
              <div className="fixed bottom-10 justify-center items-center flex w-full">
                <ThemeToggle />
              </div>
            </div>
          </TRPCReactProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
