import type { IntegrationPlatform } from "@prisma/client";
import type { PlatformAdapter } from "./types";
import { zomatoAdapter } from "./zomato.adapter";
import { swiggyAdapter } from "./swiggy.adapter";

export * from "./types";
export { zomatoAdapter } from "./zomato.adapter";
export { swiggyAdapter } from "./swiggy.adapter";

/**
 * Get adapter for a given platform
 */
export function getAdapter(platform: IntegrationPlatform): PlatformAdapter {
  switch (platform) {
    case "ZOMATO":
      return zomatoAdapter;
    case "SWIGGY":
      return swiggyAdapter;
    default:
      throw new Error(`Unknown platform: ${platform}`);
  }
}
