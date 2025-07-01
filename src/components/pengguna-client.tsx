
"use client";

import { useState, useEffect } from "react";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { Loader2 } from "lucide-react";

import { db } from "@/lib/firebase";
import type { UserSession } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSession } from "@/context/SessionContext";

export function PenggunaClient() {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const { sessionEstablished } = useSession();

  useEffect(() => {
    if (!sessionEstablished) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(collection(db, "user_sessions"), orderBy("loginTime", "desc"));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const sessionsData: UserSession[] = [];
      querySnapshot.forEach((doc) => {
        sessionsData.push({ id: doc.id, ...doc.data() } as UserSession);
      });
      setSessions(sessionsData);
      setLoading(false);
    }, (error: any) => {
      console.error("Firestore listener error:", error);
      if (error.code === 'permission-denied') {
        toast({
            variant: "destructive",
            title: "Akses Ditolak!",
            description: "Pastikan aturan keamanan Firestore (security rules) sudah benar.",
        });
      } else {
        toast({
            variant: "destructive",
            title: "Gagal Memuat Data",
            description: `Tidak dapat mengambil sesi pengguna. Error: ${error.code}`,
        });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [toast, sessionEstablished]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat('id-ID', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        day: '2-digit', month: 'long', year: 'numeric'
    }).format(date);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-none border-b bg-background p-4 md:p-6">
        <h1 className="text-2xl font-bold tracking-tight font-headline">Pengguna Aktif</h1>
        <p className="text-muted-foreground font-serif">Daftar pengguna yang telah masuk dan memulai sesi kerja.</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        {loading ? (
            <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        ) : (
        <Card>
          <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Pengguna</TableHead>
                    <TableHead>Posisi</TableHead>
                    <TableHead className="text-right">Waktu Masuk</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.length > 0 ? sessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium">{session.name}</TableCell>
                      <TableCell>{session.position}</TableCell>
                      <TableCell className="text-right">{formatDate(session.loginTime)}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={3} className="h-24 text-center">
                        Belum ada pengguna yang memulai sesi.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
          </CardContent>
        </Card>
        )}
      </div>
    </div>
  );
}
