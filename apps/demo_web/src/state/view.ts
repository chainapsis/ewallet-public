import { create } from "zustand";

interface ViewState {
  isLeftBarOpen: boolean;
}

interface ViewAction {
  toggleLeftBarOpen: () => void;
}

export const useViewState = create<ViewState & ViewAction>((set) => ({
  isLeftBarOpen: false,
  toggleLeftBarOpen: () => {
    set((state) => ({ isLeftBarOpen: !state.isLeftBarOpen }));
  },
}));
