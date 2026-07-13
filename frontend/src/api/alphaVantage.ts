const API_KEY = import.meta.env.VITE_ALPHA_API_KEY

export interface ChartPoint {
  time: string
  price: number
}

export async function getDailyChart(symbol: string): Promise<ChartPoint[]> {
  try {
    const response = await fetch(
      `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${API_KEY}`
    )

    const data = await response.json()
    
    console.log("ALPHA RESPONSE:", data)
    const series = data["Time Series (Daily)"]

    if (!series) {
      console.error("Alpha Vantage:", data)
      return []
    }

    return Object.entries(series)
      .slice(0, 30)
      .reverse()
      .map(([date, value]: any) => ({
        time: date,
        price: Number(value["4. close"]),
      }))
  } catch (error) {
    console.error(error)
    return []
  }
}
