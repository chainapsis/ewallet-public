import type { FC, PropsWithChildren } from "react";
import { createContext, useContext, useEffect } from "react";

const MobileModeContext = createContext(false);

export const MobileModeProvider: FC<
  PropsWithChildren<{ enabled: boolean }>
> = ({ enabled, children }) => {
  useEffect(() => {
    if (enabled) {
      document.documentElement.setAttribute("data-mobile", "");
    }
    return () => {
      document.documentElement.removeAttribute("data-mobile");
    };
  }, [enabled]);

  return (
    <MobileModeContext.Provider value={enabled}>
      {children}
    </MobileModeContext.Provider>
  );
};

export function useMobileMode(): boolean {
  return useContext(MobileModeContext);
}
