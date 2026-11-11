import { createContext, useContext } from "react";
import type { User } from "./auth/authService";
import type { Dataset, RegionId } from "./data/types";

export interface AppCtx {
  ds: Dataset;
  user: User;
  canEdit: boolean;
  scopeRegions: RegionId[];
  logout: () => void;
}

export const AppContext = createContext<AppCtx | null>(null);

export function useApp(): AppCtx {
  const c = useContext(AppContext);
  if (!c) throw new Error("AppContext em falta");
  return c;
}
