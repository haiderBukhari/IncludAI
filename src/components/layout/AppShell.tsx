"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { getDeviceId } from "@/lib/supabase/client";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/studio", label: "Studio" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/profile?deviceId=${getDeviceId()}`)
      .then((res) => res.json())
      .then((data) => setName(data.displayName ?? null))
      .catch(() => {});
  }, [pathname]);

  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto w-full flex items-center justify-between px-6 py-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-ink" />
            <span className="font-display text-lg tracking-[-0.01em]">StimuSonic</span>
          </Link>

          <nav className="flex items-center gap-1">
            {NAV.map((item) => {
              const active = pathname === item.href || pathname?.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "text-sm px-3 py-1.5 rounded-full transition-colors",
                    active ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
            {name && (
              <span className="hidden sm:inline text-sm text-ink-faint ml-2 pl-2 border-l border-line">
                Hi, {name}
              </span>
            )}
          </nav>
        </div>
      </header>

      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
}
