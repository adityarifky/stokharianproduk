"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from "next/navigation";
import { signOut, onAuthStateChanged, updateProfile, type User } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
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
import { auth, storage } from "@/lib/firebase";

export function UserNav() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser?.photoURL) {
        setPreviewUrl(currentUser.photoURL);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleProfileUpdate = async () => {
    if (!selectedFile || !user) return;

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `profile-pictures/${user.uid}`);
      await uploadBytes(storageRef, selectedFile);
      const photoURL = await getDownloadURL(storageRef);
      await updateProfile(user, { photoURL });

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
    setPreviewUrl(user?.photoURL || null);
    setSelectedFile(null);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user?.photoURL || "https://placehold.co/100x100.png"} alt="@pengguna" data-ai-hint="user avatar" />
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
              <AvatarImage src={previewUrl || user?.photoURL || "https://placehold.co/100x100.png"} alt="Pratinjau Profil" data-ai-hint="user avatar preview" />
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