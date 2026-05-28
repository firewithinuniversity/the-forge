import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "./components/Sidebar";
import MainContent from "./components/MainContent";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The Forge — Project Command Center",
  description: "Project management and finance tracking for Fire Within University.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="h-full bg-[#09090B] text-[#FAFAFA]">
        <Sidebar />
        <MainContent>
          {children}
        </MainContent>
      </body>
    </html>
  );
}
