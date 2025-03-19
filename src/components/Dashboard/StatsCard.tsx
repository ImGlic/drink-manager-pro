
import React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { SlideInFromBottom } from "../ui/motion";

interface StatsCardProps {
  title: string;
  value: string;
  description?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  delay?: number;
  className?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  description,
  icon,
  trend,
  delay = 0,
  className,
}) => {
  return (
    <SlideInFromBottom
      transition={{ delay }}
      className={cn("h-full", className)}
    >
      <Card className="h-full p-6 hover-scale">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
            <h3 className="text-2xl font-display font-semibold">{value}</h3>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
            {trend && (
              <div className="flex items-center mt-2">
                <div
                  className={cn(
                    "flex items-center text-xs font-medium",
                    trend.isPositive ? "text-green-600" : "text-red-600"
                  )}
                >
                  <span
                    className={cn(
                      "mr-1 flex h-4 w-4 items-center justify-center rounded-full",
                      trend.isPositive ? "bg-green-100" : "bg-red-100"
                    )}
                  >
                    {trend.isPositive ? (
                      <svg
                        className="h-2.5 w-2.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 15l7-7 7 7"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="h-2.5 w-2.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    )}
                  </span>
                  {trend.value}%
                </div>
                <span className="text-xs text-muted-foreground ml-1">
                  relativamente ao mês anterior
                </span>
              </div>
            )}
          </div>
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            {icon}
          </div>
        </div>
      </Card>
    </SlideInFromBottom>
  );
};

export default StatsCard;
