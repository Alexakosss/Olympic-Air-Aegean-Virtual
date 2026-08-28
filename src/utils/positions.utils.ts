import type { StaffUpPosition } from "../schemas/staffup.schema.ts";

export const formatStaffupPositions = (
  positions: StaffUpPosition[],
  fallback = "None",
  withNotes = false,
): string => {
  if (!positions.length) return fallback;

  return positions
    .map(
      (pos) =>
        `\`${pos.position}\`: <@${pos.userId}> ${pos.notes && withNotes ? `*Notes: ${pos.notes}*` : ""}`,
    )
    .join("\n");
};
