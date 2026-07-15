const API_KEY = import.meta.env.VITE_FMP_API_KEY

const BASE_URL = "https://financialmodelingprep.com/stable"

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

export interface StockSearchResult {
  symbol: string
  name: string
  exchange: string
  currency: string
}

interface FmpDailyItem {
  date?: string
  price?: number | string
  close?: number | string
}

interface FmpIntradayItem {
  date?: string
  close?: number | string
  price?: number | string
}

interface FmpSearchItem {
  symbol?: string
  name?: string
  exchange?: string
  exchangeShortName?: string
  exchangeFullName?: string
  currency?: string
}

/* -------------------------------------------------------
   ORTAK YARDIMCI FONKSİYONLAR
------------------------------------------------------- */

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase()
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

/* -------------------------------------------------------
   1D FMP GRAFİĞİ

   Not: Senin mevcut FMP planında bu endpoint 402
   döndürebilir. StockDetail.tsx içinde 1D için
   Twelve Data kullandığımızdan bu fonksiyon çoğunlukla
   doğrudan kullanılmayacaktır.
------------------------------------------------------- */

async function getIntradayChart(
  symbol: string
): Promise<ChartPoint[]> {
  const today = new Date()
  const fromDate = new Date()

  // Hafta sonu veya tatil ihtimali için son 5 günü ister.
  fromDate.setDate(fromDate.getDate() - 5)

  const url =
    `${BASE_URL}/historical-chart/15min` +
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
    .map((item) => {
      const rawPrice = item.close ?? item.price

      return {
        rawDate: item.date ?? "",
        price: Number(rawPrice),
      }
    })
    .filter(
      (item) =>
        item.rawDate.length > 0 &&
        Number.isFinite(item.price)
    )

  if (validItems.length === 0) {
    return []
  }

  // FMP çoğunlukla en yeni veriyi önce döndürür.
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

/* -------------------------------------------------------
   1W / 1M / 6M / 1Y GÜNLÜK GRAFİK
------------------------------------------------------- */

async function getDailyChart(
  symbol: string,
  range: Exclude<ChartRange, "1D">
): Promise<ChartPoint[]> {
  const url =
    `${BASE_URL}/historical-price-eod/light` +
    `?symbol=${encodeURIComponent(symbol)}` +
    `&apikey=${API_KEY}`

  const response = await fetch(url)

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

      return {
        rawDate: item.date ?? "",
        price: Number(rawPrice),
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

/* -------------------------------------------------------
   DIŞARIDAN KULLANILAN GRAFİK FONKSİYONU
------------------------------------------------------- */

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

    const normalizedSymbol = normalizeSymbol(symbol)

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

/* -------------------------------------------------------
   HİSSE ARAMA YARDIMCI FONKSİYONLARI
------------------------------------------------------- */

function normalizeSearchResults(
  data: unknown
): StockSearchResult[] {
  if (!Array.isArray(data)) {
    return []
  }

  return (data as FmpSearchItem[])
    .filter(
      (item) =>
        typeof item.symbol === "string" &&
        typeof item.name === "string"
    )
    .map((item) => ({
      symbol: normalizeSymbol(item.symbol ?? ""),
      name: (item.name ?? "").trim(),

      exchange:
        item.exchangeFullName ??
        item.exchangeShortName ??
        item.exchange ??
        "Unknown",

      currency: item.currency ?? "",
    }))
    .filter(
      (item) =>
        item.symbol.length > 0 &&
        item.name.length > 0
    )
}

function isSupportedUsStock(
  stock: StockSearchResult
): boolean {
  const exchange = stock.exchange.toUpperCase()

  const isUsExchange =
    exchange.includes("NASDAQ") ||
    exchange.includes("NYSE") ||
    exchange.includes("AMEX") ||
    exchange.includes("NEW YORK STOCK EXCHANGE") ||
    exchange.includes("NASDAQ GLOBAL") ||
    exchange.includes("NASDAQ CAPITAL")

  /*
    Şimdilik yalnızca sade ABD ticker'ları.

    AAPL  ✅
    MSFT  ✅
    TSLA  ✅

    BRK.B ❌
    ABC.DE ❌
    BTCUSD ❌
  */
  const isSimpleTicker =
    /^[A-Z]{1,5}$/.test(stock.symbol)

  return isUsExchange && isSimpleTicker
}

function removeDuplicateStocks(
  stocks: StockSearchResult[]
): StockSearchResult[] {
  return Array.from(
    new Map(
      stocks.map((stock) => [
        stock.symbol,
        stock,
      ])
    ).values()
  )
}

/* -------------------------------------------------------
   SEMBOL + ŞİRKET ADI ARAMA
------------------------------------------------------- */

export async function searchStocks(
  query: string
): Promise<StockSearchResult[]> {
  const normalizedQuery = query.trim()

  if (!normalizedQuery) {
    return []
  }

  if (!API_KEY) {
    console.error(
      "VITE_FMP_API_KEY çevre değişkeni bulunamadı."
    )
    return []
  }

  try {
    const encodedQuery =
      encodeURIComponent(normalizedQuery)

    const symbolUrl =
      `${BASE_URL}/search-symbol` +
      `?query=${encodedQuery}` +
      `&apikey=${API_KEY}`

    const nameUrl =
      `${BASE_URL}/search-name` +
      `?query=${encodedQuery}` +
      `&apikey=${API_KEY}`

    const [symbolResponse, nameResponse] =
      await Promise.all([
        fetch(symbolUrl),
        fetch(nameUrl),
      ])

    let symbolData: unknown = []
    let nameData: unknown = []

    if (symbolResponse.ok) {
      symbolData = await symbolResponse.json()
    } else {
      console.error(
        "FMP symbol search HTTP error:",
        symbolResponse.status,
        symbolResponse.statusText
      )
    }

    if (nameResponse.ok) {
      nameData = await nameResponse.json()
    } else {
      console.error(
        "FMP name search HTTP error:",
        nameResponse.status,
        nameResponse.statusText
      )
    }

    const combinedResults = [
      ...normalizeSearchResults(symbolData),
      ...normalizeSearchResults(nameData),
    ]

    const uniqueResults =
      removeDuplicateStocks(combinedResults)

    const lowerQuery =
      normalizedQuery.toLocaleLowerCase("en-US")

    return uniqueResults
      .filter(isSupportedUsStock)
      .sort((a, b) => {
        const aSymbol =
          a.symbol.toLocaleLowerCase("en-US")

        const bSymbol =
          b.symbol.toLocaleLowerCase("en-US")

        const aName =
          a.name.toLocaleLowerCase("en-US")

        const bName =
          b.name.toLocaleLowerCase("en-US")

        // 1. Tam sembol eşleşmesi.
        const aExactSymbol =
          aSymbol === lowerQuery

        const bExactSymbol =
          bSymbol === lowerQuery

        if (aExactSymbol && !bExactSymbol) {
          return -1
        }

        if (bExactSymbol && !aExactSymbol) {
          return 1
        }

        // 2. Tam şirket adı eşleşmesi.
        const aExactName =
          aName === lowerQuery

        const bExactName =
          bName === lowerQuery

        if (aExactName && !bExactName) {
          return -1
        }

        if (bExactName && !aExactName) {
          return 1
        }

        // 3. Şirket adı sorguyla başlıyorsa.
        const aNameStarts =
          aName.startsWith(lowerQuery)

        const bNameStarts =
          bName.startsWith(lowerQuery)

        if (aNameStarts && !bNameStarts) {
          return -1
        }

        if (bNameStarts && !aNameStarts) {
          return 1
        }

        // 4. Sembol sorguyla başlıyorsa.
        const aSymbolStarts =
          aSymbol.startsWith(lowerQuery)

        const bSymbolStarts =
          bSymbol.startsWith(lowerQuery)

        if (aSymbolStarts && !bSymbolStarts) {
          return -1
        }

        if (bSymbolStarts && !aSymbolStarts) {
          return 1
        }

        // 5. Şirket adının içinde sorgu geçiyorsa.
        const aNameIncludes =
          aName.includes(lowerQuery)

        const bNameIncludes =
          bName.includes(lowerQuery)

        if (aNameIncludes && !bNameIncludes) {
          return -1
        }

        if (bNameIncludes && !aNameIncludes) {
          return 1
        }

        return a.name.localeCompare(b.name)
      })
      .slice(0, 10)
  } catch (error) {
    console.error(
      "FMP stock search error:",
      error
    )

    return []
  }
}