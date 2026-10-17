"use client";

import React, { useState } from "react";

export interface SeriesConfig {
  key: string;
  label: string;
  color: string;
}

interface SvgLineChartProps {
  data: Array<Record<string, any>>;
  xKey: string;
  series: SeriesConfig[];
  height?: number;
  yUnit?: string;
  referenceLineValue?: number;
  referenceLineLabel?: string;
}

export default function SvgLineChart({
  data,
  xKey,
  series,
  height = 290,
  yUnit = "",
  referenceLineValue,
  referenceLineLabel,
}: SvgLineChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!data || data.length === 0 || series.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 rounded-xl border border-slate-200 dark:border-slate-800 text-sm text-slate-500">
        Grafik için veri bulunamadı.
      </div>
    );
  }

  const width = 820;
  const padLeft = 64;
  const padRight = 24;
  const padTop = 22;
  const padBottom = 36;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  let minVal = Infinity;
  let maxVal = -Infinity;

  for (const row of data) {
    for (const s of series) {
      const v = Number(row[s.key]);
      if (!Number.isNaN(v)) {
        if (v < minVal) minVal = v;
        if (v > maxVal) maxVal = v;
      }
    }
  }

  if (referenceLineValue !== undefined) {
    if (referenceLineValue < minVal) minVal = referenceLineValue;
    if (referenceLineValue > maxVal) maxVal = referenceLineValue;
  }

  if (!Number.isFinite(minVal) || !Number.isFinite(maxVal)) {
    minVal = 0;
    maxVal = 100;
  }

  const range = maxVal - minVal || 1;
  const yMin = minVal - range * 0.06;
  const yMax = maxVal + range * 0.06;

  const getX = (idx: number) =>
    data.length <= 1
      ? padLeft + plotW / 2
      : padLeft + (idx / (data.length - 1)) * plotW;

  const getY = (val: number) =>
    padTop + plotH - ((val - yMin) / (yMax - yMin)) * plotH;

  const yTicks = 5;
  const tickValues = Array.from({ length: yTicks }, (_, i) => {
    return yMin + ((yMax - yMin) * i) / (yTicks - 1);
  });

  const activeIdx = hoverIndex !== null ? hoverIndex : data.length - 1;
  const activeRow = data[activeIdx];

  return (
    <div className="w-full">
      {/* Üst Lejant ve Seçili Nokta Özeti */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {series.map((s) => {
            const val = Number(activeRow?.[s.key]);
            return (
              <div
                key={s.key}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800/80"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ backgroundColor: s.color }}
                />
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {s.label}:
                </span>
                <span className="font-mono text-slate-900 dark:text-white">
                  {!Number.isNaN(val)
                    ? `${val.toLocaleString("tr-TR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}${yUnit}`
                    : "-"}
                </span>
              </div>
            );
          })}
        </div>
        <div className="text-slate-500 dark:text-slate-400 font-mono">
          Tarih / Dönem:{" "}
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {String(activeRow?.[xKey] ?? "")}
          </span>
        </div>
      </div>

      {/* SVG Grafik Alanı */}
      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none"
          onMouseLeave={() => setHoverIndex(null)}
        >
          {/* Yatay Izgara Çizgileri */}
          {tickValues.map((tv, i) => {
            const y = getY(tv);
            return (
              <g key={i}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="currentColor"
                  className="text-slate-200 dark:text-slate-800"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                />
                <text
                  x={padLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-500 dark:fill-slate-400 text-[10px] font-mono"
                >
                  {tv.toLocaleString("tr-TR", {
                    maximumFractionDigits: tv > 1000 ? 0 : 1,
                  })}
                </text>
              </g>
            );
          })}

          {/* Referans Çizgisi (örn: 100.0 Baz Çizgisi veya Hedef Tutar) */}
          {referenceLineValue !== undefined && (
            <g>
              <line
                x1={padLeft}
                y1={getY(referenceLineValue)}
                x2={width - padRight}
                y2={getY(referenceLineValue)}
                stroke="#94a3b8"
                strokeWidth={1.5}
                strokeDasharray="6 4"
              />
              {referenceLineLabel && (
                <text
                  x={width - padRight - 4}
                  y={getY(referenceLineValue) - 5}
                  textAnchor="end"
                  className="fill-slate-500 dark:fill-slate-400 text-[10px] font-semibold"
                >
                  {referenceLineLabel}
                </text>
              )}
            </g>
          )}

          {/* Serilerin Çizgileri */}
          {series.map((s) => {
            const points = data
              .map((row, idx) => {
                const v = Number(row[s.key]);
                if (Number.isNaN(v)) return null;
                return `${getX(idx).toFixed(1)},${getY(v).toFixed(1)}`;
              })
              .filter(Boolean)
              .join(" ");

            return (
              <polyline
                key={s.key}
                fill="none"
                stroke={s.color}
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
              />
            );
          })}

          {/* X Ekseni Başlangıç, Orta ve Bitiş Etiketleri */}
          {[0, Math.floor((data.length - 1) / 2), data.length - 1]
            .filter((v, i, a) => a.indexOf(v) === i)
            .map((idx) => (
              <text
                key={idx}
                x={getX(idx)}
                y={height - 10}
                textAnchor={
                  idx === 0
                    ? "start"
                    : idx === data.length - 1
                    ? "end"
                    : "middle"
                }
                className="fill-slate-500 dark:fill-slate-400 text-[10px] font-mono"
              >
                {String(data[idx]?.[xKey] ?? "")}
              </text>
            ))}

          {/* Aktif Dikey Kılavuz Çizgisi ve Noktalar */}
          {hoverIndex !== null && (
            <g>
              <line
                x1={getX(hoverIndex)}
                y1={padTop}
                x2={getX(hoverIndex)}
                y2={padTop + plotH}
                stroke="#64748b"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              {series.map((s) => {
                const v = Number(data[hoverIndex]?.[s.key]);
                if (Number.isNaN(v)) return null;
                return (
                  <circle
                    key={s.key}
                    cx={getX(hoverIndex)}
                    cy={getY(v)}
                    r={4}
                    fill={s.color}
                    stroke="#ffffff"
                    strokeWidth={1.5}
                  />
                );
              })}
            </g>
          )}

          {/* Fare Etkileşim Katmanı */}
          <rect
            x={padLeft}
            y={padTop}
            width={plotW}
            height={plotH}
            fill="transparent"
            className="cursor-crosshair"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const relX = e.clientX - rect.left;
              const ratio = Math.max(0, Math.min(1, relX / rect.width));
              const idx = Math.round(ratio * (data.length - 1));
              setHoverIndex(idx);
            }}
          />
        </svg>
      </div>
    </div>
  );
}
