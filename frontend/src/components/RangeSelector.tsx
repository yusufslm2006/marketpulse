import type { ChartRange } from "../api/fmp"

interface RangeSelectorProps {
  selectedRange: ChartRange
  onRangeChange: (range: ChartRange) => void
  disabled?: boolean
}

const ranges: ChartRange[] = [
  "1D",
  "1W",
  "1M",
  "6M",
  "1Y",
]

export default function RangeSelector({
  selectedRange,
  onRangeChange,
  disabled = false,
}: RangeSelectorProps) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 10,
        marginTop: 24,
        marginBottom: 18,
      }}
    >
      {ranges.map((range) => {
        const isSelected = selectedRange === range

        return (
          <button
            key={range}
            type="button"
            disabled={disabled}
            onClick={() => onRangeChange(range)}
            style={{
              padding: "8px 15px",
              borderRadius: 8,
              border: isSelected
                ? "1px solid #38bdf8"
                : "1px solid #475569",
              background: isSelected
                ? "#0ea5e9"
                : "#1e293b",
              color: "white",
              cursor: disabled
                ? "not-allowed"
                : "pointer",
              fontWeight: 700,
              opacity: disabled ? 0.6 : 1,
            }}
          >
            {range}
          </button>
        )
      })}
    </div>
  )
}