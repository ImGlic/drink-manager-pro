
import React, { useState, useEffect, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MotionProps {
  children: ReactNode;
  className?: string;
  initial?: string;
  animate?: string;
  transition?: {
    duration?: number;
    delay?: number;
    ease?: string;
  };
}

const defaultTransition = {
  duration: 0.3,
  delay: 0,
  ease: "ease-out",
};

export const Motion = ({
  children,
  className,
  initial = "opacity-0",
  animate = "opacity-100",
  transition = defaultTransition,
}: MotionProps) => {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  
  const style = {
    transitionProperty: "all",
    transitionDuration: `${transition.duration}s`,
    transitionDelay: `${transition.delay}s`,
    transitionTimingFunction: transition.ease || "ease-out",
  };
  
  return (
    <div 
      className={cn(mounted ? animate : initial, className)}
      style={style}
    >
      {children}
    </div>
  );
};

export const FadeIn = (props: Omit<MotionProps, "initial" | "animate">) => (
  <Motion 
    initial="opacity-0" 
    animate="opacity-100" 
    {...props} 
  />
);

export const SlideInFromRight = (props: Omit<MotionProps, "initial" | "animate">) => (
  <Motion 
    initial="opacity-0 translate-x-4" 
    animate="opacity-100 translate-x-0" 
    {...props} 
  />
);

export const SlideInFromLeft = (props: Omit<MotionProps, "initial" | "animate">) => (
  <Motion 
    initial="opacity-0 -translate-x-4" 
    animate="opacity-100 translate-x-0" 
    {...props} 
  />
);

export const SlideInFromBottom = (props: Omit<MotionProps, "initial" | "animate">) => (
  <Motion 
    initial="opacity-0 translate-y-4" 
    animate="opacity-100 translate-y-0" 
    {...props} 
  />
);

export const SlideInFromTop = (props: Omit<MotionProps, "initial" | "animate">) => (
  <Motion 
    initial="opacity-0 -translate-y-4" 
    animate="opacity-100 translate-y-0" 
    {...props} 
  />
);

export const ScaleIn = (props: Omit<MotionProps, "initial" | "animate">) => (
  <Motion 
    initial="opacity-0 scale-95" 
    animate="opacity-100 scale-100" 
    {...props} 
  />
);

export const StaggeredContainer = ({
  children,
  className,
  delay = 0,
  staggerDelay = 0.1
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  staggerDelay?: number;
}) => {
  const childrenArray = React.Children.toArray(children);
  
  return (
    <div className={className}>
      {childrenArray.map((child, index) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<{ transition?: object }>, {
            key: index,
            transition: {
              delay: delay + index * staggerDelay,
              ...((child as React.ReactElement<{ transition?: object }>).props.transition || {}),
            },
          });
        }
        return child;
      })}
    </div>
  );
};
