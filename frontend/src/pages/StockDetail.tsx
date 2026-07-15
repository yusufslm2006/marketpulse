import { getTwelveDataChart } from "../api/twelveData"
import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

import { getStockPrice } from "../api/finnhub"
import type { StockQuote } from "../api/finnhub"

import {
  getChart,
  type ChartPoint,
  type ChartRange,
} from "../api/fmp"

import StockChart from "../components/StockChart"
import RangeSelector from "../components/RangeSelector"

function getTodayLabel(): string {
  return new Date().toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
  })
}

export default function StockDetail() {
  const { symbol } = useParams()
  const navigate = useNavigate()

  const [stock, setStock] = useState<StockQuote | null>(null)
  const [chartData, setChartData] = useState<ChartPoint[]>([])

  const [selectedRange, setSelectedRange] =
    useState<ChartRange>("1M")

  const [loadingStock, setLoadingStock] = useState(true)
  const [loadingChart, setLoadingChart] = useState(true)

  const [stockError, setStockError] = useState("")
  const [chartError, setChartError] = useState("")

  useEffect(() => {
    if (!symbol) {
      setStockError("Hisse sembolü bulunamadı.")
      setLoadingStock(false)
      return
    }

    let cancelled = false

    const loadStock = async () => {
      try {
        setLoadingStock(true)
        setStockError("")

        const priceData = await getStockPrice(symbol)

        if (cancelled) {
          return
        }

        if (!priceData) {
          setStock(null)
          setStockError("Hisse fiyatı alınamadı.")
          return
        }

        setStock(priceData)
      } catch (error) {
        console.error("Stock price error:", error)

        if (!cancelled) {
          setStock(null)
          setStockError(
            "Hisse fiyatı yüklenirken bir hata oluştu."
          )
        }
      } finally {
        if (!cancelled) {
          setLoadingStock(false)
        }
      }
    }

    loadStock()

    return () => {
      cancelled = true
    }
  }, [symbol])

  useEffect(() => {
    if (!symbol) {
      setLoadingChart(false)
      return
    }

    let cancelled = false

    const loadChart = async () => {
      try {
        setLoadingChart(true)
        setChartError("")

        let historicalData

if (selectedRange === "1D") {
  historicalData = await getTwelveDataChart(
    symbol,
    selectedRange
  )
} else {
  historicalData = await getChart(
    symbol,
    selectedRange
  )

  // FMP bu sembolü desteklemiyorsa Twelve Data'ya geç.
  if (historicalData.length === 0) {
    console.log(
      `FMP ${symbol} için veri vermedi. Twelve Data deneniyor.`
    )

    historicalData = await getTwelveDataChart(
      symbol,
      selectedRange
    )
  }
}

        if (cancelled) {
          return
        }

        setChartData(historicalData)

        if (historicalData.length === 0) {
          if (selectedRange === "1D") {
            setChartError(
              "1 günlük grafik verisi Twelve Data'dan alınamadı."
            )
          } else {
            setChartError(
              `${symbol} için ${selectedRange} grafik verisi alınamadı.`
            )
          }
        }
      } catch (error) {
        console.error("Chart error:", error)

        if (!cancelled) {
          setChartData([])
          setChartError(
            "Grafik yüklenirken bir hata oluştu."
          )
        }
      } finally {
        if (!cancelled) {
          setLoadingChart(false)
        }
      }
    }

    loadChart()

    return () => {
      cancelled = true
    }
  }, [symbol, selectedRange])

  useEffect(() => {
    if (
      !stock ||
      selectedRange === "1D" ||
      chartData.length === 0 ||
      loadingChart
    ) {
      return
    }

    const today = getTodayLabel()

    setChartData((currentData) => {
      if (currentData.length === 0) {
        return currentData
      }

      const lastPoint =
        currentData[currentData.length - 1]

      if (lastPoint.time === today) {
        const updatedData = [...currentData]

        updatedData[updatedData.length - 1] = {
          time: today,
          price: stock.price,
        }

        return updatedData
      }

      return [
        ...currentData,
        {
          time: today,
          price: stock.price,
        },
      ]
    })
  }, [
    stock,
    selectedRange,
    loadingChart,
    chartData.length,
  ])

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "white",
        padding: 30,
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        <button
          type="button"
          onClick={() => navigate("/")}
          style={{
            marginBottom: 24,
            padding: "10px 16px",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            background: "#e2e8f0",
            color: "#0f172a",
            fontWeight: 700,
          }}
        >
          ← Geri dön
        </button>

        <div
          style={{
            marginBottom: 20,
          }}
        >
          <h1 style={{ marginBottom: 12 }}>
            {symbol} 📈
          </h1>

          {loadingStock && (
            <p style={{ color: "#94a3b8" }}>
              Hisse fiyatı yükleniyor...
            </p>
          )}

          {!loadingStock && stockError && (
            <p
              style={{
                color: "#f87171",
                fontWeight: 700,
              }}
            >
              {stockError}
            </p>
          )}

          {!loadingStock && stock && (
            <div>
              <h2
                style={{
                  fontSize: 32,
                  margin: "0 0 8px",
                }}
              >
                ${stock.price.toFixed(2)}
              </h2>

              <p
                style={{
                  color:
                    stock.change >= 0
                      ? "#22c55e"
                      : "#ef4444",
                  fontWeight: 700,
                  margin: 0,
                }}
              >
                {stock.change >= 0 ? "+" : ""}
                {stock.change.toFixed(2)} (
                {stock.percentChange.toFixed(2)}%)
              </p>
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: 12,
          }}
        >
          <RangeSelector
            selectedRange={selectedRange}
            onRangeChange={(range: ChartRange) => {
              setSelectedRange(range)
            }}
            disabled={loadingChart}
          />
        </div>

        {loadingChart && (
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
            Grafik yükleniyor...
          </div>
        )}

        {!loadingChart && chartError && (
          <div
            style={{
              minHeight: 100,
              padding: 20,
              borderRadius: 12,
              background: "#1e293b",
              color: "#f87171",
              display: "flex",
              alignItems: "center",
              fontWeight: 700,
            }}
          >
            {chartError}
          </div>
        )}

        {!loadingChart &&
          !chartError &&
          chartData.length > 0 && (
            <StockChart
              data={chartData}
              range={selectedRange}
            />
          )}
      </div>
    </div>
  )
}