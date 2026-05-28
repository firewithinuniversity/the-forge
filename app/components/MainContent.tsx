"use client";

import { usePathname } from "next/navigation";

export default function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  return (
    <main className={isLogin ? "min-h-full" : "lg:pl-[260px] min-h-full"}>
      {children}
    </main>
  );
}
