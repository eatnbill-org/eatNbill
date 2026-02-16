import * as React from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

interface DateRangePickerProps {
    value?: DateRange;
    onChange: (range: DateRange | undefined) => void;
    className?: string;
}

const presets = [
    {
        label: "Last 7 Days",
        getValue: () => ({
            from: subDays(new Date(), 6),
            to: new Date()
        })
    },
    {
        label: "Last 30 Days",
        getValue: () => ({
            from: subDays(new Date(), 29),
            to: new Date()
        })
    },
    {
        label: "This Month",
        getValue: () => ({
            from: startOfMonth(new Date()),
            to: endOfMonth(new Date())
        })
    },
    {
        label: "Last Month",
        getValue: () => {
            const lastMonth = subDays(startOfMonth(new Date()), 1);
            return {
                from: startOfMonth(lastMonth),
                to: endOfMonth(lastMonth)
            };
        }
    },
    {
        label: "This Year",
        getValue: () => ({
            from: startOfYear(new Date()),
            to: endOfYear(new Date())
        })
    }
];

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
    const [isOpen, setIsOpen] = React.useState(false);

    const handlePresetClick = (preset: typeof presets[0]) => {
        onChange(preset.getValue());
        setIsOpen(false);
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        "justify-start text-left font-normal",
                        !value && "text-muted-foreground",
                        className
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {value?.from ? (
                        value.to ? (
                            <>
                                {format(value.from, "LLL dd, y")} -{" "}
                                {format(value.to, "LLL dd, y")}
                            </>
                        ) : (
                            format(value.from, "LLL dd, y")
                        )
                    ) : (
                        <span>Pick a date range</span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
                <div className="flex">
                    <div className="border-r p-3 space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                            Presets
                        </p>
                        {presets.map((preset) => (
                            <Button
                                key={preset.label}
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start font-normal text-xs"
                                onClick={() => handlePresetClick(preset)}
                            >
                                {preset.label}
                            </Button>
                        ))}
                    </div>
                    <div className="p-3">
                        <Calendar
                            mode="range"
                            defaultMonth={value?.from}
                            selected={value}
                            onSelect={onChange}
                            numberOfMonths={2}
                            disabled={(date) =>
                                date > new Date() || date < new Date("2020-01-01")
                            }
                        />
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
