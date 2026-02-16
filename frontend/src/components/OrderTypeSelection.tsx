import { cn } from "@/lib/utils";

export type WaiterOrderType = "DINE_IN" | "TAKEAWAY" | "DELIVERY";

type Props = {
  value: WaiterOrderType;
  onChange: (value: WaiterOrderType) => void;
  disabled?: boolean;
};

const OPTIONS: Array<{ value: WaiterOrderType; label: string }> = [
  { value: "DINE_IN", label: "Dine-In" },
  { value: "TAKEAWAY", label: "Takeaway" },
  { value: "DELIVERY", label: "Delivery" },
];

export default function OrderTypeSelection({ value, onChange, disabled = false }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1.5">
      {OPTIONS.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-xl px-3 py-2 text-xs font-bold transition-colors",
              active ? "bg-white text-primary shadow-sm" : "text-slate-600 hover:bg-white/60",
              disabled && "cursor-not-allowed opacity-60"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
