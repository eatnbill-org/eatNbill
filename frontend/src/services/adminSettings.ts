// 📁 src/services/adminSettings.ts
// ✅ SIRF YEH CODE PASTE KARO

import { supabase } from "@/integrations/supabase/client";

// ============================================================
// 1. LOAD (Supabase se data lana)
// ============================================================

export async function loadAdminPreferences(userId: string) {
  try {
    const { data, error } = await supabase
      .from("admin_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error loading preferences:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}

// ============================================================
// 2. SAVE (Supabase mein data dalna)
// ============================================================

export async function saveAdminPreferences(
  userId: string,
  preferences: any
) {
  try {
    const { data, error } = await supabase
      .from("admin_preferences")
      .upsert({
        user_id: userId,
        ...preferences,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error saving:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}

// ============================================================
// 3. UPDATE SIDEBAR (Sidebar show/hide karna)
// ============================================================

export async function updateSidebarVisibility(
  userId: string,
  showCampaigns: boolean,
  showCustomers: boolean
) {
  return saveAdminPreferences(userId, {
    show_campaigns: showCampaigns,
    show_customers: showCustomers,
  });
}

// ============================================================
// 4. UPDATE DASHBOARD FIELDS (Form fields show/hide karna)
// ============================================================

export async function updateDashboardFields(
  userId: string,
  fields: {
    showName: boolean;
    showNumber: boolean;
    showArriveAt: boolean;
    showSource: boolean;
    showSpecialInstructions: boolean;
  }
) {
  return saveAdminPreferences(userId, {
    show_name: fields.showName,
    show_number: fields.showNumber,
    show_arrive_at: fields.showArriveAt,
    show_source: fields.showSource,
    show_special_instructions: fields.showSpecialInstructions,
  });
}

// ============================================================
// 5. UPDATE ADMIN PIN (Pin badalna)
// ============================================================

export async function updateAdminPin(userId: string, pin: string) {
  if (pin.length < 4) {
    throw new Error("PIN kam se kam 4 digits ka hona chahiye");
  }

  return saveAdminPreferences(userId, {
    admin_pin: pin,
  });
}

// ============================================================
// 6. UPDATE EMAIL (Email badalna)
// ============================================================

export async function updateAdminEmail(userId: string, email: string) {
  if (!email.includes("@")) {
    throw new Error("Sahi email dalo");
  }

  return saveAdminPreferences(userId, {
    email,
  });
}

// ============================================================
// 7. UPDATE ALERTS (Alert sounds update karna)
// ============================================================

export async function updateAlertSound(
  userId: string,
  alertType: string,
  enabled: boolean,
  soundUrl?: string
) {
  const current = await loadAdminPreferences(userId);
  if (!current) return null;

  const updatedAlerts = {
    ...current.alerts,
    [alertType]: {
      enabled,
      soundUrl: soundUrl || current.alerts[alertType]?.soundUrl || "",
    },
  };

  return saveAdminPreferences(userId, {
    alerts: updatedAlerts,
  });
}

// ============================================================
// 8. VERIFY PIN (Pin check karna - login ke time)
// ============================================================

export async function verifyAdminPin(
  userId: string,
  enteredPin: string
): Promise<boolean> {
  try {
    const prefs = await loadAdminPreferences(userId);
    if (!prefs) return false;
    return prefs.admin_pin === enteredPin;
  } catch {
    return false;
  }
}