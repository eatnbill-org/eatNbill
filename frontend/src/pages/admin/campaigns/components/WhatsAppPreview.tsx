import * as React from "react";
import { CheckCheck, ChevronRight, Sparkles } from "lucide-react";
import { format } from "date-fns";
import type { Template } from "@/types/demo";

export function WhatsAppPreview({
  template,
  campaignName,
  message,
  imageUrl,
  productsText,
}: {
  template: Template;
  campaignName: string;
  message: string;
  imageUrl?: string;
  productsText?: string;
}) {
  // WhatsApp Background Pattern
  const doodleBg = `url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")`;

  const ContentParts = {
    // 1. Campaign Title (Inside Message)
    title: campaignName ? (
      <div className="mb-1 font-bold text-[14px] leading-tight text-slate-900 flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
        {campaignName}
      </div>
    ) : null,

    // 2. Message Body
    text: (
      <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-800 break-words font-medium">
        {message || "Constructing broadcast protocol..."}
      </div>
    ),

    // 3. Image
    image: imageUrl ? (
      <div className="mb-2 overflow-hidden rounded-xl border border-black/5 bg-slate-50 shadow-sm">
        <img src={imageUrl} alt="Campaign Content" className="h-auto w-full object-cover max-h-[300px]" loading="lazy" />
      </div>
    ) : null,

    // 4. Action Button
    button: productsText ? (
      <div className="mt-3 pt-2.5 border-t border-black/[0.04]">
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-xl text-center text-[13px] font-bold text-[#00a884] hover:bg-black/[0.02] py-2 transition-colors"
        >
          Explore Protocol
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    ) : null,
  };

  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-100 shadow-xl bg-white max-w-full">
      {/* --- HEADER --- */}
      <div className="flex items-center gap-3 bg-[#075E54] px-5 py-4 text-white relative z-10 shadow-lg">
        <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white text-sm font-black border border-white/10">
          AN
        </div>
        <div className="flex-1 cursor-default">
          <p className="text-[15px] font-bold leading-none tracking-tight">Arabian Nights</p>
          <p className="text-[10px] opacity-70 mt-1 font-black uppercase tracking-widest">Enterprise Profile</p>
        </div>
      </div>

      {/* --- CHAT AREA --- */}
      <div
        className="relative min-h-[400px] bg-[#E5DDD5] p-5 flex flex-col"
        style={{ backgroundImage: doodleBg, backgroundBlendMode: 'overlay', opacity: 1 }}
      >
        {/* Date Pill */}
        <div className="mb-6 self-center rounded-xl bg-white/90 backdrop-blur-md px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 shadow-sm border border-black/5">
          Transmission: Today
        </div>

        {/* --- MESSAGE BUBBLE --- */}
        <div className="relative self-end max-w-[90%] min-w-[160px] rounded-2xl bg-[#E7FCE3] p-3 shadow-sm border border-black/5">

          {/* TAIL SVG */}
          <span className="absolute -right-1.5 top-0 text-[#E7FCE3]">
            <svg viewBox="0 0 8 13" height="13" width="8" preserveAspectRatio="xMidYMid slice" fill="currentColor">
              <path d="M5.188 1H0v11.193l6.467-8.625C7.526 2.156 6.958 1 5.188 1z"></path>
            </svg>
          </span>

          <div className="flex flex-col">
            {/* TEMPLATE LOGIC */}
            {template === 1 && (
              <>
                {ContentParts.image}
                <div className="px-0.5">
                  {ContentParts.title}
                  {ContentParts.text}
                </div>
              </>
            )}

            {template === 2 && (
              <>
                <div className="px-0.5">
                  {ContentParts.title}
                  {ContentParts.text}
                </div>
                <div className="mt-2">
                  {ContentParts.image}
                </div>
              </>
            )}

            {/* Button Always Bottom */}
            {ContentParts.button}
          </div>

          {/* Time & Status */}
          <div className="mt-1.5 flex items-center justify-end gap-1 px-0.5">
            <span className="text-[10px] font-bold text-slate-400 tabular-nums">{format(new Date(), "h:mm a")}</span>
            <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb]" />
          </div>
        </div>
      </div>
    </div>
  );
}
