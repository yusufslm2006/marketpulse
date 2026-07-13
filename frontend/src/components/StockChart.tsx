import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"

import type { ChartRange } from "../api/fmp"

interface ChartData {
  time: string
  price: number
}

interface Props {
  data: ChartData[]
  range: ChartRange
}

function getTickStep(range: ChartRange): number {
  switch (range) {
    case "1D":
      // 15 dakikalık veride 4 nokta yaklaşık 1 saattir.
      return 4

    case "1W":
      return 1

    case "1M":
      return 5

    case "6M":
      return 21

    case "1Y":
      return 42

    default:
      return 1
  }
}

function createTicks(
  data: ChartData[],
  range: ChartRange
): string[] {
  if (data.length === 0) {
    return []
  }

  const step = getTickStep(range)

  const ticks = data
    .filter((_, index) => index % step === 0)
    .map((item) => item.time)

  const lastTime = data[data.length - 1].time

  if (!ticks.includes(lastTime)) {
    ticks.push(lastTime)
  }

  return ticks
}

export default function StockChart({
  data,
  range,
}: Props) {
  if (data.length === 0) {
    return (
      <div
        style={{
          width: "100%",
          height: 400,
          background: "#1e293b",
          borderRadius: 12,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          color: "#94a3b8",
        }}
      >
        Grafik verisi bulunamadı.
      </div>
    )
  }

  const firstPrice = data[0].price
  const lastPrice = data[data.length - 1].price

  const priceChange = lastPrice - firstPrice

  const percentChange =
    firstPrice !== 0
      ? (priceChange / firstPrice) * 100
      : 0

  const isPositive = priceChange >= 0

  const chartColor = isPositive
    ? "#22c55e"
    : "#ef4444"

  const ticks = createTicks(data, range)

  return (
    <div
      style={{
        width: "100%",
        height: 440,
        background: "#1e293b",
        borderRadius: 12,
        padding: 20,
        boxSizing: "border-box",
      }}
    >
      {/* Seçilen zaman aralığındaki değişim */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 12,
          color: chartColor,
          fontWeight: 700,
        }}
      >
        <span>{range}</span>

        <span>
          {isPositive ? "+" : ""}
          ${priceChange.toFixed(2)}
        </span>

        <span>
          ({isPositive ? "+" : ""}
          {percentChange.toFixed(2)}%)
        </span>
      </div>

      <div
        style={{
          width: "100%",
          height: 370,
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{
              top: 10,
              right: 20,
              left: 10,
              bottom: 10,
            }}
          >
            <CartesianGrid
              stroke="#475569"
              strokeDasharray="3 3"
            />

            <XAxis
              dataKey="time"
              ticks={ticks}
              stroke="#94a3b8"
              minTickGap={10}
              tick={{
                fontSize: 12,
              }}
            />

            <YAxis
              stroke="#94a3b8"
              domain={["auto", "auto"]}
              tickFormatter={(value: number) =>
                `$${value.toFixed(0)}`
              }
            />

            <Tooltip
              labelFormatter={(label) =>
                `Tarih: ${label}`
              }
              formatter={(value) => [
                `$${Number(value).toFixed(2)}`,
                "Fiyat",
              ]}
              contentStyle={{
                backgroundColor:
                  "rgba(15, 23, 42, 0.75)",
                border:
                  "1px dashed #94a3b8",
                borderRadius: 8,
                color: "white",
                padding: "10px 12px",
                backdropFilter: "blur(4px)",
              }}
              labelStyle={{
                color: "#e2e8f0",
                fontWeight: 600,
                marginBottom: 6,
              }}
              itemStyle={{
                color: chartColor,
                fontWeight: 700,
              }}
              cursor={{
                stroke: "#94a3b8",
                strokeWidth: 1,
                strokeDasharray: "4 4",
              }}
            />

            <Line
              type="monotone"
              dataKey="price"
              stroke={chartColor}
              strokeWidth={3}
              dot={false}
              activeDot={{
                r: 5,
                fill: chartColor,
                stroke: "white",
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}