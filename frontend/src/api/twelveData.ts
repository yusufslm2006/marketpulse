import type { ChartRange } from "./fmp"

const API_KEY = import.meta.env.VITE_TWELVEDATA_API_KEY
const BASE_URL = "https://api.twelvedata.com"

export interface TwelveDataChartPoint {
  time: string
  price: number
}

interface TwelveDataValue {
  datetime?: string
  close?: string
}

interface TwelveDataResponse {
  status?: string
  message?: string
  values?: TwelveDataValue[]
}

function formatIntradayTime(datetime: string): string {
  const parsedDate = new Date(datetime.replace(" ", "T"))

  if (Number.isNaN(parsedDate.getTime())) {
    return datetime
  }

  return parsedDate.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatDailyDate(datetime: string): string {
  const datePart = datetime.split(" ")[0]
  const parsedDate = new Date(`${datePart}T00:00:00`)

  if (Number.isNaN(parsedDate.getTime())) {
    return datePart
  }

  return parsedDate.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
  })
}

function getOutputSize(range: ChartRange): number {
  switch (range) {
    case "1D":
      return 100

    case "1W":
      return 10

    case "1M":
      return 35

    case "6M":
      return 140

    case "1Y":
      return 270

    default:
      return 100
  }
}

export async function getTwelveDataChart(
  symbol: string,
  range: ChartRange
): Promise<TwelveDataChartPoint[]> {
  try {
    if (!API_KEY) {
      console.error(
        "VITE_TWELVEDATA_API_KEY çevre değişkeni bulunamadı."
      )
      return []
    }

    const normalizedSymbol = symbol.trim().toUpperCase()
    const isIntraday = range === "1D"
    const interval = isIntraday ? "15min" : "1day"
    const outputsize = getOutputSize(range)

    const url =
      `${BASE_URL}/time_series` +
      `?symbol=${encodeURIComponent(normalizedSymbol)}` +
      `&interval=${interval}` +
      `&outputsize=${outputsize}` +
      `&order=desc` +
      `&timezone=America/New_York` +
      `&apikey=${API_KEY}`

    const response = await fetch(url)

    if (!response.ok) {
      console.error(
        `Twelve Data HTTP error for ${normalizedSymbol}:`,
        response.status,
        response.statusText
      )
      return []
    }

    const data: TwelveDataResponse =
      await response.json()

    console.log(
      `TWELVE DATA RESPONSE ${normalizedSymbol} ${range}:`,
      data
    )

    if (
      data.status === "error" ||
      !Array.isArray(data.values)
    ) {
      console.error(
        `Twelve Data error for ${normalizedSymbol}:`,
        data.message ?? data
      )
      return []
    }

    const validValues = data.values
      .map((item) => ({
        rawDate: item.datetime ?? "",
        price: Number(item.close),
      }))
      .filter(
        (item) =>
          item.rawDate.length > 0 &&
          Number.isFinite(item.price)
      )

    if (validValues.length === 0) {
      return []
    }

    if (isIntraday) {
      const latestTradingDate =
        validValues[0].rawDate.split(" ")[0]

      return validValues
        .filter((item) =>
          item.rawDate.startsWith(latestTradingDate)
        )
        .reverse()
        .map((item) => ({
          time: formatIntradayTime(item.rawDate),
          price: item.price,
        }))
    }

    return validValues
      .reverse()
      .map((item) => ({
        time: formatDailyDate(item.rawDate),
        price: item.price,
      }))
  } catch (error) {
    console.error(
      `Twelve Data chart error for ${symbol}, range ${range}:`,
      error
    )
    return []
  }
}

/*
  Eski importların bozulmaması için bu fonksiyonu da tutuyoruz.
*/
export async function getOneDayChart(
  symbol: string
): Promise<TwelveDataChartPoint[]> {
  return getTwelveDataChart(symbol, "1D")
}