import React from "react";
import { View, Text } from "react-native";
import Svg, { Rect, Line, Circle, Path, G, Text as SvgText } from "react-native-svg";
import { useColors } from "@/hooks/use-colors";

// カラーパレット
const CHART_COLORS = [
  "#1E40AF", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6",
  "#EC4899", "#06B6D4", "#84CC16",
];

// 棒グラフ
interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  showValues?: boolean;
}

export function BarChart({ data, height = 200, showValues = true }: BarChartProps) {
  const colors = useColors();
  if (!data.length) return null;

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const barWidth = Math.min(40, (280 - data.length * 8) / data.length);
  const chartWidth = data.length * (barWidth + 12) + 40;

  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={Math.min(chartWidth, 320)} height={height + 40} viewBox={`0 0 ${Math.min(chartWidth, 320)} ${height + 40}`}>
        {data.map((item, i) => {
          const barHeight = (item.value / maxValue) * (height - 20);
          const x = 20 + i * (barWidth + 12);
          const y = height - barHeight;
          return (
            <G key={i}>
              <Rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={4}
                fill={item.color || CHART_COLORS[i % CHART_COLORS.length]}
              />
              {showValues && (
                <SvgText
                  x={x + barWidth / 2}
                  y={y - 4}
                  fontSize={9}
                  fill={colors.muted}
                  textAnchor="middle"
                >
                  {formatNumber(item.value)}
                </SvgText>
              )}
              <SvgText
                x={x + barWidth / 2}
                y={height + 16}
                fontSize={8}
                fill={colors.muted}
                textAnchor="middle"
              >
                {item.label.length > 6 ? item.label.slice(0, 6) + "…" : item.label}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

// 折れ線グラフ
interface LineChartProps {
  datasets: {
    label: string;
    data: number[];
    color?: string;
  }[];
  labels: string[];
  height?: number;
}

export function LineChart({ datasets, labels, height = 200 }: LineChartProps) {
  const colors = useColors();
  if (!datasets.length || !labels.length) return null;

  const allValues = datasets.flatMap((d) => d.data);
  const maxValue = Math.max(...allValues, 1);
  const minValue = Math.min(...allValues, 0);
  const range = maxValue - minValue || 1;
  const width = 300;
  const padding = { top: 10, right: 10, bottom: 30, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Y axis lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y = padding.top + chartH * (1 - ratio);
          const val = minValue + range * ratio;
          return (
            <G key={`grid-${i}`}>
              <Line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke={colors.border}
                strokeWidth={0.5}
              />
              <SvgText
                x={padding.left - 4}
                y={y + 3}
                fontSize={8}
                fill={colors.muted}
                textAnchor="end"
              >
                {formatNumber(val)}
              </SvgText>
            </G>
          );
        })}

        {/* Lines */}
        {datasets.map((dataset, di) => {
          const lineColor = dataset.color || CHART_COLORS[di % CHART_COLORS.length];
          const points = dataset.data.map((val, i) => ({
            x: padding.left + (i / Math.max(labels.length - 1, 1)) * chartW,
            y: padding.top + chartH * (1 - (val - minValue) / range),
          }));

          const pathD = points
            .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
            .join(" ");

          return (
            <G key={`line-${di}`}>
              <Path d={pathD} stroke={lineColor} strokeWidth={2} fill="none" />
              {points.map((p, i) => (
                <Circle key={i} cx={p.x} cy={p.y} r={3} fill={lineColor} />
              ))}
            </G>
          );
        })}

        {/* X labels */}
        {labels.map((label, i) => {
          const x = padding.left + (i / Math.max(labels.length - 1, 1)) * chartW;
          return (
            <SvgText
              key={`label-${i}`}
              x={x}
              y={height - 4}
              fontSize={8}
              fill={colors.muted}
              textAnchor="middle"
            >
              {label}
            </SvgText>
          );
        })}
      </Svg>

      {/* Legend */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 12, marginTop: 8 }}>
        {datasets.map((d, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: d.color || CHART_COLORS[i % CHART_COLORS.length],
              }}
            />
            <Text style={{ fontSize: 11, color: colors.muted }}>{d.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// 円グラフ
interface PieChartProps {
  data: { label: string; value: number; color?: string }[];
  size?: number;
}

export function PieChart({ data, size = 180 }: PieChartProps) {
  const colors = useColors();
  if (!data.length) return null;

  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const radius = size / 2 - 10;
  const cx = size / 2;
  const cy = size / 2;

  let currentAngle = -Math.PI / 2;
  const slices = data.map((item, i) => {
    const angle = (item.value / total) * 2 * Math.PI;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);
    const largeArc = angle > Math.PI ? 1 : 0;

    return {
      path: `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`,
      color: item.color || CHART_COLORS[i % CHART_COLORS.length],
      label: item.label,
      percentage: ((item.value / total) * 100).toFixed(1),
    };
  });

  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices.map((slice, i) => (
          <Path key={i} d={slice.path} fill={slice.color} />
        ))}
      </Svg>
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 8 }}>
        {slices.map((s, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: s.color }} />
            <Text style={{ fontSize: 11, color: colors.muted }}>
              {s.label} {s.percentage}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// 水平バーチャート（比較用）
interface HorizontalBarProps {
  data: { label: string; value: number; maxValue?: number; color?: string }[];
  height?: number;
}

export function HorizontalBar({ data }: HorizontalBarProps) {
  const colors = useColors();
  if (!data.length) return null;

  const maxValue = Math.max(...data.map((d) => d.maxValue || d.value), 1);

  return (
    <View style={{ gap: 8 }}>
      {data.map((item, i) => {
        const width = Math.max((item.value / maxValue) * 100, 2);
        return (
          <View key={i} style={{ gap: 2 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 12, color: colors.foreground }}>{item.label}</Text>
              <Text style={{ fontSize: 12, color: colors.muted, fontWeight: "600" }}>
                {formatNumber(item.value)}
              </Text>
            </View>
            <View
              style={{
                height: 8,
                backgroundColor: colors.border,
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  height: "100%",
                  width: `${width}%`,
                  backgroundColor: item.color || CHART_COLORS[i % CHART_COLORS.length],
                  borderRadius: 4,
                }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

// 数値フォーマット
function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  if (num < 1 && num > 0) return num.toFixed(2);
  return Math.round(num).toString();
}

export { CHART_COLORS, formatNumber };
