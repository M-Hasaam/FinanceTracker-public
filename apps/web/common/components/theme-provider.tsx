'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  React.useEffect(() => {
    const setRootFontSize = () => {
      const dpr = window.devicePixelRatio || 1;

      // Detect desktop: simple check via window width (adjust threshold if needed)
      const isDesktop = window.innerWidth >= 1024;

      if (!isDesktop) return; // Don't change font size on mobile

      if (dpr < 1) return; // Don't scale for low DPR

      const base = 16; // base 1rem = 16px
      const maxDpr = 1.5;
      const scale = 1 / Math.min(dpr, maxDpr); // divide by DPR, cap at maxDpr

      document.documentElement.style.fontSize = `${base * scale}px`;
      console.log('DPR:', dpr, '1rem =', base * scale, 'px');
    };

    setRootFontSize();
    window.addEventListener('resize', setRootFontSize);

    return () => window.removeEventListener('resize', setRootFontSize);
  }, []);

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
