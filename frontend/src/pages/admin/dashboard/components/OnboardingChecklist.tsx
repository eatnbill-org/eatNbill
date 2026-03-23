import * as React from "react";
import { CheckCircle2, Circle, X, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

const DISMISSED_KEY = "eatnbill:onboarding_dismissed";

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  path: string;
  done: boolean;
}

interface OnboardingChecklistProps {
  hasProducts: boolean;
  hasTables: boolean;
  hasOrders: boolean;
}

export function OnboardingChecklist({ hasProducts, hasTables, hasOrders }: OnboardingChecklistProps) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = React.useState(() => localStorage.getItem(DISMISSED_KEY) === "true");
  const [collapsed, setCollapsed] = React.useState(false);

  const items: ChecklistItem[] = [
    {
      id: "products",
      label: "Add menu items",
      description: "Create your first product to start taking orders",
      path: "/admin/products",
      done: hasProducts,
    },
    {
      id: "tables",
      label: "Add tables",
      description: "Set up dining tables for dine-in orders",
      path: "/admin/company/tables",
      done: hasTables,
    },
    {
      id: "profile",
      label: "Configure receipt",
      description: "Add restaurant name, address, and GSTIN to your receipts",
      path: "/admin/company/profile",
      done: true, // assume configured if they've set up
    },
    {
      id: "orders",
      label: "Place first order",
      description: "Create your first order to verify the workflow",
      path: "/admin/orders",
      done: hasOrders,
    },
  ];

  const completedCount = items.filter((i) => i.done).length;
  const allDone = completedCount === items.length;

  if (dismissed || allDone) return null;

  return (
    <div className="bg-white border border-primary/20 rounded-2xl shadow-sm overflow-hidden">
      <div
        className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setCollapsed((c) => !c)}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 text-sm">Getting Started</h3>
            <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              {completedCount}/{items.length}
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 max-w-[200px]">
            <div
              className="h-1.5 bg-primary rounded-full transition-all"
              style={{ width: `${(completedCount / items.length) * 100}%` }}
            />
          </div>
        </div>
        <button
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
          onClick={(e) => { e.stopPropagation(); setDismissed(true); localStorage.setItem(DISMISSED_KEY, "true"); }}
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
        {collapsed ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
      </div>

      {!collapsed && (
        <div className="px-5 pb-4 space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-xl transition-all cursor-pointer",
                item.done ? "opacity-50" : "hover:bg-slate-50"
              )}
              onClick={() => !item.done && navigate(item.path)}
            >
              {item.done ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <Circle className="w-5 h-5 text-slate-300 shrink-0 mt-0.5" />
              )}
              <div>
                <p className={cn("text-sm font-semibold", item.done ? "line-through text-slate-400" : "text-slate-800")}>
                  {item.label}
                </p>
                {!item.done && (
                  <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
