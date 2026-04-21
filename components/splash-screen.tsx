'use client';

import { useEffect, useState } from 'react';

export function SplashScreen() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // 최소 800ms 표시 후 페이드아웃
    const timer = setTimeout(() => setVisible(false), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center shadow-sm">
          <span className="text-4xl">📅</span>
        </div>
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-foreground">맞춰봄</h1>
          <p className="text-sm text-muted-foreground">일정을 함께 조율해요</p>
        </div>
        <div className="mt-4 h-1 w-24 overflow-hidden rounded-full bg-primary/10">
          <div className="h-full w-full origin-left animate-[loading_0.8s_ease-in-out_forwards] rounded-full bg-primary" />
        </div>
      </div>
      <style jsx>{`
        @keyframes loading {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
      `}</style>
    </div>
  );
}
