import { useEffect, useState, useRef } from "react";
import InfoModal from "./components/InfoModal";
import DonateModal from "./components/DonateModal";

interface Rate {
  code: string;
  name: string;
  rate: number;
  satPrice: number;
  parityInfo?: {
    type: "past" | "future" | "now";
    date: Date;
  };
}

const HISTORICAL_BTC_USD_PRICES = [
  { date: new Date("2010-01-01"), price: 0.09 },
  { date: new Date("2013-01-01"), price: 1238 },
  { date: new Date("2018-01-01"), price: 20000 },
  { date: new Date("2021-01-01"), price: 68000 },
  { date: new Date("2024-11-08"), price: 75000 },
  // estimated
  { date: new Date("2025-01-01"), price: 300_000 },
  { date: new Date("2029-01-01"), price: 3_000_000 },
  { date: new Date("2034-01-01"), price: 10_000_000 },
  { date: new Date("2038-01-01"), price: 100_000_000 },
  { date: new Date("2042-01-01"), price: 1_000_000_000 },
  { date: new Date("2046-01-01"), price: 10_000_000_000 },
];

function findParityDate(
  btcUsdRate: number,
  btcRate: number
): { type: "past" | "future" | "now"; date: Date } {
  const satPrice = btcRate / 100_000_000;
  const today = new Date();

  // If exactly at parity (within small margin)
  if (satPrice >= 1 && satPrice < 1.25) {
    return { type: "now", date: today };
  }

  // Calculate the BTC price needed for this currency to hit parity
  const btcPriceRatio = 100_000_000 / btcRate;
  const usdPriceNeeded = btcUsdRate * btcPriceRatio;

  // Find when/if parity occurred or will occur
  for (let i = 0; i < HISTORICAL_BTC_USD_PRICES.length - 1; i++) {
    const current = HISTORICAL_BTC_USD_PRICES[i];
    const next = HISTORICAL_BTC_USD_PRICES[i + 1];

    // Check if parity occurred between these two points
    if (current.price <= usdPriceNeeded && next.price >= usdPriceNeeded) {
      // Linear interpolation to estimate exact date
      const ratio =
        (usdPriceNeeded - current.price) / (next.price - current.price);
      const timestamp = Math.floor(
        current.date.getTime() +
          (next.date.getTime() - current.date.getTime()) * ratio
      );

      return {
        type: timestamp <= today.getTime() && satPrice > 1 ? "past" : "future",
        date: new Date(timestamp),
      };
    }
  }

  // If we didn't find a crossing point, use the end points of our data
  // If current satPrice > 1, it happened before our earliest data
  if (satPrice >= 1) {
    return {
      type: "past",
      date: HISTORICAL_BTC_USD_PRICES[0].date,
    };
  }

  // If current satPrice < 1 and no crossing found, it happens after our latest data
  return {
    type: "future",
    date: HISTORICAL_BTC_USD_PRICES[HISTORICAL_BTC_USD_PRICES.length - 1].date,
  };
}

function formatTimeDistance(date: Date): string {
  const now = new Date();
  const diffInDays =
    Math.abs(date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  if (diffInDays < 30) {
    const days = Math.round(diffInDays);
    return `${days} day${days === 1 ? "" : "s"}`;
  }

  if (diffInDays < 365) {
    const months = Math.round(diffInDays / 30);
    return `${months} month${months === 1 ? "" : "s"}`;
  }

  const years = Math.round(diffInDays / 365);
  return `${years} year${years === 1 ? "" : "s"}`;
}

function App() {
  const [rates, setRates] = useState<Rate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHistoric, setShowHistoric] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isDonateModalOpen, setIsDonateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const response = await fetch("https://api.yadio.io/exrates/BTC");
        const data = await response.json();
        const btcUsdRate: number = data.BTC["USD"];

        const ratesArray = Object.entries(data.BTC)
          .map(([code, rate]) => ({
            code,
            name:
              new Intl.DisplayNames(["en"], { type: "currency" }).of(code) ||
              code,
            rate: rate as number,
            satPrice: (rate as number) / 100_000_000,
            parityInfo: findParityDate(btcUsdRate, rate as number),
          }))
          .filter((rate) => !["BTC", "XAG", "XPT", "XAU"].includes(rate.code));

        // Sort by sat price (descending)
        const sortedRates = ratesArray.sort((a, b) => b.satPrice - a.satPrice);
        setRates(sortedRates);
        setLoading(false);
      } catch (err) {
        setError("Failed to fetch rates. Please try again later.");
        setLoading(false);
        console.error("Error fetching rates:", err);
      }
    };

    fetchRates();
    // Refresh every 5 minutes
    const interval = setInterval(fetchRates, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const matchedRate = rates.find(
        (rate) =>
          rate.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          rate.name.toLowerCase().includes(searchTerm.toLowerCase())
      );

      if (matchedRate) {
        cardRefs.current[matchedRate.code]?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }
  }, [searchTerm, rates]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg font-medium">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg shadow-sm">
          {error}
        </div>
      </div>
    );
  }

  // Filter out historical rates older than 3 years if showHistoric is false
  const now = new Date();
  const threeYearsAgo = new Date(
    now.getFullYear() - 3,
    now.getMonth(),
    now.getDate()
  );

  const filteredRates = rates.filter((rate) => {
    const matchesSearch =
      searchTerm === "" ||
      rate.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rate.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesHistoric =
      !showHistoric && rate.parityInfo?.type === "past"
        ? rate.parityInfo.date >= threeYearsAgo
        : true;

    return matchesSearch && matchesHistoric;
  });

  const parityCount = rates.filter(
    (rate) =>
      rate.parityInfo?.type === "past" || rate.parityInfo?.type === "now"
  ).length;
  const parityPercentage = Math.round((parityCount / rates.length) * 100);

  return (
    <div className="container mx-auto px-4 py-8 max-w-[1600px]">
      <div className="mb-4 space-y-6">
        <h1 className="text-3xl font-bold text-center">
          Bitcoin Purchasing
          <br />
          Power Tracker
          <br />
          <span className="text-xs font-normal font-mono">
            1 sat = 0.0000000<span className="font-medium">1</span> BTC
          </span>
        </h1>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-lg shadow-sm">
          <div className="flex-grow max-w-md w-full">
            <div className="relative">
              <input
                type="text"
                placeholder="Search currency (e.g. USD, Euro)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <svg
                className="w-5 h-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="inline-flex items-center cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                checked={showHistoric}
                onChange={(e) => setShowHistoric(e.target.checked)}
                className="sr-only peer"
              />
              <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-sky-400 peer-checked:to-sky-500"></div>
              <span className="ms-3 text-sm font-medium text-gray-900">
                Show Long Dead
              </span>
            </label>

            <button
              onClick={() => setIsDonateModalOpen(true)}
              className="p-2 text-yellow-500 hover:text-yellow-600 transition-colors rounded-full hover:bg-yellow-50"
              aria-label="Support"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </button>

            <button
              onClick={() => setIsInfoModalOpen(true)}
              className="p-2 text-blue-400 hover:text-blue-600 transition-colors rounded-full hover:bg-blue-50"
              aria-label="Information"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
        {filteredRates.map((rate) => {
          const parityText =
            rate.parityInfo?.type === "past"
              ? `Hit parity ${formatTimeDistance(rate.parityInfo.date)} ago`
              : rate.parityInfo?.type === "future"
              ? `Expected parity in ${formatTimeDistance(rate.parityInfo.date)}`
              : "Just hit parity!";

          // Calculate time to parity for future dates
          const timeToParityInDays =
            rate.parityInfo?.type === "future"
              ? (rate.parityInfo.date.getTime() - now.getTime()) /
                (1000 * 60 * 60 * 24)
              : 0;

          // Determine background color class based on conditions
          let bgColorClass = "";
          if (rate.satPrice >= 1) {
            bgColorClass =
              rate.parityInfo?.type === "now"
                ? "bg-gradient-to-br from-amber-400 to-amber-500" // Gold for just hit
                : "bg-gradient-to-br from-sky-400 to-sky-500"; // Light blue for past parity
          } else if (timeToParityInDays <= 365) {
            bgColorClass = "bg-gradient-to-br from-red-400 to-red-500"; // Red for next year
          } else if (timeToParityInDays <= 365 * 4) {
            bgColorClass = "bg-gradient-to-br from-orange-400 to-orange-500"; // Orange for next 4 years
          } else {
            bgColorClass = "bg-gradient-to-br from-green-400 to-green-500"; // Green for beyond
          }

          const textColorClass =
            rate.satPrice >= 1 || timeToParityInDays <= 365 * 4
              ? "text-white"
              : "text-white";

          return (
            <div
              key={rate.code}
              ref={(el) => (cardRefs.current[rate.code] = el)}
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
              <p className="text-sm mb-2 text-white/90">{rate.name}</p>
              <p className="text-sm font-medium text-white">
                1 sat = {rate.satPrice.toFixed(4)} {rate.code}
              </p>
              <p className="text-xs mt-2 text-white/80">
                1 BTC = {rate.rate.toLocaleString()} {rate.code}
              </p>
              <p className="text-xs mt-2 text-white/80">{parityText}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-white shadow-lg p-4 mt-4">
        <div className="container mx-auto max-w-[1600px]">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="font-semibold">The Sattening</span>
              <span className="font-semibold">{parityPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-gradient-to-r from-sky-400 to-sky-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${parityPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      <InfoModal
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
      />

      <DonateModal
        isOpen={isDonateModalOpen}
        onClose={() => setIsDonateModalOpen(false)}
      />
    </div>
  );
}

export default App;
