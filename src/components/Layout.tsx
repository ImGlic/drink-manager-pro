
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
          "flex-1 container mx-auto px-4 py-6 max-w-7xl",
          className
        )}
      >
        <FadeIn transition={{ duration: 0.4 }}>
          {children}
        </FadeIn>
      </main>
    </div>
  );
};

export default Layout;
