import { useMemo } from "react";

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

interface TimelineChartProps {
  rates: Rate[];
  historicalPrices: { date: Date; price: number }[];
}

const TimelineChart: React.FC<TimelineChartProps> = ({
  rates,
  historicalPrices,
}) => {
  const chartData = useMemo(() => {
    const today = new Date();
    const minDate = historicalPrices[0].date;
    const maxDate = historicalPrices[historicalPrices.length - 1].date;
    const timeRange = maxDate.getTime() - minDate.getTime();

    return {
      padding: { top: 20, right: 40, bottom: 40, left: 40 },
      today: ((today.getTime() - minDate.getTime()) / timeRange) * 100,
    };
  }, [historicalPrices]);

  return (
    <div className="w-full h-[400px] bg-white rounded-lg shadow-sm p-4 mb-8 relative">
      {/* Time axis */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gray-200" />
      <div
        className="absolute bottom-0 w-[2px] bg-gray-400"
        style={{
          left: `${chartData.today}%`,
          height: "calc(100% - 40px)",
        }}
      >
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-sm text-gray-600">
          Today
        </div>
      </div>

      {/* Currency dots */}
      {rates.map((rate) => {
        if (!rate.parityInfo) return null;

        const minDate = historicalPrices[0].date;
        const maxDate = historicalPrices[historicalPrices.length - 1].date;
        const timeRange = maxDate.getTime() - minDate.getTime();
        const position =
          ((rate.parityInfo.date.getTime() - minDate.getTime()) / timeRange) *
          100;

        // Determine color based on the same logic as cards
        let bgColorClass = "";
        const timeToParityInDays =
          rate.parityInfo.type === "future"
            ? (rate.parityInfo.date.getTime() - new Date().getTime()) /
              (1000 * 60 * 60 * 24)
            : 0;

        if (rate.satPrice >= 1) {
          bgColorClass =
            rate.parityInfo.type === "now" ? "bg-amber-500" : "bg-sky-500";
        } else if (timeToParityInDays <= 365) {
          bgColorClass = "bg-red-500";
        } else if (timeToParityInDays <= 365 * 4) {
          bgColorClass = "bg-orange-500";
        } else {
          bgColorClass = "bg-green-500";
        }

        return (
          <div
            key={rate.code}
            className={`absolute w-3 h-3 rounded-full ${bgColorClass} -translate-x-1/2 -translate-y-1/2`}
            style={{
              left: `${position}%`,
              bottom: `${Math.random() * 60 + 20}%`,
            }}
            title={`${rate.name}\n1 sat = ${rate.satPrice.toFixed(4)} ${
              rate.code
            }`}
          >
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-sm font-medium whitespace-nowrap">
              {rate.code}
            </div>
          </div>
        );
      })}

      {/* Time labels */}
      {historicalPrices.map((point, index) => {
        if (index % 2 === 0) return null; // Show fewer labels
        const position = (index / historicalPrices.length) * 100;
        return (
          <div
            key={point.date.toISOString()}
            className="absolute bottom-0 text-xs text-gray-500 -translate-x-1/2"
            style={{ left: `${position}%`, transform: "translateY(20px)" }}
          >
            {point.date.getFullYear()}
          </div>
        );
      })}
    </div>
  );
};

export default TimelineChart;
