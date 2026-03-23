import * as React from "react";
import { useRestaurantStore } from "@/stores/restaurant/restaurant.store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Copy, ExternalLink, Code, Smartphone, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

type PreviewSize = "mobile" | "tablet" | "desktop";

export default function EmbedWidgetPage() {
  const { restaurant } = useRestaurantStore();
  const [tableId, setTableId] = React.useState('');
  const [previewSize, setPreviewSize] = React.useState<PreviewSize>("mobile");
  const [showPreview, setShowPreview] = React.useState(false);

  const slug = restaurant?.slug ?? '';
  const origin = window.location.origin;
  const embedUrl = `${origin}/embed/${slug}${tableId ? `?tableId=${encodeURIComponent(tableId)}` : ''}`;

  const iframeSnippet = `<iframe
  src="${embedUrl}"
  width="100%"
  height="700"
  frameborder="0"
  style="border-radius: 12px; max-width: 480px;"
  title="${restaurant?.name ?? 'Online Menu'}"
></iframe>`;

  const scriptSnippet = `<div id="enb-widget"></div>
<script>
  (function() {
    var f = document.createElement('iframe');
    f.src = '${embedUrl}';
    f.style.cssText = 'width:100%;height:700px;border:none;border-radius:12px;max-width:480px;display:block;';
    f.title = '${restaurant?.name ?? 'Online Menu'}';
    document.getElementById('enb-widget').appendChild(f);
  })();
</script>`;

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const previewWidths: Record<PreviewSize, string> = {
    mobile: "w-[375px]",
    tablet: "w-[640px]",
    desktop: "w-[900px]",
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Embed Widget</h1>
        <p className="text-sm text-slate-500 font-medium mt-0.5">
          Add your online ordering menu to any external website with an iframe or JavaScript snippet.
        </p>
      </div>

      {/* Configuration */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <h2 className="text-sm font-black text-slate-700 uppercase tracking-widest">Configuration</h2>

        <div>
          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Restaurant Slug
          </Label>
          <div className="mt-1 flex items-center gap-2">
            <Input value={slug || 'Not configured'} readOnly className="bg-slate-50 font-mono text-sm" />
            {slug && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/${slug}/menu`, '_blank')}
                className="shrink-0 gap-1 font-bold"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View Menu
              </Button>
            )}
          </div>
        </div>

        <div>
          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Pre-fill Table ID (optional)
          </Label>
          <Input
            value={tableId}
            onChange={(e) => setTableId(e.target.value)}
            placeholder="e.g. table-uuid or leave blank for takeaway"
            className="mt-1"
          />
          <p className="text-[11px] text-slate-400 mt-1 font-medium">
            When set, customers will be ordering for a specific table.
          </p>
        </div>
      </div>

      {/* Embed URL */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-3">
        <h2 className="text-sm font-black text-slate-700 uppercase tracking-widest">Embed URL</h2>
        <div className="flex gap-2">
          <Input value={embedUrl} readOnly className="font-mono text-xs bg-slate-50 flex-1" />
          <Button variant="outline" onClick={() => copy(embedUrl, 'URL')} className="shrink-0 gap-1 font-bold">
            <Copy className="h-3.5 w-3.5" />
            Copy
          </Button>
        </div>
      </div>

      {/* iFrame Snippet */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
            <Code className="h-4 w-4" />
            iFrame Snippet
          </h2>
          <Button variant="outline" size="sm" onClick={() => copy(iframeSnippet, 'iFrame snippet')} className="gap-1 font-bold">
            <Copy className="h-3.5 w-3.5" />
            Copy
          </Button>
        </div>
        <pre className="bg-slate-950 text-slate-300 rounded-xl p-4 text-[11px] font-mono overflow-x-auto whitespace-pre-wrap">{iframeSnippet}</pre>
        <p className="text-[11px] text-slate-400 font-medium">
          Paste this HTML wherever you want the ordering widget to appear on your website.
        </p>
      </div>

      {/* JavaScript Snippet */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
            <Code className="h-4 w-4" />
            JavaScript Snippet
          </h2>
          <Button variant="outline" size="sm" onClick={() => copy(scriptSnippet, 'JS snippet')} className="gap-1 font-bold">
            <Copy className="h-3.5 w-3.5" />
            Copy
          </Button>
        </div>
        <pre className="bg-slate-950 text-slate-300 rounded-xl p-4 text-[11px] font-mono overflow-x-auto whitespace-pre-wrap">{scriptSnippet}</pre>
        <p className="text-[11px] text-slate-400 font-medium">
          Add a <code className="bg-slate-100 px-1 rounded font-mono text-slate-600">&lt;div id="enb-widget"&gt;&lt;/div&gt;</code> where you want the widget,
          then place this script at the bottom of your page.
        </p>
      </div>

      {/* Live Preview */}
      {slug && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-700 uppercase tracking-widest">Live Preview</h2>
            <div className="flex items-center gap-1.5">
              {([
                { size: "mobile" as PreviewSize, icon: Smartphone },
                { size: "tablet" as PreviewSize, icon: Monitor },
              ]).map(({ size, icon: Icon }) => (
                <button
                  key={size}
                  onClick={() => setPreviewSize(size)}
                  className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
                    previewSize === size ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
              <Button
                variant={showPreview ? "default" : "outline"}
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                className="font-bold ml-1"
              >
                {showPreview ? 'Hide Preview' : 'Show Preview'}
              </Button>
            </div>
          </div>

          {showPreview && (
            <div className="overflow-x-auto">
              <div className={cn("mx-auto border-2 border-slate-200 rounded-2xl overflow-hidden transition-all", previewWidths[previewSize])}>
                <iframe
                  src={embedUrl}
                  className="w-full"
                  style={{ height: '600px', border: 'none' }}
                  title="Widget Preview"
                />
              </div>
              <p className="text-[11px] text-slate-400 text-center mt-2 font-medium">
                Live preview of your menu widget
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
