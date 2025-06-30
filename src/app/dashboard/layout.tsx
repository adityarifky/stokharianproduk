'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  BarChart,
  History,
  LayoutDashboard,
  Package,
  Package2,
  Users,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { UserNav } from "@/components/user-nav";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  const menuItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "#", label: "Produk", icon: Package },
    { href: "#", label: "Riwayat", icon: History },
    { href: "#", label: "Laporan", icon: BarChart },
    { href: "#", label: "Pengguna", icon: Users },
  ];

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold text-sidebar-foreground">
            <Package2 className="h-6 w-6" />
            <span>Dreampuff</span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.label}>
                <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.label}>
                  <Link href={item.href}>
                    <item.icon />
                    {item.label}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
          <div className="flex w-full items-center justify-end gap-4 md:ml-auto">
            <UserNav />
          </div>
        </header>
        <SidebarInset>
          <main className="flex flex-1 flex-col gap-4 p-4 pb-20 md:gap-8 md:p-8">
            {children}
          </main>
        </SidebarInset>
      </div>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background md:hidden">
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
    </SidebarProvider>
  );
}
