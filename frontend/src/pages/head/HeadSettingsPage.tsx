import { Link } from 'react-router-dom';
import RegionalSettingsPanel from '@/components/settings/RegionalSettingsPanel';
import { ChefHat, ArrowRight } from 'lucide-react';

export default function HeadSettingsPage() {
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

      <RegionalSettingsPanel compact />
    </div>
  );
}
