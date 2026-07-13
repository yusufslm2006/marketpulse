const API_KEY = import.meta.env.VITE_FMP_API_KEY

export type ChartRange =
  | "1D"
  | "1W"
  | "1M"
  | "6M"
  | "1Y"

export interface ChartPoint {
  time: string
  price: number
}

interface FmpDailyItem {
  date?: string
  price?: number | string
  close?: number | string
}

interface FmpIntradayItem {
  date?: string
  close?: number | string
}

function formatDateForApi(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function formatDailyLabel(date: string): string {
  const parsedDate = new Date(`${date}T00:00:00`)

  if (Number.isNaN(parsedDate.getTime())) {
    return date
  }

  return parsedDate.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
  })
}

function formatIntradayLabel(date: string): string {
  const parsedDate = new Date(date.replace(" ", "T"))

  if (Number.isNaN(parsedDate.getTime())) {
    return date
  }

  return parsedDate.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getRangeStartDate(
  range: Exclude<ChartRange, "1D">
): Date {
  const startDate = new Date()

  switch (range) {
    case "1W":
      startDate.setDate(startDate.getDate() - 7)
      break

    case "1M":
      startDate.setMonth(startDate.getMonth() - 1)
      break

    case "6M":
      startDate.setMonth(startDate.getMonth() - 6)
      break

    case "1Y":
      startDate.setFullYear(startDate.getFullYear() - 1)
      break
  }

  startDate.setHours(0, 0, 0, 0)

  return startDate
}

async function getIntradayChart(
  symbol: string
): Promise<ChartPoint[]> {
  const today = new Date()
  const fromDate = new Date()

  // Hafta sonu veya piyasa tatili olasılığı için
  // birkaç günlük veri istiyoruz.
  fromDate.setDate(fromDate.getDate() - 5)

  const url =
    "https://financialmodelingprep.com/stable/historical-chart/15min" +
    `?symbol=${encodeURIComponent(symbol)}` +
    `&from=${formatDateForApi(fromDate)}` +
    `&to=${formatDateForApi(today)}` +
    `&apikey=${API_KEY}`

  const response = await fetch(url)

  if (!response.ok) {
    console.error(
      `FMP intraday HTTP error for ${symbol}:`,
      response.status,
      response.statusText
    )

    return []
  }

  const data: unknown = await response.json()

  if (!Array.isArray(data)) {
    console.error(
      `FMP intraday invalid response for ${symbol}:`,
      data
    )

    return []
  }

  const validItems = (data as FmpIntradayItem[])
    .map((item) => ({
      rawDate: item.date ?? "",
      price: Number(item.close),
    }))
    .filter(
      (item) =>
        item.rawDate.length > 0 &&
        Number.isFinite(item.price)
    )

  if (validItems.length === 0) {
    return []
  }

  // API genellikle en yeni veriyi önce döndürür.
  // En güncel işlem gününün verilerini seçiyoruz.
  const latestTradingDate =
    validItems[0].rawDate.split(" ")[0]

  return validItems
    .filter((item) =>
      item.rawDate.startsWith(latestTradingDate)
    )
    .reverse()
    .map((item) => ({
      time: formatIntradayLabel(item.rawDate),
      price: item.price,
    }))
}

async function getDailyChart(
  symbol: string,
  range: Exclude<ChartRange, "1D">
): Promise<ChartPoint[]> {
  const response = await fetch(
    "https://financialmodelingprep.com/stable/historical-price-eod/light" +
      `?symbol=${encodeURIComponent(symbol)}` +
      `&apikey=${API_KEY}`
  )

  if (!response.ok) {
    console.error(
      `FMP daily HTTP error for ${symbol}:`,
      response.status,
      response.statusText
    )

    return []
  }

  const data: unknown = await response.json()

  if (!Array.isArray(data)) {
    console.error(
      `FMP daily invalid response for ${symbol}:`,
      data
    )

    return []
  }

  const startDate = getRangeStartDate(range)

  return (data as FmpDailyItem[])
    .map((item) => {
      const rawPrice = item.price ?? item.close
      const price = Number(rawPrice)
      const rawDate = item.date ?? ""

      return {
        rawDate,
        price,
      }
    })
    .filter((item) => {
      if (
        item.rawDate.length === 0 ||
        !Number.isFinite(item.price)
      ) {
        return false
      }

      const itemDate = new Date(
        `${item.rawDate}T00:00:00`
      )

      return (
        !Number.isNaN(itemDate.getTime()) &&
        itemDate >= startDate
      )
    })
    .reverse()
    .map((item) => ({
      time: formatDailyLabel(item.rawDate),
      price: item.price,
    }))
}

export async function getChart(
  symbol: string,
  range: ChartRange
): Promise<ChartPoint[]> {
  try {
    if (!API_KEY) {
      console.error(
        "VITE_FMP_API_KEY çevre değişkeni bulunamadı."
      )
      return []
    }

    const normalizedSymbol = symbol
      .trim()
      .toUpperCase()

    if (!normalizedSymbol) {
      return []
    }

    if (range === "1D") {
      return await getIntradayChart(normalizedSymbol)
    }

    return await getDailyChart(
      normalizedSymbol,
      range
    )
  } catch (error) {
    console.error(
      `FMP chart error for ${symbol}, range ${range}:`,
      error
    )

    return []
  }
}