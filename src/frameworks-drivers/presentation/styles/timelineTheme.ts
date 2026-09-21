// 仕様: docs/spec/presentation-uc1.md#2-3-4-配色と文字色の対応表
// 配色・文字色の対応表(単一の定義元)。すべて静的な文字列リテラル(Tailwind が検出できるように)。

const DEFAULT_BLOCK_SURFACE = "bg-slate-600 text-white";

const BLOCK_SURFACE: Record<string, string> = {
  DOWN_TIME: "bg-indigo-300 text-slate-900",
  SLEEP_TIME: "bg-purple-700 text-white",
  WALK_TIME: "bg-amber-800 text-white",
  FOCUS_TIME: "bg-red-800 text-white",
  GRADATION_TIME: "bg-emerald-700 text-white",
  FREE_TIME: "bg-blue-700 text-white",
};

export function blockSurfaceClassName(blockId: string): string {
  return Object.hasOwn(BLOCK_SURFACE, blockId)
    ? BLOCK_SURFACE[blockId]!
    : DEFAULT_BLOCK_SURFACE;
}

export const TASK_SURFACE_CLASS_NAME = "bg-[#6e72c3] text-white";

export const TIMELINE_ERROR_CLASS_NAME = "bg-red-950 text-red-100 border border-red-800";
