<<<<<<< HEAD
import * as React from 'react';
import { Link } from 'react-router-dom';
import RegionalSettingsPanel from '@/components/settings/RegionalSettingsPanel';
import { ChefHat, ArrowRight, Bell, BellOff, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getNotificationPermission,
  requestNotificationPermission,
  getNotificationsEnabled,
  setNotificationsEnabled,
} from '@/lib/push-notifications';
import { toast } from 'sonner';

export default function HeadSettingsPage() {
  const [permission, setPermission] = React.useState(getNotificationPermission);
  const [enabled, setEnabled] = React.useState(getNotificationsEnabled);

  const handleEnableNotifications = async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result === 'granted') {
      setEnabled(true);
      toast.success('Browser notifications enabled');
    } else if (result === 'denied') {
      toast.error('Notifications blocked — allow them in your browser settings');
    }
  };

  const toggleEnabled = () => {
    const next = !enabled;
    setNotificationsEnabled(next);
    setEnabled(next);
    toast(next ? 'Notifications turned on' : 'Notifications turned off');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Captain Mode Card */}
      <Link
        to="/captain/tables"
        className="flex items-center justify-between p-4 rounded-2xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <ChefHat className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-bold text-slate-900 text-sm">Switch to Captain Mode</p>
            <p className="text-xs text-slate-500 mt-0.5">Simplified phone UI — tables, orders, new order</p>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
      </Link>

      {/* Browser Notifications Card */}
      <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-50 rounded-xl">
            {permission === 'granted' && enabled
              ? <BellRing className="h-5 w-5 text-amber-600" />
              : permission === 'denied'
                ? <BellOff className="h-5 w-5 text-slate-400" />
                : <Bell className="h-5 w-5 text-amber-500" />
            }
          </div>
          <div>
            <p className="font-bold text-slate-900 text-sm">Browser Notifications</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {permission === 'unsupported'
                ? 'Not supported in this browser'
                : permission === 'denied'
                  ? 'Blocked — allow in browser settings'
                  : permission === 'granted' && enabled
                    ? 'Showing notifications for new orders'
                    : 'Show alerts for new QR orders even when tab is in background'}
            </p>
          </div>
        </div>
        <div>
          {permission === 'unsupported' || permission === 'denied' ? (
            <Button
              variant="outline"
              size="sm"
              disabled={permission === 'unsupported' || permission === 'denied'}
              onClick={handleEnableNotifications}
            >
              Enable
            </Button>
          ) : permission === 'default' ? (
            <Button size="sm" onClick={handleEnableNotifications} className="gap-1.5">
              <Bell className="h-3.5 w-3.5" /> Allow
            </Button>
          ) : (
            <button
              type="button"
              onClick={toggleEnabled}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${enabled ? 'bg-primary' : 'bg-slate-200'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
          )}
        </div>
      </div>

      <RegionalSettingsPanel compact />
    </div>
  );
}
=======
import RegionalSettingsPanel from '@/components/settings/RegionalSettingsPanel';

export default function HeadSettingsPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <RegionalSettingsPanel compact />
    </div>
  );
}
>>>>>>> e64fa6d97db3794800d20b234cd7fc9c8a744980
