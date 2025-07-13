
"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from "next/navigation";
import { signOut, onAuthStateChanged, type User } from "firebase/auth";
import { doc, onSnapshot, setDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from "@/hooks/use-toast";
import { LogOut, User as UserIcon, Loader2, Camera, Edit } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { useSession } from '@/context/SessionContext';
import { ImagePreviewDialog } from './image-preview-dialog';
import type { UserProfile } from '@/lib/types';


// Helper to convert file to Data URI
const fileToDataUri = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result as string);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

export function UserNav({ userProfile }: { userProfile: UserProfile | null }) {
  const router = useRouter();
  const { sessionEstablished, setSessionEstablished, setSessionInfo, sessionInfo } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [statusNote, setStatusNote] = useState("");

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('lastSessionStart');
      setSessionEstablished(false);
      setSessionInfo(null);
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { // 1MB limit for Data URI in Firestore
        toast({
          variant: "destructive",
          title: "Ukuran Gambar Terlalu Besar",
          description: "Ukuran gambar maksimal adalah 1MB.",
        });
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleProfileUpdate = async () => {
    if (!user) return;
    if (!selectedFile && statusNote === (userProfile?.statusNote || "")) {
        toast({ title: "Tidak ada perubahan", description: "Tidak ada data baru untuk disimpan." });
        return;
    }
    
    setIsUploading(true);
    try {
      const profileDocRef = doc(db, "userProfiles", user.uid);
      const updates: { photoURL?: string, statusNote?: string } = {};

      if (selectedFile) {
        updates.photoURL = await fileToDataUri(selectedFile);
      }
      if (statusNote !== (userProfile?.statusNote || "")) {
        updates.statusNote = statusNote;
      }
      
      await setDoc(profileDocRef, updates, { merge: true });

      toast({
        title: "Sukses",
        description: "Profil berhasil diperbarui.",
      });

      setIsProfileDialogOpen(false);
    } catch (error) {
      console.error("Profile update error:", error);
      toast({
        variant: "destructive",
        title: "Gagal",
        description: "Gagal memperbarui profil.",
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  const openDialog = () => {
    setPreviewUrl(userProfile?.photoURL || null);
    setStatusNote(userProfile?.statusNote || "");
    setSelectedFile(null);
    setIsProfileDialogOpen(true);
  }

  const avatarUrl = userProfile?.photoURL || user?.photoURL;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-9 w-9 rounded-full" disabled={!sessionEstablished}>
            <Avatar className="h-9 w-9">
              <AvatarImage src={avatarUrl || "https://placehold.co/100x100.png"} alt="@pengguna" data-ai-hint="user avatar" />
              <AvatarFallback>
                {user?.email ? user.email.charAt(0).toUpperCase() : <UserIcon />}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{sessionInfo?.name || "Pengguna"}</p>
              <p className="text-xs leading-none text-muted-foreground font-serif">
                {sessionInfo?.position || "Posisi"}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onSelect={openDialog}>
              <Edit className="mr-2 h-4 w-4" />
              <span>Profil & Catatan</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Keluar</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Profil & Catatan</DialogTitle>
            <DialogDescription>
              Ubah foto profil atau perbarui catatan status Anda.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
              <div className="space-y-4">
                <Label className="text-sm font-medium text-center block">Foto Profil</Label>
                <div className="flex flex-col items-center gap-2">
                  <Avatar className="h-20 w-20">
                      <AvatarImage src={previewUrl || "https://placehold.co/100x100.png"} alt="Pratinjau Profil" data-ai-hint="user avatar preview" />
                      <AvatarFallback>
                        {user?.email ? user.email.charAt(0).toUpperCase() : <UserIcon />}
                      </AvatarFallback>
                  </Avatar>
                  <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                    <Camera className="mr-2 h-4 w-4" />
                    Pilih Gambar
                  </Button>
                   <Input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/png, image/jpeg"
                    onChange={handleFileChange}
                    disabled={isUploading}
                   />
                </div>
              </div>

              <div className="space-y-2">
                 <Label htmlFor="status-note" className="text-sm font-medium">Catatan/Status</Label>
                 <Textarea 
                   id="status-note"
                   placeholder="Lagi sibuk..."
                   value={statusNote}
                   onChange={(e) => setStatusNote(e.target.value)}
                   disabled={isUploading}
                   maxLength={100}
                 />
                 <p className="text-xs text-muted-foreground text-right">{statusNote.length} / 100</p>
              </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProfileDialogOpen(false)} disabled={isUploading}>
              Batal
            </Button>
            <Button onClick={handleProfileUpdate} disabled={isUploading}>
              {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
