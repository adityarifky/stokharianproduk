'use client';

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  BarChart,
  History,
  LayoutDashboard,
  Loader2,
  FilePenLine,
  Users,
  Croissant,
} from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";

import { auth } from "@/lib/firebase";
import { UserNav } from "@/components/user-nav";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/");
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const menuItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/update", label: "Update Produk", icon: FilePenLine },
    { href: "/dashboard/produk", label: "Produk", icon: Croissant },
    { href: "#", label: "Riwayat", icon: History },
    { href: "#", label: "Laporan", icon: BarChart },
    { href: "#", label: "Pengguna", icon: Users },
  ];

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col">
      <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-4 border-b bg-background px-4 md:px-6">
        <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold">
          <Image
            src="/Logo%20Dreampuff.png"
            alt="Dreampuff Logo"
            width={140}
            height={32}
            priority
            data-ai-hint="company logo"
          />
        </Link>
        <UserNav />
      </header>
      
      <main className="flex-1 overflow-hidden">
        {children}
      </main>

      <nav className="z-50 shrink-0 border-t bg-background">
        <div className="grid h-16 grid-cols-6 items-center">
          {menuItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex h-full flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary",
                pathname === item.href && "text-primary"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
