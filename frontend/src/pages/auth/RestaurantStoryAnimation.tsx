import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Smartphone, Monitor, ChefHat, User, Utensils, QrCode, Wifi, ArrowRight, IndianRupee, Receipt } from "lucide-react";

export default function RestaurantStoryAnimation() {
  // State for Admin Dashboard Numbers
  const [revenue, setRevenue] = useState(0);
  const [orders, setOrders] = useState(0);

  // Function to simulate revenue increase when a cycle completes
  useEffect(() => {
    const interval = setInterval(() => {
      // Increment revenue by random amount (e.g. 500-1500)
      const amount = Math.floor(Math.random() * (1500 - 500 + 1) + 500);
      setRevenue(prev => (prev + amount >= 5000 ? 0 : prev + amount));
      setOrders(prev => (prev + amount >= 5000 ? 0 : prev + 1));
    }, 4500); // Sync this roughly with animation cycle end

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-full bg-white  relative overflow-hidden flex items-center justify-center border border-slate-200 shadow-lg">

      {/* --- BACKGROUND DECORATION (Floor) --- */}
      <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 opacity-5">
        {[...Array(36)].map((_, i) => (
          <div key={i} className="border border-slate-400" />
        ))}
      </div>

      <div className="relative w-full max-w-lg h-48">

        {/* =========================================
            SCENE 1: CUSTOMER TABLE (Bottom Left)
           ========================================= */}
        <div className="absolute bottom-1 left-4 flex flex-col items-center z-10">
          <div className="relative">
            {/* Customer */}
            <User className="w-7 h-7 text-slate-400 mb-0.5" />
            {/* Table */}
            <div className="w-16 h-9 bg-white border-2 border-slate-200 rounded-lg flex items-center justify-center shadow-sm relative overflow-hidden">
              <QrCode className="w-4 h-4 text-slate-800" />

              {/* Scan Effect Animation */}
              <motion.div
                className="absolute inset-0 bg-emerald-500/20"
                initial={{ scaleY: 0, originY: 0 }}
                animate={{ scaleY: [0, 1, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
              />
            </div>
          </div>
          <span className="text-[9px] font-bold text-slate-500 mt-1">Customer</span>
        </div>

        {/* =========================================
            SCENE 2: ADMIN POS (Top Center) - LIVE UPDATING
           ========================================= */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center z-10">
          <div className="relative bg-white p-1.5 rounded-xl border border-slate-300 shadow-md min-w-[120px]">
            <div className="flex justify-center mb-0.5">
              <Monitor className="w-7 h-7 text-slate-700" />
            </div>

            {/* Live Dashboard Screen */}
            <div className="bg-slate-900 rounded p-1 text-center w-full">
              <p className="text-[6px] text-slate-400 uppercase tracking-wider mb-0.5">Total Revenue</p>
              <div className="text-emerald-400 font-bold text-[10px] flex items-center justify-center gap-0.5">
                <IndianRupee className="w-2 h-2" />
                {/* Animated Number Counter */}
                <CountUp end={revenue} />
              </div>
              <div className="w-full h-[1px] bg-slate-700 my-0.5"></div>
              <p className="text-[6px] text-slate-400">Orders: <span className="text-white font-bold">{orders}</span></p>
            </div>

            {/* Screen Glow on Order Receive */}
            <motion.div
              className="absolute -inset-1 bg-emerald-400/30 rounded-xl opacity-0 z-[-1]"
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 0.5, delay: 1.5, repeat: Infinity, repeatDelay: 4 }}
            />
          </div>
          <span className="text-[9px] font-bold text-slate-500 mt-1">Admin POS</span>
        </div>

        {/* =========================================
            SCENE 3: KITCHEN (Bottom Right)
           ========================================= */}
        <div className="absolute bottom-1 right-4 flex flex-col items-center z-10">
          <div className="relative p-2 bg-white border-2 border-slate-200 rounded-full shadow-sm">
            <ChefHat className="w-6 h-6 text-orange-500" />
          </div>
          <span className="text-[9px] font-bold text-slate-500 mt-1">Kitchen</span>
        </div>

        {/* =========================================
            ANIMATED ELEMENTS (The Story)
           ========================================= */}

        {/* 1. Mobile Scan Signal (Table -> Cloud) */}
        <motion.div
          className="absolute bottom-12 left-10"
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: [0, 1, 0], y: -35 }}
          transition={{ duration: 1, repeat: Infinity, repeatDelay: 3.5 }}
        >
          <Wifi className="w-4 h-4 text-emerald-500" />
        </motion.div>

        {/* 2. Order Packet (Table -> Admin) */}
        <motion.div
          className="absolute z-20 bg-white p-1 rounded-full shadow-md border border-emerald-200"
          initial={{ top: "70%", left: "10%", opacity: 0, scale: 0 }}
          animate={{
            top: ["70%", "25%"],
            left: ["10%", "50%"],
            opacity: [0, 1, 1, 0],
            scale: [0, 1, 1, 0]
          }}
          transition={{ duration: 1.5, delay: 0.5, repeat: Infinity, repeatDelay: 3 }}
        >
          <Utensils className="w-3 h-3 text-emerald-600" />
        </motion.div>

        {/* 3. KOT Ticket (Admin -> Kitchen) */}
        <motion.div
          className="absolute z-20 bg-yellow-100 p-1 rounded shadow-md border border-yellow-200"
          initial={{ top: "25%", left: "50%", opacity: 0 }}
          animate={{
            top: ["25%", "70%"],
            left: ["50%", "90%"],
            opacity: [0, 1, 0]
          }}
          transition={{ duration: 1.5, delay: 2, repeat: Infinity, repeatDelay: 3 }}
        >
          <span className="text-[6px] font-mono font-bold text-yellow-800">KOT</span>
        </motion.div>

        {/* 4. Bill Generation (Admin -> Table) */}
        <motion.div
          className="absolute z-20 bg-white p-0.5 rounded shadow-md border border-slate-200 flex items-center gap-0.5"
          initial={{ top: "25%", left: "50%", opacity: 0 }}
          animate={{
            top: ["25%", "60%"],
            left: ["50%", "15%"],
            opacity: [0, 1, 1, 0],
            scale: [0.5, 1, 1, 0]
          }}
          transition={{ duration: 1.5, delay: 3.8, repeat: Infinity, repeatDelay: 3 }}
        >
          <Receipt className="w-2 h-2 text-slate-600" />
          <span className="text-[5px] font-bold text-slate-800">BILL</span>
        </motion.div>

        {/* 5. Waiter Serving (Kitchen -> Table) */}
        <motion.div
          className="absolute z-20 flex items-center gap-0.5 bg-white px-1.5 py-0.5 rounded-full shadow-lg border border-slate-200"
          initial={{ top: "75%", left: "85%", opacity: 0 }}
          animate={{
            top: "75%",
            left: ["85%", "20%"],
            opacity: [0, 1, 1, 0]
          }}
          transition={{ duration: 2, delay: 3.5, repeat: Infinity, repeatDelay: 2.5 }}
        >
          <User className="w-3 h-3 text-slate-900" />
          <div className="w-1 h-1 bg-orange-500 rounded-full animate-pulse" />
        </motion.div>

        {/* Connecting Lines (SVG) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none -z-0">
          {/* Path: Table to Admin */}
          <motion.path
            d="M 60 180 Q 100 60 250 60"
            fill="none"
            stroke="#10b981"
            strokeWidth="2"
            strokeDasharray="5,5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, repeat: Infinity, repeatDelay: 3.5 }}
          />
          {/* Path: Admin to Kitchen */}
          <motion.path
            d="M 260 60 Q 400 60 450 180"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2"
            strokeDasharray="5,5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, delay: 2, repeat: Infinity, repeatDelay: 3.5 }}
          />
        </svg>

      </div>

      {/* Caption */}
      <div className="absolute bottom-1 left-0 right-0 text-center">
        <p className="text-[9px] text-slate-400 font-medium animate-pulse">Live Revenue Simulation</p>
      </div>
    </div>
  );
}

// --- UTILS: Count Up Animation Component ---
function CountUp({ end }: { end: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = count;
    const duration = 1000;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out quart
      const ease = 1 - Math.pow(1 - progress, 4);

      setCount(Math.floor(start + (end - start) * ease));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [end]);

  return <span>{count.toLocaleString()}</span>;
}