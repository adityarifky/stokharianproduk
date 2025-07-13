
"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from "next/navigation";
import { signOut, onAuthStateChanged, type User } from "firebase/auth";
import { doc, onSnapshot, setDoc, addDoc, collection, query, where, orderBy, limit, Timestamp } from "firebase/firestore";
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
import { LogOut, User as UserIcon, Loader2, Camera, PlusCircle } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { useSession } from '@/context/SessionContext';
import { ImagePreviewDialog } from './image-preview-dialog';
import { Separator } from './ui/separator';
import { cn } from '@/lib/utils';
import type { Story } from '@/lib/types';
import Image from 'next/image';


// Helper to convert file to Data URI
const fileToDataUri = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result as string);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

export function UserNav() {
  const router = useRouter();
  const { sessionEstablished, setSessionEstablished, setSessionInfo, sessionInfo } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const [story, setStory] = useState<Story | null>(null);
  const [isStoryViewerOpen, setIsStoryViewerOpen] = useState(false);

  useEffect(() => {
    let unsubscribeProfile: () => void = () => {};
    let unsubscribeStory: () => void = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      
      unsubscribeProfile();
      unsubscribeStory();

      if (currentUser) {
          const profileDocRef = doc(db, "userProfiles", currentUser.uid);
          unsubscribeProfile = onSnapshot(profileDocRef, (docSnap) => {
            if (docSnap.exists() && docSnap.data().photoURL) {
              setAvatarUrl(docSnap.data().photoURL);
            } else {
              setAvatarUrl(currentUser.photoURL || null);
            }
          });
          
          const twentyFourHoursAgo = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
          const storyQuery = query(
            collection(db, "stories"),
            where("userId", "==", currentUser.uid),
            where("timestamp", ">=", twentyFourHoursAgo),
            orderBy("timestamp", "desc"),
            limit(1)
          );

          unsubscribeStory = onSnapshot(storyQuery, (snapshot) => {
            if (!snapshot.empty) {
              setStory({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Story);
            } else {
              setStory(null);
            }
          });
      } else {
        setAvatarUrl(null);
        setStory(null);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeProfile();
      unsubscribeStory();
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

  const handleUpdate = async (type: 'profile' | 'story') => {
    if (!selectedFile || !user) return;
    setIsUploading(true);

    try {
        const photoDataUri = await fileToDataUri(selectedFile);
        if (type === 'profile') {
            const profileDocRef = doc(db, "userProfiles", user.uid);
            await setDoc(profileDocRef, { photoURL: photoDataUri }, { merge: true });
            toast({ title: "Sukses", description: "Foto profil berhasil diperbarui." });
        } else {
            await addDoc(collection(db, "stories"), {
                userId: user.uid,
                storyImageUrl: photoDataUri,
                timestamp: serverTimestamp(),
            });
            toast({ title: "Sukses", description: "Story berhasil ditambahkan." });
        }
        setIsProfileDialogOpen(false);
    } catch (error) {
        console.error(`${type} update error:`, error);
        toast({ variant: "destructive", title: "Gagal", description: `Gagal memperbarui ${type}.` });
    } finally {
        setIsUploading(false);
        setSelectedFile(null);
        setPreviewUrl(null);
    }
  }

  const handleTriggerClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (story) {
        event.preventDefault(); // Prevent dropdown from opening if there's a story
        setIsStoryViewerOpen(true);
    }
    // If no story, the dropdown opens by default
  }
  
  const openDialog = () => {
    setIsProfileDialogOpen(true);
    setPreviewUrl(avatarUrl);
    setSelectedFile(null);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            onClick={handleTriggerClick}
            disabled={!sessionEstablished}
            className={cn(
              "relative rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              story && "p-0.5"
            )}
            aria-label="User menu"
          >
            {story && (
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 animate-spin-slow" />
            )}
            <Avatar className="h-9 w-9 border-2 border-background">
              <AvatarImage src={avatarUrl || "https://placehold.co/100x100.png"} alt="@pengguna" data-ai-hint="user avatar" />
              <AvatarFallback>
                {user?.email ? user.email.charAt(0).toUpperCase() : <UserIcon />}
              </AvatarFallback>
            </Avatar>
          </button>
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
              <UserIcon className="mr-2 h-4 w-4" />
              <span>Profil & Story</span>
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
            <DialogTitle>Profil & Story</DialogTitle>
            <DialogDescription>
              Ubah foto profil Anda atau tambahkan story baru.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
              <div className="space-y-4">
                <p className="text-sm font-medium text-center">Foto Profil</p>
                <div className="flex flex-col items-center gap-2">
                  <Avatar className="h-20 w-20">
                      <AvatarImage src={previewUrl || avatarUrl || "https://placehold.co/100x100.png"} alt="Pratinjau Profil" data-ai-hint="user avatar preview" />
                      <AvatarFallback>
                        {user?.email ? user.email.charAt(0).toUpperCase() : <UserIcon />}
                      </AvatarFallback>
                  </Avatar>
                  <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                    <Camera className="mr-2 h-4 w-4" />
                    Pilih Gambar
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-4 text-center">
                 <p className="text-sm font-medium">Story</p>
                 <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Tambah Story Baru
                 </Button>
                 <p className="text-xs text-muted-foreground font-serif px-4">Story akan hilang setelah 24 jam.</p>
              </div>

              {selectedFile && previewUrl && (
                <div className="space-y-4 pt-4 border-t">
                  <p className="text-sm font-medium text-center">Pratinjau & Simpan</p>
                  <div className="flex justify-center">
                     <Image src={previewUrl} alt="Preview" width={200} height={200} className="rounded-md object-contain max-h-48" />
                  </div>
                  <div className="flex justify-center gap-2">
                      <Button onClick={() => handleUpdate('profile')} disabled={isUploading}>
                        {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                        Simpan sebagai Profil
                      </Button>
                      <Button onClick={() => handleUpdate('story')} disabled={isUploading}>
                         {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                        Upload sebagai Story
                      </Button>
                  </div>
                </div>
              )}

              <Input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/png, image/jpeg"
                onChange={handleFileChange}
              />
          </div>
        </DialogContent>
      </Dialog>
      <ImagePreviewDialog
        imageUrl={isStoryViewerOpen ? story?.storyImageUrl : null}
        onClose={() => setIsStoryViewerOpen(false)}
        imageAlt="User Story"
      />
    </>
  );
}
