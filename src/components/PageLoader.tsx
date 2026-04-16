import { Loader2 } from "lucide-react";

const PageLoader = () => {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="font-display text-lg animate-pulse text-foreground">Loading Farm Fresh Hub...</p>
      </div>
    </div>
  );
};

export default PageLoader;
