import { z } from "zod";

/**
 * Schema for updating KDS settings
 * Only OWNER and MANAGER can update settings
 */
export const updateKdsSettingsSchema = z.object({
  sound_enabled: z.boolean().optional(),
  auto_clear_completed_after_seconds: z
    .number()
    .int()
    .min(30, "Auto-clear must be at least 30 seconds")
    .max(3600, "Auto-clear cannot exceed 3600 seconds (1 hour)")
    .optional(),
});

/**
 * Query params for KDS orders endpoint
 */
export const kdsOrdersQuerySchema = z.object({
  // Optional status filter (show only specific statuses)
  status: z
    .enum(["PLACED", "CONFIRMED", "PREPARING", "READY"])
    .optional(),
});

// Export types
export type UpdateKdsSettingsInput = z.infer<typeof updateKdsSettingsSchema>;
export type KdsOrdersQuery = z.infer<typeof kdsOrdersQuerySchema>;
