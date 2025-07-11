
'use client';

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useMemo, type ReactNode } from "react";
import {
  BarChart,
  History,
  LayoutDashboard,
  Loader2,
  FilePenLine,
  Users,
  Croissant,
} from "lucide-react";
import { onAuthStateChanged, type User, signOut } from "firebase/auth";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { auth, db } from "@/lib/firebase";
import { UserNav } from "@/components/user-nav";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SessionProvider, useSession } from "@/context/SessionContext";
import { cn } from "@/lib/utils";
import { useBrowserNotifications } from "@/hooks/use-browser-notifications";

const sessionFormSchema = z.object({
  name: z.string().min(1, "Nama harus diisi."),
  position: z.enum(["Kasir", "Kitchen", "Manajemen"], {
    required_error: "Posisi harus dipilih.",
  }),
});

function InnerLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isSessionDialogOpen, setIsSessionDialogOpen] = useState(false);
  const { sessionEstablished, setSessionEstablished, setSessionInfo, sessionInfo } = useSession();
  const [isSubmittingSession, setIsSubmittingSession] = useState(false);
  const [motivationalQuote, setMotivationalQuote] = useState("");
  const { sendNotification } = useBrowserNotifications();

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => {
          console.error("Service Worker registration failed:", err);
        });
      });
    }
  }, []);

  const motivationalQuotes = useMemo(() => [
      "Mulai kerja dulu ya, biar gak jadi beban tim 🤡💼",
      "Kerja dulu... biar bisa santai tanpa rasa bersalah 🤭",
      "Fokus ya, jangan ke-distract notif mantan 🚫",
      "Skip drama, fokus kerja dulu 🎯",
      "Kerja pelan-pelan, asal gak ngeluh terus 😆",
      "Fokus, jangan kasih kendor 💪",
      "Ketik satu, tarik napas, semangat lagi ✍️😤",
      "Gas kerja, gas sukses! 💨💼",
      "Senyumin kerjaan kamu 😬",
      "Bukan mager time 😤",
  ], []);

  const sessionForm = useForm<z.infer<typeof sessionFormSchema>>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: { name: "", position: undefined },
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/");
      } else {
        const lastSessionStartStr = localStorage.getItem('lastSessionStart');
        if (!lastSessionStartStr) {
          signOut(auth).then(() => {
              router.push("/");
              toast({
                  title: "Sesi Tidak Valid",
                  description: "Silakan masuk kembali untuk memulai sesi baru.",
              });
          });
          return;
        }

        const lastSessionStart = new Date(lastSessionStartStr);
        const now = new Date();
        
        const lastReset = new Date();
        lastReset.setHours(4, 0, 0, 0);

        if (now < lastReset) {
          lastReset.setDate(lastReset.getDate() - 1);
        }
        
        if (lastSessionStart < lastReset) {
          signOut(auth).then(() => {
            localStorage.removeItem('lastSessionStart');
            setSessionEstablished(false);
            setSessionInfo(null);
            toast({
                title: "Sesi Berakhir",
                description: "Sesi kerja harian Anda telah berakhir. Silakan masuk kembali.",
                duration: 5000,
            });
            router.push("/");
          });
          return;
        }

        setUser(currentUser);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router, toast, setSessionEstablished, setSessionInfo]);
  
  useEffect(() => {
    if (user && !sessionEstablished) {
      setIsSessionDialogOpen(true);
    } else if (user && sessionEstablished) {
      setIsSessionDialogOpen(false);
    }
  }, [user, sessionEstablished]);

  useEffect(() => {
    if (!sessionEstablished || !sessionInfo?.name) {
        setMotivationalQuote("");
        return;
    }

    let currentQuoteIndex = -1;

    const updateQuote = () => {
        let nextIndex;
        do {
            nextIndex = Math.floor(Math.random() * motivationalQuotes.length);
        } while (nextIndex === currentQuoteIndex);

        currentQuoteIndex = nextIndex;
        const quote = motivationalQuotes[nextIndex];
        setMotivationalQuote(`Halo ${sessionInfo.name}, ${quote}`);
    };

    updateQuote();
    const intervalId = setInterval(updateQuote, 7000); 

    return () => clearInterval(intervalId);
  }, [sessionEstablished, sessionInfo, motivationalQuotes]);

  const menuItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/update", label: "Update Produk", icon: FilePenLine },
    { href: "/dashboard/produk", label: "Produk", icon: Croissant },
    { href: "/dashboard/riwayat", label: "Riwayat", icon: History },
    { href: "/dashboard/laporan", label: "Laporan", icon: BarChart },
    { href: "/dashboard/pengguna", label: "Pengguna", icon: Users },
  ];
  
  const handleSessionSubmit = async (values: z.infer<typeof sessionFormSchema>) => {
    setIsSubmittingSession(true);

    // Optimistic UI update
    setSessionInfo({ name: values.name, position: values.position });
    setSessionEstablished(true);
    setIsSessionDialogOpen(false);
    sessionForm.reset();
    
    toast({
        title: `Selamat Bekerja, ${values.name}!`,
        description: "Sesi Anda telah dimulai.",
        duration: 3000,
    });
    
    sendNotification('Sesi Baru Dimulai', { body: `${values.name} telah memulai sesi kerja.` });

    // Sync with server in the background
    try {
        await addDoc(collection(db, "user_sessions"), {
            name: values.name,
            position: values.position,
            loginTime: serverTimestamp(),
            status: 'active'
        });
    } catch (error) {
      console.error("Session creation failed to sync with server:", error);
      // The session is already active locally, so we just notify the user about the sync issue.
      // We don't need to revert the state, as that would be disruptive.
      toast({
        variant: "destructive",
        title: "Gagal Sinkronisasi Sesi",
        description: "Gagal terhubung ke server. Sesi Anda tetap aktif secara lokal.",
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
      <div className="flex min-h-screen w-full flex-col bg-muted/40">
        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-4 border-b bg-background px-4">
            <Link href="/dashboard" className="flex-shrink-0">
                <Image
                  src="/Logo%20Dreampuff.png"
                  alt="Dreampuff Logo"
                  width={130}
                  height={30}
                  priority
                  data-ai-hint="company logo"
                />
            </Link>
            <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                {motivationalQuote && (
                    <div key={motivationalQuote} className="relative animate-fade-in-out flex-shrink min-w-0">
                      <div className="rounded-lg bg-muted px-2 py-1 text-xs text-muted-foreground shadow font-headline">
                        {motivationalQuote}
                      </div>
                      <div className="absolute top-1/2 -mt-2 -right-2 h-0 w-0
                        border-t-[8px] border-t-transparent
                        border-l-[10px] border-l-muted
                        border-b-[8px] border-b-transparent"
                      />
                    </div>
                )}
              <UserNav />
            </div>
        </header>

        <main className="flex-1 bg-muted/40 pb-24">
          {sessionEstablished ? children : (
            <div className="flex h-full w-full items-center justify-center p-4 text-center">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground font-serif">Menunggu sesi kerja dimulai...</p>
              </div>
            </div>
          )}
        </main>
        
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background p-1">
            <div className="grid w-full grid-cols-6">
                 {menuItems.map((item) => (
                    <Link
                        key={item.label}
                        href={item.href}
                        className={cn(
                            "flex flex-col items-center justify-center gap-1 rounded-lg p-2 text-muted-foreground",
                            (pathname.startsWith(item.href) && (item.href !== "/dashboard" || pathname === "/dashboard"))
                            ? "bg-muted font-medium text-primary"
                            : "hover:text-primary",
                            !sessionEstablished && "pointer-events-none opacity-50"
                        )}
                        aria-disabled={!sessionEstablished}
                    >
                        <item.icon className="h-5 w-5" />
                        <span className="text-xs">{item.label}</span>
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

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <InnerLayout>{children}</InnerLayout>
    </SessionProvider>
  )
}
