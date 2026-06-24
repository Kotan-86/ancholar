// 仕様: README.md §① 7つの時間ブロック（Time Blocks）
import { BlockId } from "./BlockId.js";
import { Duration } from "./Duration.js";

export type FloorConstraint =
  | { kind: "fixed"; minutes: number }
  | { kind: "activeOnlyVariable" }
  | { kind: "none" };

export type DefenseLevel =
  | "absoluteAnchor"
  | "principle"
  | "absolute"
  | "cushion"
  | "variable"
  | "maxBuffer";

export type TimeBlockSpec = {
  blockId: BlockId;
  defaultDuration: Duration | null;
  floor: FloorConstraint;
  defenseLevel: DefenseLevel;
  isDurationFixed: boolean;
};

const SPECS: Record<BlockId, TimeBlockSpec> = {
  [BlockId.DOWN_TIME]: {
    blockId: BlockId.DOWN_TIME,
    defaultDuration: Duration.fromHours(1.5),
    floor: { kind: "fixed", minutes: 90 },
    defenseLevel: "absoluteAnchor",
    isDurationFixed: true,
  },
  [BlockId.SLEEP_TIME]: {
    blockId: BlockId.SLEEP_TIME,
    defaultDuration: Duration.fromHours(7),
    floor: { kind: "activeOnlyVariable" },
    defenseLevel: "principle",
    isDurationFixed: false,
  },
  [BlockId.WALK_TIME]: {
    blockId: BlockId.WALK_TIME,
    defaultDuration: Duration.fromHours(1),
    floor: { kind: "fixed", minutes: 60 },
    defenseLevel: "absolute",
    isDurationFixed: true,
  },
  [BlockId.FOCUS_TIME]: {
    blockId: BlockId.FOCUS_TIME,
    defaultDuration: Duration.fromHours(1.5),
    floor: { kind: "fixed", minutes: 10 },
    defenseLevel: "cushion",
    isDurationFixed: false,
  },
  [BlockId.WORK_TIME]: {
    blockId: BlockId.WORK_TIME,
    defaultDuration: null,
    floor: { kind: "none" },
    defenseLevel: "variable",
    isDurationFixed: false,
  },
  [BlockId.GRADATION_TIME]: {
    blockId: BlockId.GRADATION_TIME,
    defaultDuration: Duration.fromHours(1),
    floor: { kind: "fixed", minutes: 10 },
    defenseLevel: "variable",
    isDurationFixed: false,
  },
  [BlockId.FREE_TIME]: {
    blockId: BlockId.FREE_TIME,
    defaultDuration: Duration.fromHours(2),
    floor: { kind: "fixed", minutes: 30 },
    defenseLevel: "maxBuffer",
    isDurationFixed: false,
  },
};

export function getTimeBlockSpec(blockId: BlockId): TimeBlockSpec {
  return SPECS[blockId];
}

export function getFloorMinutes(spec: TimeBlockSpec): number {
  if (spec.floor.kind === "fixed") {
    return spec.floor.minutes;
  }
  if (spec.floor.kind === "none") {
    return 0;
  }
  return 0;
}

export function isDurationBelowFloor(
  spec: TimeBlockSpec,
  duration: Duration,
): boolean {
  if (spec.floor.kind === "fixed") {
    return duration.minutes < spec.floor.minutes;
  }
  if (spec.floor.kind === "none") {
    return false;
  }
  return false;
}
