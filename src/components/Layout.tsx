import React, { ReactNode } from "react";
import Navbar from "./Navbar";
import { cn } from "@/lib/utils";
import { FadeIn } from "./ui/motion";

interface LayoutProps {
  children: ReactNode;
  className?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, className }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main
        className={cn(
          "flex-1 container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-7xl pb-24 md:pb-6",
          className
        )}
      >
        <FadeIn transition={{ duration: 0.3 }}>{children}</FadeIn>
      </main>
    </div>
  );
};

export default Layout;
