import { createContext } from "react";

import { initialCoreState } from "./reducer";
import type { OkoCoreAction, OkoCoreState } from "./types";

export interface OkoContextValue {
  state: OkoCoreState;
  dispatch: React.Dispatch<OkoCoreAction>;
}

export const OkoContext = createContext<OkoContextValue>({
  state: initialCoreState,
  dispatch: () => {
    throw new Error("[oko-react] useOko must be used within <OkoProvider>");
  },
});
