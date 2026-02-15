import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container flex min-h-screen items-center justify-center">
        <div className="max-w-md text-center">
          <h1 className="text-5xl font-semibold tracking-tight">404</h1>
          <p className="mt-3 text-base text-muted-foreground">That page doesn’t exist.</p>
          <a href="/" className="mt-6 inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent">
            Back to Menu
          </a>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
