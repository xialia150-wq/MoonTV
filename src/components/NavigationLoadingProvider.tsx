'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { createContext, Suspense, useCallback, useContext, useEffect, useState } from 'react';

interface NavigationLoadingContextType {
  isLoading: boolean;
  startLoading: () => void;
  stopLoading: () => void;
}

const NavigationLoadingContext = createContext<NavigationLoadingContextType>({
  isLoading: false,
  startLoading: () => {
    // Default implementation
  },
  stopLoading: () => {
    // Default implementation
  },
});

export const useNavigationLoading = () => useContext(NavigationLoadingContext);

// Isolate query-string reads so static page content can render independently.
function NavigationLoadingReset({ stopLoading }: { stopLoading: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 监听路由变化，自动停止加载状态
  useEffect(() => {
    // 路由变化完成后，停止加载
    const timer = setTimeout(() => {
      stopLoading();
    }, 300); // 给一个短暂延迟确保页面已经渲染

    return () => clearTimeout(timer);
  }, [pathname, searchParams, stopLoading]);

  return null;
}

export function NavigationLoadingProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);

  const startLoading = useCallback(() => {
    setIsLoading(true);
  }, []);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
  }, []);

  return (
    <NavigationLoadingContext.Provider value={{ isLoading, startLoading, stopLoading }}>
      <Suspense fallback={null}>
        <NavigationLoadingReset stopLoading={stopLoading} />
      </Suspense>
      {children}
    </NavigationLoadingContext.Provider>
  );
}

