import { useState, useEffect } from "react";

// 6-Stage Restaurant Journey
const journeyStages = [
    {
        id: 1,
        icon: "📱",
        title: "Scan & Browse",
        description: "Customer scans QR code",
        color: "#10b981",
    },
    {
        id: 2,
        icon: "🍔",
        title: "Order Placed Instantly",
        description: "Food item selected",
        color: "#f59e0b",
    },
    {
        id: 3,
        icon: "👨‍🍳",
        title: "Kitchen Notified",
        description: "Real-time order alert",
        color: "#ef4444",
    },
    {
        id: 4,
        icon: "🍽️",
        title: "Serve Faster",
        description: "Waiter receives order",
        color: "#8b5cf6",
    },
    {
        id: 5,
        icon: "🧾",
        title: "Auto-Generated Bill",
        description: "Instant bill printing",
        color: "#06b6d4",
    },
    {
        id: 6,
        icon: "📈",
        title: "Watch Profits Grow",
        description: "Analytics & insights",
        color: "#22c55e",
    },
];

export default function ScrollBar() {
    const [scrollProgress, setScrollProgress] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const [profitCounter, setProfitCounter] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const progress = Math.min((scrollTop / docHeight) * 100, 100);
            setScrollProgress(progress);
            setIsVisible(scrollTop > 80);

            // Animate profit counter when at last stage
            if (progress > 85) {
                const targetProfit = 15000;
                const currentProfit = Math.floor((progress - 85) / 15 * targetProfit);
                setProfitCounter(Math.min(currentProfit, targetProfit));
            }
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    if (!isVisible) return null;

    const activeStageIndex = Math.min(
        Math.floor(scrollProgress / (100 / journeyStages.length)),
        journeyStages.length - 1
    );

    const pathProgress = scrollProgress / 100;

    // Full screen height calculations
    const containerHeight = 720; // Increased from 520
    const svgHeight = 720;
    const yPositions = [50, 150, 260, 380, 500, 640]; // Spread out more

    return (
        <div className="fixed right-3 top-1/2 -translate-y-1/2 z-50 hidden xl:block">
            <div className="relative w-40" style={{ height: `${containerHeight}px` }}>
                {/* SVG Zigzag Path */}
                <svg
                    className="absolute inset-0 w-full h-full"
                    viewBox={`0 0 160 ${svgHeight}`}
                    fill="none"
                >
                    {/* Background path - dashed */}
                    <path
                        d={`M 35 50 L 125 100 L 35 170 L 125 240 L 35 320 L 125 390 L 35 470 L 125 540 L 35 610 L 125 680`}
                        stroke="#e2e8f0"
                        strokeWidth="2"
                        strokeDasharray="8 5"
                        fill="none"
                        strokeLinecap="round"
                    />

                    {/* Animated progress path */}
                    <path
                        d={`M 35 50 L 125 100 L 35 170 L 125 240 L 35 320 L 125 390 L 35 470 L 125 540 L 35 610 L 125 680`}
                        stroke="url(#journeyGradient)"
                        strokeWidth="3"
                        fill="none"
                        strokeLinecap="round"
                        style={{
                            strokeDasharray: 1200,
                            strokeDashoffset: 1200 - pathProgress * 1200,
                            transition: 'stroke-dashoffset 0.4s ease-out',
                            filter: 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.5))'
                        }}
                    />

                    <defs>
                        <linearGradient id="journeyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#10b981" />
                            <stop offset="20%" stopColor="#f59e0b" />
                            <stop offset="40%" stopColor="#ef4444" />
                            <stop offset="60%" stopColor="#8b5cf6" />
                            <stop offset="80%" stopColor="#06b6d4" />
                            <stop offset="100%" stopColor="#22c55e" />
                        </linearGradient>
                    </defs>
                </svg>

                {/* Flying Food Animation */}
                {activeStageIndex >= 1 && activeStageIndex <= 2 && (
                    <div
                        className="absolute z-20 transition-all duration-500 ease-out"
                        style={{
                            top: `${10 + pathProgress * 20}%`,
                            left: pathProgress > 0.2 ? '75%' : '20%',
                            transform: 'translate(-50%, -50%)',
                            animation: 'bounce 1s ease-in-out infinite'
                        }}
                    >
                        <span className="text-3xl filter drop-shadow-lg">🍔</span>
                    </div>
                )}

                {/* Journey Stages */}
                {journeyStages.map((stage, index) => {
                    const xPos = index % 2 === 0 ? 35 : 125;
                    const yPos = yPositions[index];
                    const isActive = index <= activeStageIndex;
                    const isCurrent = index === activeStageIndex;

                    return (
                        <div
                            key={stage.id}
                            className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500"
                            style={{
                                top: `${(yPos / containerHeight) * 100}%`,
                                left: `${(xPos / 160) * 100}%`
                            }}
                        >
                            {/* Stage Circle */}
                            <div
                                className={`relative flex items-center justify-center rounded-full transition-all duration-500 ${isCurrent
                                        ? 'w-16 h-16 scale-110'
                                        : isActive
                                            ? 'w-12 h-12'
                                            : 'w-11 h-11 opacity-30 grayscale'
                                    }`}
                                style={{
                                    backgroundColor: isActive ? stage.color : '#94a3b8',
                                    boxShadow: isCurrent
                                        ? `0 0 35px ${stage.color}, 0 0 70px ${stage.color}40`
                                        : '0 4px 15px rgba(0,0,0,0.2)'
                                }}
                            >
                                <span className={`transition-all duration-300 ${isCurrent ? 'text-2xl' : 'text-xl'}`}>
                                    {stage.icon}
                                </span>

                                {/* Pulse animation for current stage */}
                                {isCurrent && (
                                    <>
                                        <div
                                            className="absolute inset-0 rounded-full animate-ping opacity-40"
                                            style={{ backgroundColor: stage.color }}
                                        />
                                        <div
                                            className="absolute inset-[-5px] rounded-full animate-pulse opacity-20"
                                            style={{ backgroundColor: stage.color }}
                                        />
                                    </>
                                )}

                                {/* Order notification popup for Kitchen stage */}
                                {isCurrent && index === 2 && (
                                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center animate-bounce shadow-lg">
                                        <span className="text-white text-xs font-bold">!</span>
                                    </div>
                                )}
                            </div>

                            {/* Stage Label Card */}
                            {isCurrent && (
                                <div
                                    className={`absolute whitespace-nowrap transition-all duration-300 ${index % 2 === 0 ? 'left-full ml-4' : 'right-full mr-4'
                                        }`}
                                    style={{ top: '50%', transform: 'translateY(-50%)' }}
                                >
                                    <div
                                        className="bg-slate-900/95 backdrop-blur-md text-white rounded-xl shadow-2xl px-4 py-3 border border-white/10"
                                        style={{ boxShadow: `0 10px 40px ${stage.color}50` }}
                                    >
                                        <div className="text-sm font-bold text-white">{stage.title}</div>
                                        <div className="text-xs text-white/60 mt-0.5">{stage.description}</div>

                                        {/* Receipt animation for Bill stage */}
                                        {index === 4 && (
                                            <div className="mt-2 w-20 h-10 bg-white/10 rounded overflow-hidden">
                                                <div
                                                    className="w-full bg-gradient-to-b from-white/30 to-transparent"
                                                    style={{
                                                        height: `${Math.min((scrollProgress - 65) * 3, 100)}%`,
                                                        transition: 'height 0.3s ease-out'
                                                    }}
                                                >
                                                    <div className="text-[8px] text-white/60 p-1">
                                                        🧾 Bill #101
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Profit counter for Analytics stage */}
                                        {index === 5 && (
                                            <div className="mt-2 flex items-center gap-2">
                                                <span className="text-base">💰</span>
                                                <span className="text-lg font-bold text-emerald-400">
                                                    ₹{profitCounter.toLocaleString()}
                                                </span>
                                                <span className="text-xs text-emerald-400 animate-pulse">▲</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Arrow pointer */}
                                    <div
                                        className={`absolute top-1/2 -translate-y-1/2 w-0 h-0 border-y-[8px] border-y-transparent ${index % 2 === 0
                                                ? '-left-2 border-r-[8px] border-r-slate-900/95'
                                                : '-right-2 border-l-[8px] border-l-slate-900/95'
                                            }`}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Progress indicator */}
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
                    <div className="text-sm font-bold text-slate-600">
                        {Math.round(scrollProgress)}%
                    </div>
                    <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-emerald-500 via-violet-500 to-cyan-500 rounded-full transition-all duration-300"
                            style={{ width: `${scrollProgress}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
