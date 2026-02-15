import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { MapPin, Phone, Mail } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

interface ContactInfoProps {
  data: any;
  onChange: (data: any) => void;
}

export function ContactInfo({ data, onChange }: ContactInfoProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-600" /> Address
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input
              type="tel"
              value={data.phone || ""}
              onChange={(e) => onChange({ ...data, phone: e.target.value })}
              placeholder="e.g. +91 98765 43210"
            />
          </div>
          <div className="space-y-2">
            <Label>Email Address</Label>
            <Input
              type="email"
              value={data.email || ""}
              onChange={(e) => onChange({ ...data, email: e.target.value })}
              placeholder="e.g. contact@restaurant.com"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Restaurant Address</Label>
          <Textarea
            value={data.address || ""}
            onChange={(e) => onChange({ ...data, address: e.target.value })}
            rows={4}
            className="resize-none"
            placeholder="Enter your restaurant's full address"
          />
        </div>
      </CardContent>
    </Card>
  );
}