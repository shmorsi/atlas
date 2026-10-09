import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { LineChart, BarChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
} from "echarts/components";
import { SVGRenderer } from "echarts/renderers";
import type { EChartsOption } from "echarts";
echarts.use([
  LineChart,
  BarChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  SVGRenderer,
]);
export function Chart({
  option,
  height = 180,
}: {
  option: EChartsOption;
  height?: number;
}) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const chart = echarts.init(el.current!, undefined, { renderer: "svg" });
    chart.setOption({
      color: ["#d7ac65", "#79a8be", "#627e8f", "#627e8f"],
      backgroundColor: "transparent",
      textStyle: { fontFamily: "system-ui", color: "#8795a8", fontSize: 12 },
      animation: false,
      ...option,
    });
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(el.current!);
    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [option]);
  return (
    <div
      ref={el}
      style={{ height, width: "100%" }}
      role="img"
      aria-label="Analytical chart; numerical results are provided in the accompanying tables and metrics"
    />
  );
}
