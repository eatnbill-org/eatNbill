/**
 * Embed Menu Page
 * Stripped-down version of the public menu at /embed/:slug
 * Designed to be used inside an iframe on external websites.
 * No header, no footer, just the menu and ordering flow.
 */
import PublicMenuPage from "@/pages/customer/PublicMenuPage";

export default function EmbedMenuPage() {
  return (
    <div className="embed-frame min-h-screen bg-white overflow-x-hidden">
      <style>{`
        /* Hide any nav/header elements that may bleed in */
        .embed-frame [data-role="nav"], .embed-frame header { display: none !important; }
      `}</style>
      <PublicMenuPage />
    </div>
  );
}
