import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BellRing, CalendarClock, Clock3, MapPin, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ReservationAlert } from "@/types/reservation";

type Props = {
  alert: ReservationAlert | null;
  onDismiss: () => void;
  onViewReservations?: () => void;
};

function formatAlertTitle(eventType: ReservationAlert["event_type"]) {
  return eventType === "T_MINUS_10"
    ? "Reservation In 10 Minutes"
    : "Reservation Time Started";
}

function formatLocalTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ReservationAlertPopup({
  alert,
  onDismiss,
  onViewReservations,
}: Props) {
  return (
    <AnimatePresence>
      {alert && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 80, transition: { duration: 0.18 } }}
          className="fixed bottom-4 right-4 left-4 md:left-auto z-[10000] md:w-full md:max-w-md"
        >
          <div className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-amber-500 px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                <BellRing className="h-4 w-4" />
                <span className="text-xs font-black uppercase tracking-widest">
                  Reservation Alert
                </span>
              </div>
              <button
                type="button"
                className="text-white/90 hover:text-white"
                onClick={onDismiss}
                aria-label="Dismiss reservation alert"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black text-slate-900">
                  {formatAlertTitle(alert.event_type)}
                </p>
                <Badge variant="outline" className="border-amber-300 text-amber-700">
                  {alert.event_type === "T_MINUS_10" ? "T-10" : "START"}
                </Badge>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <span className="font-semibold">
                    Table {alert.reservation.table?.table_number || alert.reservation.table_id}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Users className="h-4 w-4 text-slate-400" />
                  <span>
                    {alert.reservation.customer_name} ({alert.reservation.party_size} guests)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <CalendarClock className="h-4 w-4 text-slate-400" />
                  <span>From {formatLocalTime(alert.reservation.reserved_from)}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Clock3 className="h-4 w-4 text-slate-400" />
                  <span>Alert at {formatLocalTime(alert.event_at)}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={onDismiss}>
                  Dismiss
                </Button>
                {onViewReservations && (
                  <Button size="sm" onClick={onViewReservations}>
                    View Reservations
                  </Button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
