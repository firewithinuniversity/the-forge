import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "./components/Sidebar";
import MainContent from "./components/MainContent";
import SearchModal from "./components/SearchModal";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The Forge — Project Command Center",
  description: "Project management and finance tracking for Fire Within University.",
  manifest: "/manifest.json",
  themeColor: "#E8501A",
  icons: {
    icon: "/favicon.png",
    apple: "/icon-512.png",
  },
  appleWebApp: {
    capable: true,
    title: "The Forge",
    statusBarStyle: "black-translucent",
  },
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
        <SearchModal />
        <MainContent>
          {children}
        </MainContent>
      </body>
    </html>
  );
}
