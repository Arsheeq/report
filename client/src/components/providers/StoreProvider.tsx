import { ReactNode, createContext, useContext, useEffect } from "react";
import { useStore } from "@/lib/store";

type StoreProviderProps = {
  children: ReactNode;
};

// Create a context for the store
const StoreContext = createContext<boolean>(false);

export function StoreProvider({ children }: StoreProviderProps) {
  // Initialize the store if needed
  const initialized = useStore((state) => state.initialized);
  const initialize = useStore((state) => state.initialize);

  useEffect(() => {
    if (!initialized) {
      initialize();
    }
  }, [initialized, initialize]);

  return (
    <StoreContext.Provider value={initialized}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStoreInitialized() {
  return useContext(StoreContext);
}
