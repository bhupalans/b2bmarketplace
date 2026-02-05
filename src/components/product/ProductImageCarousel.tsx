'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

type Props = {
  images: string[];
  title: string;
};

export default function ProductImageCarousel({ images, title }: Props) {
  const [open, setOpen] = useState(false);
  const [activeImage, setActiveImage] = useState<string | null>(null);

  const imageList = images?.length ? images : ['https://placehold.co/600x600'];

  return (
    <>
      <Carousel className="w-full">
        <CarouselContent>
          {imageList.map((imgSrc, index) => (
            <CarouselItem key={index}>
              <div
                className="relative w-full h-[420px] bg-white flex items-center justify-center cursor-zoom-in"
                onClick={() => {
                  setActiveImage(imgSrc);
                  setOpen(true);
                }}
              >
                <Image
                  src={imgSrc}
                  alt={`${title} - image ${index + 1}`}
                  fill
                  className="object-contain"
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="absolute left-4" />
        <CarouselNext className="absolute right-4" />
      </Carousel>

      {open && activeImage && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
          <button
            className="absolute top-4 right-4 text-white text-3xl"
            onClick={() => setOpen(false)}
          >
            ✕
          </button>

          <div className="relative w-[90vw] h-[90vh] bg-white p-4">
            <Image
              src={activeImage}
              alt="Product image zoom"
              fill
              className="object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}
