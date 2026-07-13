const API_KEY = import.meta.env.VITE_FINNHUB_API_KEY

const BASE_URL = "https://finnhub.io/api/v1"

export interface StockQuote {
  symbol: string
  price: number
  change: number
  percentChange: number
}

export interface StockCandle {
  time: string
  price: number
}

export async function getStockPrice(
  symbol: string
): Promise<StockQuote | null> {
  try {
    const response = await fetch(
      `${BASE_URL}/quote?symbol=${symbol}&token=${API_KEY}`
    )

    const data = await response.json()

    if (!data || data.c === undefined) {
      return null
    }

    return {
      symbol,
      price: data.c,
      change: data.d,
      percentChange: data.dp,
    }
  } catch (error) {
    console.error(error)
    return null
  }
}


export async function getMultiplePrices(symbols: string[]) {
  const results = await Promise.all(
    symbols.map((symbol) => getStockPrice(symbol))
  )

  return results.filter(
    (item): item is StockQuote => item !== null
  )
}


export async function getStockCandles(
  symbol: string
): Promise<StockCandle[]> {
  try {
    const now = Math.floor(Date.now() / 1000)

    // Son 7 gün
    const from = now - 7 * 24 * 60 * 60

    const response = await fetch(
      `${BASE_URL}/stock/candle?symbol=${symbol}&resolution=60&from=${from}&to=${now}&token=${API_KEY}`
    )

    const data = await response.json()

    if (data.s !== "ok") {
      console.error("Candle error:", data)
      return []
    }

    return data.t.map((time: number, index: number) => ({
      time: new Date(time * 1000).toLocaleDateString(),
      price: data.c[index],
    }))
  } catch (error) {
    console.error(error)
    return []
  }
}
