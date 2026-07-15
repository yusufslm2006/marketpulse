import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

import {
  searchStocks,
  type StockSearchResult,
} from "../api/fmp"

export default function StockSearch() {
  const navigate = useNavigate()

  const [query, setQuery] = useState("")
  const [results, setResults] =
    useState<StockSearchResult[]>([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const normalizedQuery = query.trim()

    if (normalizedQuery.length < 1) {
      setResults([])
      setError("")
      setLoading(false)
      return
    }

    let cancelled = false

    const timeoutId = window.setTimeout(async () => {
      try {
        setLoading(true)
        setError("")

        const data = await searchStocks(normalizedQuery)

        if (cancelled) {
          return
        }

        const filteredResults = data
          .filter((item) => {
            const exchange = item.exchange.toUpperCase()
            const symbol = item.symbol
              .trim()
              .toUpperCase()

            const isUsExchange =
              exchange.includes("NASDAQ") ||
              exchange.includes("NYSE") ||
              exchange.includes("AMEX") ||
              exchange.includes("NEW YORK STOCK EXCHANGE")

            /*
              Şimdilik yalnızca sade ABD hisse sembollerini kabul ediyoruz.

              Örnek:
              AAPL ✅
              MSFT ✅
              AMD ✅

              BRK.B ❌
              ABC.DE ❌
              BTCUSD ❌
            */
            const isSimpleUsTicker =
              /^[A-Z]{1,5}$/.test(symbol)

            return isUsExchange && isSimpleUsTicker
          })
          .slice(0, 10)

        setResults(filteredResults)

        if (filteredResults.length === 0) {
          setError(
            "Desteklenen bir ABD hissesi bulunamadı."
          )
        }
      } catch (err) {
        console.error("Stock search error:", err)

        if (!cancelled) {
          setResults([])
          setError("Arama sırasında hata oluştu.")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }, 500)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [query])

  const openStock = (symbol: string) => {
    const normalizedSymbol = symbol
      .trim()
      .toUpperCase()

    if (!normalizedSymbol) {
      return
    }

    setQuery("")
    setResults([])
    setError("")

    navigate(`/stock/${normalizedSymbol}`)
  }

  const handleSubmit = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault()

    if (results.length > 0) {
      openStock(results[0].symbol)
      return
    }

    const directSymbol = query
      .trim()
      .toUpperCase()

    if (/^[A-Z]{1,5}$/.test(directSymbol)) {
      openStock(directSymbol)
    }
  }

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth: 600,
        marginTop: 24,
      }}
    >
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={query}
          onChange={(event) =>
            setQuery(event.target.value)
          }
          placeholder="Şirket adı veya sembol ara..."
          autoComplete="off"
          spellCheck={false}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "14px 16px",
            borderRadius: 10,
            border: "1px solid #475569",
            background: "#1e293b",
            color: "white",
            fontSize: 16,
            outline: "none",
          }}
        />
      </form>

      {loading && (
        <p
          style={{
            marginTop: 8,
            marginBottom: 0,
            color: "#94a3b8",
          }}
        >
          Aranıyor...
        </p>
      )}

      {!loading &&
        error &&
        query.trim().length > 0 && (
          <p
            style={{
              marginTop: 8,
              marginBottom: 0,
              color: "#f87171",
            }}
          >
            {error}
          </p>
        )}

      {!loading && results.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            right: 0,
            zIndex: 20,
            overflow: "hidden",
            borderRadius: 10,
            border: "1px solid #475569",
            background: "#0f172a",
            boxShadow:
              "0 18px 40px rgba(0, 0, 0, 0.35)",
          }}
        >
          {results.map((stock) => (
            <button
              key={`${stock.symbol}-${stock.exchange}`}
              type="button"
              onClick={() => openStock(stock.symbol)}
              style={{
                width: "100%",
                border: "none",
                borderBottom:
                  "1px solid #1e293b",
                background: "transparent",
                color: "white",
                padding: "12px 14px",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 16,
                }}
              >
                <div
                  style={{
                    minWidth: 0,
                  }}
                >
                  <strong>{stock.symbol}</strong>

                  <div
                    style={{
                      marginTop: 4,
                      color: "#cbd5e1",
                      fontSize: 14,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {stock.name}
                  </div>
                </div>

                <div
                  style={{
                    flexShrink: 0,
                    color: "#94a3b8",
                    fontSize: 12,
                    textAlign: "right",
                  }}
                >
                  <div>{stock.exchange}</div>

                  {stock.currency && (
                    <div>{stock.currency}</div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}