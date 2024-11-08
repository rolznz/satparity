import { useEffect, useState } from 'react'

interface Rate {
  code: string
  name: string
  rate: number
  satPrice: number
  parityInfo?: {
    type: 'past' | 'future' | 'now'
    date: Date
  }
}

const HISTORICAL_BTC_USD_PRICES = [
  { date: new Date('2010-01-01'), price: 0.09 },
  { date: new Date('2013-01-01'), price: 1238 },
  { date: new Date('2018-01-01'), price: 20000 },
  { date: new Date('2021-01-01'), price: 68000 },
  { date: new Date('2024-11-08'), price: 75000 },
  // estimated
  { date: new Date('2025-01-01'), price: 300_000 },
  { date: new Date('2029-01-01'), price: 3_000_000 },
  { date: new Date('2034-01-01'), price: 10_000_000 },
  { date: new Date('2038-01-01'), price: 100_000_000 },
  { date: new Date('2042-01-01'), price: 1_000_000_000 },
  { date: new Date('2046-01-01'), price: 10_000_000_000 },
]

function findParityDate(code: string, btcUsdRate: number, btcRate: number): { type: 'past' | 'future' | 'now', date: Date } {
  const satPrice = btcRate / 100_000_000
  const today = new Date()

  // If exactly at parity (within small margin)
  if (Math.abs(satPrice - 1) < 0.1) {
    return { type: 'now', date: today }
  }

  // Calculate the BTC price needed for this currency to hit parity
   
  const btcPriceRatio = (100_000_000 / btcRate);
  const usdPriceNeeded = btcUsdRate * btcPriceRatio ;

  // Find when/if parity occurred or will occur
  for (let i = 0; i < HISTORICAL_BTC_USD_PRICES.length - 1; i++) {
    const current = HISTORICAL_BTC_USD_PRICES[i]
    const next = HISTORICAL_BTC_USD_PRICES[i + 1]

    // Check if parity occurred between these two points
    if (current.price <= usdPriceNeeded &&  
        next.price >= usdPriceNeeded) {
      console.log(code +" found between " + current.price + ", " + next.price)
      // Linear interpolation to estimate exact date
      const ratio = (usdPriceNeeded - current.price) / (next.price - current.price)
      const timestamp = Math.floor(current.date.getTime() + 
        (next.date.getTime() - current.date.getTime()) * ratio)
      
      return {
        type: timestamp <= today.getTime() ? 'past' : 'future',
        date: new Date(timestamp)
      }
    }
  }

  // If we didn't find a crossing point, use the end points of our data
  // If current satPrice > 1, it happened before our earliest data
  if (satPrice >= 1) {
    return {
      type: 'past',
      date: HISTORICAL_BTC_USD_PRICES[0].date
    }
  }

  // If current satPrice < 1 and no crossing found, it happens after our latest data
  return {
    type: 'future',
    date: HISTORICAL_BTC_USD_PRICES[HISTORICAL_BTC_USD_PRICES.length - 1].date
  }
}

function formatTimeDistance(date: Date): string {
  const now = new Date()
  const diffInDays = Math.abs(date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  
  if (diffInDays < 30) {
    const days = Math.round(diffInDays)
    return `${days} day${days === 1 ? '' : 's'}`
  }
  
  if (diffInDays < 365) {
    const months = Math.round(diffInDays / 30)
    return `${months} month${months === 1 ? '' : 's'}`
  }
  
  const years = Math.round(diffInDays / 365)
  return `${years} year${years === 1 ? '' : 's'}`
}

function App() {
  const [rates, setRates] = useState<Rate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showHistoric, setShowHistoric] = useState(false)

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const response = await fetch('https://api.yadio.io/exrates/BTC')
        const data = await response.json()
        const btcUsdRate: number = data.BTC["USD"];
        
        const ratesArray = Object.entries(data.BTC)
          .map(([code, rate]) => ({
            code,
            name: new Intl.DisplayNames(['en'], { type: 'currency' }).of(code) || code,
            rate: rate as number,
            satPrice: (rate as number) / 100_000_000,
            parityInfo: findParityDate(code,btcUsdRate, rate as number)
          }))
          .filter(rate => rate.code !== 'BTC')

        // Sort by sat price (descending)
        const sortedRates = ratesArray.sort((a, b) => b.satPrice - a.satPrice)
        setRates(sortedRates)
        setLoading(false)
      } catch (err) {
        setError('Failed to fetch rates. Please try again later.')
        setLoading(false)
        console.error('Error fetching rates:', err)
      }
    }

    fetchRates()
    // Refresh every 5 minutes
    const interval = setInterval(fetchRates, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg font-medium">Loading rates...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg shadow-sm">
          {error}
        </div>
      </div>
    )
  }

  // Filter out historical rates older than 3 years if showHistoric is false
  const now = new Date()
  const threeYearsAgo = new Date(now.getFullYear() - 3, now.getMonth(), now.getDate())
  
  const filteredRates = rates.filter(rate => {
    if (!showHistoric && rate.parityInfo?.type === 'past') {
      return rate.parityInfo.date >= threeYearsAgo
    }
    return true
  })

  return (
    <div className="container mx-auto px-4 py-8 max-w-[1600px]">
      <div className="flex flex-col items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold text-center">
          Bitcoin Purchasing Power Tracker
        </h1>
        
        {/* Toggle Switch */}
        <label className="inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={showHistoric}
            onChange={(e) => setShowHistoric(e.target.checked)}
            className="sr-only peer"
          />
          <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-sky-400 peer-checked:to-sky-500"></div>
          <span className="ms-3 text-sm font-medium text-gray-900">Show Historic Rates</span>
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
        {filteredRates.map(rate => {
          const parityText = rate.parityInfo?.type === 'past'
            ? `Hit parity ${formatTimeDistance(rate.parityInfo.date)} ago`
            : rate.parityInfo?.type === 'future'
              ? `Expected parity in ${formatTimeDistance(rate.parityInfo.date)}`
              : 'Just hit parity!'

          // Calculate time to parity for future dates
          const timeToParityInDays = rate.parityInfo?.type === 'future' 
            ? (rate.parityInfo.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            : 0

          // Determine background color class based on conditions
          let bgColorClass = ''
          if (rate.satPrice >= 1) {
            bgColorClass = rate.parityInfo?.type === 'now'
              ? 'bg-gradient-to-br from-amber-400 to-amber-500'  // Gold for just hit
              : 'bg-gradient-to-br from-sky-400 to-sky-500'      // Light blue for past parity
          } else if (timeToParityInDays <= 365) {
            bgColorClass = 'bg-gradient-to-br from-red-400 to-red-500'    // Red for next year
          } else if (timeToParityInDays <= 365 * 4) {
            bgColorClass = 'bg-gradient-to-br from-orange-400 to-orange-500'  // Orange for next 4 years
          } else {
            bgColorClass = 'bg-gradient-to-br from-green-400 to-green-500'    // Green for beyond
          }

          const textColorClass = rate.satPrice >= 1 || timeToParityInDays <= 365 * 4 ? 'text-white' : 'text-white'

          return (
            <div 
              key={rate.code}
              className={`
                p-4 rounded-lg shadow-sm transition-transform hover:-translate-y-1
                ${bgColorClass} ${textColorClass}
              `}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">{rate.code}</h3>
                {rate.satPrice >= 1 && (
                  <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                    Sat Parity
                  </span>
                )}
              </div>
              <p className="text-sm mb-2 text-white/90">
                {rate.name}
              </p>
              <p className="text-sm font-medium text-white">
                1 sat = {rate.satPrice.toFixed(4)} {rate.code}
              </p>
              <p className="text-xs mt-2 text-white/80">
                1 BTC = {rate.rate.toLocaleString()} {rate.code}
              </p>
              <p className="text-xs mt-2 text-white/80">
                {parityText}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default App
