
"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from "next/navigation";
import { signOut, onAuthStateChanged, type User } from "firebase/auth";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
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
import { useToast } from "@/hooks/use-toast";
import { LogOut, User as UserIcon, Loader2, Camera } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { useSession } from '@/context/SessionContext';

// Helper to convert file to Data URI
const fileToDataUri = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result as string);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

export function UserNav() {
  const router = useRouter();
  const { sessionEstablished, setSessionEstablished, setSessionInfo } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    let unsubscribeProfile: () => void = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      
      unsubscribeProfile();

      if (currentUser) {
        if (sessionEstablished) {
          const profileDocRef = doc(db, "userProfiles", currentUser.uid);
          unsubscribeProfile = onSnapshot(profileDocRef, (docSnap) => {
            if (docSnap.exists() && docSnap.data().photoURL) {
              setAvatarUrl(docSnap.data().photoURL);
            } else {
              setAvatarUrl(currentUser.photoURL || null);
            }
          }, (error) => {
             console.error("Failed to fetch user profile:", error);
             setAvatarUrl(currentUser.photoURL || null);
          });
        } else {
          setAvatarUrl(currentUser.photoURL || null);
        }
      } else {
        setAvatarUrl(null);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeProfile();
    };
  }, [sessionEstablished]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
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
    if (!selectedFile || !user) return;

    setIsUploading(true);
    try {
      const photoDataUri = await fileToDataUri(selectedFile);
      const profileDocRef = doc(db, "userProfiles", user.uid);
      await setDoc(profileDocRef, { photoURL: photoDataUri }, { merge: true });

      toast({
        title: "Sukses",
        description: "Foto profil berhasil diperbarui.",
      });

      setIsProfileDialogOpen(false);
      setSelectedFile(null);
    } catch (error) {
      console.error("Profile update error:", error);
      toast({
        variant: "destructive",
        title: "Gagal",
        description: "Gagal memperbarui foto profil.",
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  const openDialog = () => {
    setIsProfileDialogOpen(true);
    setPreviewUrl(avatarUrl);
    setSelectedFile(null);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full" disabled={!sessionEstablished}>
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
              <p className="text-sm font-medium leading-none">{user?.displayName || "Pengguna"}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user?.email || "pengguna@dreampuff.com"}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onSelect={openDialog}>
              <UserIcon className="mr-2 h-4 w-4" />
              <span>Profil</span>
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
            <DialogTitle>Ubah Foto Profil</DialogTitle>
            <DialogDescription>
              Pilih gambar baru dari perangkat Anda untuk dijadikan foto profil.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={previewUrl || "https://placehold.co/100x100.png"} alt="Pratinjau Profil" data-ai-hint="user avatar preview" />
              <AvatarFallback>
                {user?.email ? user.email.charAt(0).toUpperCase() : <UserIcon />}
              </AvatarFallback>
            </Avatar>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
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
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsProfileDialogOpen(false)} disabled={isUploading}>
              Batal
            </Button>
            <Button onClick={handleProfileUpdate} disabled={!selectedFile || isUploading}>
              {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
