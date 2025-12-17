import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ScenarioState {
  scenario: string | null;
  setScenario: (value: string) => void;
  resetScenario: () => void;
}

export const useScenarioStore = create<ScenarioState>()(
  persist(
    (set) => ({
      scenario: null,
      setScenario: (value) => set({ scenario: value }),
      resetScenario: () => set({ scenario: null }),
    }),
    {
      name: "scenario-storage", // localStorage key
    }
  )
);
