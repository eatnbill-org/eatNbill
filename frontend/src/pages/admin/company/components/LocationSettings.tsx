import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Clock } from "lucide-react";
import { Input } from "@/components/ui/input";

interface LocationSettingsProps {
  data: {
    opening_hours?: any;
    closing_hours?: any;
  };
  onChange: (data: any) => void;
}

export function LocationSettings({ data, onChange }: LocationSettingsProps) {
  // Helpers to get/set simple string time "HH:MM"
  const getOpenTime = () => {
    // specific logic if opening_hours is object
    if (typeof data.opening_hours === 'string') return data.opening_hours;
    return data.opening_hours?.default || "";
  };

  const getCloseTime = () => {
    if (typeof data.closing_hours === 'string') return data.closing_hours;
    return data.closing_hours?.default || "";
  };

  const handleOpenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Store as simple object for now
    onChange({ ...data, opening_hours: { default: val } });
  };

  const handleCloseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange({ ...data, closing_hours: { default: val } });
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-orange-600" /> Business Hours
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Opening Time</Label>
            <Input
              type="time"
              value={getOpenTime()}
              onChange={handleOpenChange}
            />
          </div>
          <div className="space-y-2">
            <Label>Closing Time</Label>
            <Input
              type="time"
              value={getCloseTime()}
              onChange={handleCloseChange}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}