import React from "react";
import { Metric } from "@/types";
import { Card } from "@/components/ui/Card";

interface MetricsSectionProps {
  metrics: Metric[];
}

export function MetricsSection({ metrics }: MetricsSectionProps) {
  return (
    <section id="metrics" className="py-12 border-y border-border/40 bg-surface/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {metrics.map((metric) => (
            <Card key={metric.id} hoverable className="flex flex-col justify-between space-y-3">
              <div className="text-xs font-mono tracking-wider text-text-muted uppercase">
                {metric.label}
              </div>
              <div className="text-4xl md:text-5xl font-mono font-bold text-primary tracking-tight">
                {metric.value}
              </div>
              <p className="text-xs text-text-muted font-sans leading-relaxed">
                {metric.description}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
