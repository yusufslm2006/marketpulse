import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { getMultiplePrices } from "../api/finnhub"
import type { StockQuote } from "../api/finnhub"

const symbols = [
  "AAPL",
  "MSFT",
  "NVDA",
  "AMZN",
  "GOOGL",
  "META",
  "TSLA",
  "AMD",
  "COST",
  "ADBE",
]

export default function Home() {
  const navigate = useNavigate()

  const [stocks, setStocks] = useState<StockQuote[]>([])
  const [loading, setLoading] = useState(true)

  const loadPrices = async () => {
    try {
      const data = await getMultiplePrices(symbols)

      data.sort((a, b) => b.price - a.price)

      setStocks(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
  loadPrices()
}, [])

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0f172a",
          color: "white",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontSize: 24,
        }}
      >
        Loading prices...
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "white",
        padding: 30,
      }}
    >
      <h1>📈 MarketPulse</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 20,
          marginTop: 30,
        }}
      >
        {stocks.map((stock) => (
          <div
            key={stock.symbol}
            onClick={() =>
              navigate(`/stock/${stock.symbol}`)
            }
            style={{
              background: "#1e293b",
              borderRadius: 12,
              padding: 20,
              cursor: "pointer",
            }}
          >
            <h2>{stock.symbol}</h2>

            <p
              style={{
                fontSize: 28,
                fontWeight: "bold",
                marginTop: 15,
              }}
            >
              ${stock.price.toFixed(2)}
            </p>

            <p
              style={{
                color:
                  stock.change >= 0
                    ? "#22c55e"
                    : "#ef4444",
              }}
            >
              {stock.change >= 0 ? "+" : ""}
              {stock.change.toFixed(2)} (
              {stock.percentChange.toFixed(2)}%)
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}