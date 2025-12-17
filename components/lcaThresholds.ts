// 시나리오별 탄소 한계값
export const thresholds = {
    "material-change": 4.37,
    "size-change": 19.78,
    "structure-change": 36.25,
} as const;

export type ScenarioKey = keyof typeof thresholds;