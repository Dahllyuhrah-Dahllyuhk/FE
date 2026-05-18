'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

export function BackButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
    >
      <ChevronLeft className="h-4 w-4" />
      뒤로가기
    </button>
  );
}
