import "~/styles/globals.css";
import type { Metadata } from "next";
import Navbar from "./_components/navbar/Navbar";
import Footer from "./_components/footer/footer";

export const metadata: Metadata = {
  title: "Knight Hacks 2025",
  description: "The largest hackathon in Orlando",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="bg-[url('/background.svg')] bg-cover">
        <Navbar />
        {children}
        { /* <Footer /> */ }
      </body>
    </html>
  );
}
