'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import Image from 'next/image';

interface ImagePreviewDialogProps {
  imageUrl: string | null;
  imageAlt?: string;
  onClose: () => void;
}

export function ImagePreviewDialog({ imageUrl, imageAlt = "Pratinjau Gambar", onClose }: ImagePreviewDialogProps) {
  return (
    <Dialog open={!!imageUrl} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl w-auto p-0 bg-transparent border-0 shadow-none">
        <DialogHeader className="sr-only">
          <DialogTitle>Pratinjau Gambar</DialogTitle>
          <DialogDescription>{imageAlt}</DialogDescription>
        </DialogHeader>
        {imageUrl && (
          <div className="relative">
            <Image
              src={imageUrl}
              alt={imageAlt}
              width={800}
              height={800}
              className="object-contain rounded-lg max-h-[85vh] w-auto"
              data-ai-hint="image preview"
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
