
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

export const Motion: React.FC<MotionProps> = ({
  children,
  className,
  initial = "opacity-0",
  animate = "opacity-100",
  transition = defaultTransition,
}) => {
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

export const FadeIn: React.FC<Omit<MotionProps, "initial" | "animate">> = (props) => (
  <Motion 
    initial="opacity-0" 
    animate="opacity-100" 
    {...props} 
  />
);

export const SlideInFromRight: React.FC<Omit<MotionProps, "initial" | "animate">> = (props) => (
  <Motion 
    initial="opacity-0 translate-x-4" 
    animate="opacity-100 translate-x-0" 
    {...props} 
  />
);

export const SlideInFromLeft: React.FC<Omit<MotionProps, "initial" | "animate">> = (props) => (
  <Motion 
    initial="opacity-0 -translate-x-4" 
    animate="opacity-100 translate-x-0" 
    {...props} 
  />
);

export const SlideInFromBottom: React.FC<Omit<MotionProps, "initial" | "animate">> = (props) => (
  <Motion 
    initial="opacity-0 translate-y-4" 
    animate="opacity-100 translate-y-0" 
    {...props} 
  />
);

export const SlideInFromTop: React.FC<Omit<MotionProps, "initial" | "animate">> = (props) => (
  <Motion 
    initial="opacity-0 -translate-y-4" 
    animate="opacity-100 translate-y-0" 
    {...props} 
  />
);

export const ScaleIn: React.FC<Omit<MotionProps, "initial" | "animate">> = (props) => (
  <Motion 
    initial="opacity-0 scale-95" 
    animate="opacity-100 scale-100" 
    {...props} 
  />
);

export const StaggeredContainer: React.FC<{
  children: ReactNode;
  className?: string;
  delay?: number;
  staggerDelay?: number;
}> = ({ children, className, delay = 0, staggerDelay = 0.1 }) => {
  const childrenArray = React.Children.toArray(children);
  
  return (
    <div className={className}>
      {childrenArray.map((child, index) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            key: index,
            transition: {
              delay: delay + index * staggerDelay,
              ...((child as React.ReactElement<any>).props.transition || {}),
            },
          });
        }
        return child;
      })}
    </div>
  );
};
