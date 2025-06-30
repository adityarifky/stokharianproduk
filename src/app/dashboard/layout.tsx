'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  BarChart,
  History,
  LayoutDashboard,
  Loader2,
  Package,
  Package2,
  Users,
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
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const menuItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "#", label: "Produk", icon: Package },
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
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b bg-background px-4 md:px-6">
        <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold">
          <Package2 className="h-6 w-6" />
          <span>Dreampuff</span>
        </Link>
        <UserNav />
      </header>
      
      <main className="flex flex-1 flex-col gap-4 p-4 pb-20 md:gap-8 md:p-8">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background">
        <div className="grid h-16 grid-cols-5 items-center">
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
