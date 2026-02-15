import { Button } from "@/components/ui/button";
import { useDemoStore } from "@/store/demo-store";
import { cn } from "@/lib/utils";
import { Link, useLocation, useNavigate } from "react-router-dom";
export default function DemoModeBar({
  className
}: {
  className?: string;
}) {
  const {
    state,
    resetDemo,
    clearDemoStorage,
    dispatch
  } = useDemoStore();
  const navigate = useNavigate();
  const loc = useLocation();
  const dismissed = state.ui.demoBannerDismissed;
  const isAdmin = loc.pathname.startsWith("/admin");
  const hideActions = dismissed || isAdmin || loc.pathname.startsWith("/order/");
  return null;
}