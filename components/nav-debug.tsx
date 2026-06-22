'use client';

// ⚠️ 임시 진단용 컴포넌트. 원인 파악 후 제거 예정.
// 하단 탭을 탭했을 때 터치가 실제로 nav 버튼에 도달하는지, 아니면 다른 요소(오버레이)가
// 그 지점을 덮고 있는지를 화면 상단에 표시한다.

import { useEffect, useState } from 'react';

export function NavDebug() {
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    const fmt = (el: Element | null) => {
      if (!el) return 'null';
      const cls = String((el as HTMLElement).className || '').split(/\s+/).filter(Boolean).slice(0, 2).join('.');
      return `${el.tagName}${cls ? '.' + cls : ''}`.slice(0, 38);
    };
    const handler = (e: any) => {
      const x = e.clientX ?? (e.touches && e.touches[0]?.clientX) ?? 0;
      const y = e.clientY ?? (e.touches && e.touches[0]?.clientY) ?? 0;
      const top = document.elementFromPoint(x, y);
      const tgtInNav = !!(e.target?.closest && e.target.closest('nav'));
      const topInNav = !!(top?.closest && top.closest('nav'));
      const line = `${e.type} @${Math.round(x)},${Math.round(y)} | tgt=${fmt(e.target)} | top=${fmt(top)} | nav(tgt:${tgtInNav ? 'Y' : 'N'},top:${topInNav ? 'Y' : 'N'}) | ${location.pathname}`;
      setLog((prev) => [line, ...prev].slice(0, 6));
    };
    document.addEventListener('pointerdown', handler, true);
    document.addEventListener('click', handler, true);
    return () => {
      document.removeEventListener('pointerdown', handler, true);
      document.removeEventListener('click', handler, true);
    };
  }, []);

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99999,
        background: 'rgba(0,0,0,0.85)', color: '#0f0',
        font: '10px/1.35 monospace', padding: '4px 6px',
        pointerEvents: 'none', whiteSpace: 'pre-wrap', maxHeight: '40vh', overflow: 'hidden',
      }}
    >
      {log.length === 0 ? 'NAVDEBUG: 하단 탭을 탭해보세요' : log.join('\n')}
    </div>
  );
}
