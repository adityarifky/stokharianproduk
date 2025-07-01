
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
import { onAuthStateChanged, type User } from "firebase/auth";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { auth, db } from "@/lib/firebase";
import { UserNav } from "@/components/user-nav";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const sessionFormSchema = z.object({
  name: z.string().min(1, "Nama harus diisi."),
  position: z.enum(["Kasir", "Kitchen", "Manajemen"], {
    required_error: "Posisi harus dipilih.",
  }),
});

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isSessionDialogOpen, setIsSessionDialogOpen] = useState(false);
  const [sessionEstablished, setSessionEstablished] = useState(false);
  const [isSubmittingSession, setIsSubmittingSession] = useState(false);

  const sessionForm = useForm<z.infer<typeof sessionFormSchema>>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: { name: "", position: undefined },
  });

  // Effect 1: Handle Auth State. Runs once to check user login status.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/");
      } else {
        setUser(currentUser);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  // Effect 2: Handle Session Dialog. Runs only when the user is confirmed.
  useEffect(() => {
    // If we have a user, but the session isn't established yet, show the dialog.
    // This logic ensures the dialog appears on every load if the session isn't established.
    if (user && !sessionEstablished) {
      setIsSessionDialogOpen(true);
    }
  }, [user, sessionEstablished]);

  const menuItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/update", label: "Update Produk", icon: FilePenLine },
    { href: "/dashboard/produk", label: "Produk", icon: Croissant },
    { href: "#", label: "Riwayat", icon: History },
    { href: "#", label: "Laporan", icon: BarChart },
    { href: "/dashboard/pengguna", label: "Pengguna", icon: Users },
  ];
  
  const handleSessionSubmit = async (values: z.infer<typeof sessionFormSchema>) => {
    setIsSubmittingSession(true);
    try {
        await addDoc(collection(db, "user_sessions"), {
            name: values.name,
            position: values.position,
            loginTime: serverTimestamp(),
            status: 'active'
        });

        // The key: these are only set AFTER a successful Firestore write.
        // This gives the backend enough time to be ready for subsequent reads.
        setSessionEstablished(true);
        setIsSessionDialogOpen(false);
        sessionForm.reset();
        
        toast({
            title: `Selamat Bekerja, ${values.name}!`,
            description: "Sesi Anda telah dimulai.",
        });

    } catch (error) {
      console.error("Session creation error:", error);
       toast({
        variant: "destructive",
        title: "Gagal Memulai Sesi",
        description: "Terjadi kesalahan saat menyimpan data sesi.",
      });
    } finally {
        setIsSubmittingSession(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
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
          <UserNav sessionEstablished={sessionEstablished} />
        </header>
        
        <main className="flex-1 overflow-hidden">
          {sessionEstablished ? children : (
            <div className="flex h-full w-full items-center justify-center p-4 text-center">
              <p className="text-muted-foreground">Silakan mulai sesi kerja Anda untuk melihat konten.</p>
            </div>
          )}
        </main>

        <nav className="shrink-0 border-t bg-background">
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

      <Dialog open={isSessionDialogOpen}>
        <DialogContent className="sm:max-w-[425px]" hideCloseButton>
          <DialogHeader>
            <DialogTitle>Mulai Sesi Kerja</DialogTitle>
            <DialogDescription>
              Sebelum melanjutkan, harap masukkan nama dan posisi Anda untuk sesi kerja ini.
            </DialogDescription>
          </DialogHeader>
          <Form {...sessionForm}>
            <form onSubmit={sessionForm.handleSubmit(handleSessionSubmit)} className="space-y-4 py-4">
              <FormField
                control={sessionForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Anda</FormLabel>
                    <FormControl>
                      <Input placeholder="cth. Budi" {...field} disabled={isSubmittingSession} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={sessionForm.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Posisi</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmittingSession}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih posisi Anda" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Kasir">Kasir</SelectItem>
                        <SelectItem value="Kitchen">Kitchen</SelectItem>
                        <SelectItem value="Manajemen">Manajemen</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={isSubmittingSession} className="w-full">
                  {isSubmittingSession ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Memulai Sesi...
                    </>
                  ) : (
                    "Mulai Bekerja"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
