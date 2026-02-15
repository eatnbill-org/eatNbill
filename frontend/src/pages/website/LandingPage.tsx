import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
    Package,
    TrendingUp,
    Users,
    Check,
    Clock,
    ShieldCheck,
    ChefHat,
    ArrowRight,
    QrCode,
    Smartphone,
    Receipt,
    Globe,
    MessageCircle,
    LineChart,
    Flame,
    Settings,
    Building2,
    Phone,
    Mail,
    ChevronDown,
    Play
} from "lucide-react";
import { useState, useEffect } from "react";

import ScrollBar from "./ScrollBar";

// FAQ Data
const faqData = [
    {
        question: "Ye software kaise kaam karta hai?",
        answer: "Yeh software aapke restaurant ke saare orders ko ek jagah manage karta hai. QR code se customer order kar sakta hai, waiter apne phone se order le sakta hai, aur Zomato/Swiggy ke orders bhi same dashboard pe dikhte hain."
    },
    {
        question: "Kya mujhe koi technical knowledge chahiye?",
        answer: "Bilkul nahi! Humari team aapke restaurant visit karegi aur pura setup kar degi. Menu photos, prices, categories - sab hum setup karenge. Aapko sirf orders manage karne hain."
    },
    {
        question: "Trial ke baad kab payment karna hoga?",
        answer: "20 din free trial milta hai. Trial khatam hone ke baad ₹849/month payment karna hoga. Koi hidden charges nahi hain."
    },
    {
        question: "Kya chhote restaurant ke liye bhi kaam karega?",
        answer: "Haan! Chhote food stall se lekar bade multi-floor restaurant tak - sab ke liye kaam karta hai. Features same hain, sirf aap apni zaroorat ke hisaab se use karo."
    },
    {
        question: "WhatsApp campaign kaise kaam karta hai?",
        answer: "Aap apne customers ko promotional messages, offers, aur updates WhatsApp pe bhej sakte ho. Customer database automatically banta hai orders se."
    }
];

// FAQ Item Component
function FAQItem({ question, answer }: { question: string; answer: string }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
            >
                <span className="font-semibold text-slate-800 pr-4">{question}</span>
                <ChevronDown
                    className={`h-5 w-5 text-slate-500 flex-shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""
                        }`}
                />
            </button>
            {isOpen && (
                <div className="px-6 pb-5 text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
                    {answer}
                </div>
            )}
        </div>
    );
}

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white overflow-x-hidden">
            {/* Scroll Bar Journey */}
            <ScrollBar />

            {/* Header */}
            <header className="sticky top-0 z-50 backdrop-blur-md bg-white/95 border-b border-slate-200 shadow-sm">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-200/50">
                            <ChefHat className="h-6 w-6 text-white" />
                        </div>
                        <div className="text-2xl font-bold">
                            <span className="text-slate-800">eatNbill</span>
                        </div>
                    </div>
                    <nav className="hidden md:flex items-center gap-8">
                        <a href="#features" className="text-slate-600 hover:text-emerald-600 transition-colors font-medium">Features</a>
                        <a href="#how-it-works" className="text-slate-600 hover:text-emerald-600 transition-colors font-medium">How It Works</a>
                        <a href="#pricing" className="text-slate-600 hover:text-emerald-600 transition-colors font-medium">Pricing</a>
                        <a href="#faq" className="text-slate-600 hover:text-emerald-600 transition-colors font-medium">FAQ</a>
                    </nav>
                    <div className="flex items-center gap-3">
                        <Link to="/auth/login">
                            <Button variant="ghost" className="hidden sm:inline-flex text-slate-700 hover:text-emerald-600 hover:bg-emerald-50 font-medium">
                                Sign In
                            </Button>
                        </Link>
                        <Link to="/auth/register">
                            <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-200/50 border-0 font-medium">
                                Start Free Trial
                            </Button>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative py-20 md:py-28 px-4 overflow-hidden bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/40">
                {/* Background decorations */}
                <div className="absolute inset-0 -z-10">
                    <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-200/30 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-20 right-10 w-96 h-96 bg-teal-200/20 rounded-full blur-3xl"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-100/20 rounded-full blur-3xl"></div>
                </div>

                <div className="container mx-auto max-w-6xl">
                    <div className="text-center max-w-4xl mx-auto">
                        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
                            <span className="text-slate-800">Manage Your Restaurant</span>{" "}
                            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Smartly</span>
                        </h1>

                        <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
                            Complete restaurant management platform with QR ordering, Zomato & Swiggy integration,
                            WhatsApp campaigns, and powerful analytics. From small food stalls to large restaurants.
                        </p>

                        <div className="flex justify-center mb-12">
                            <Link to="/auth/register">
                                <Button size="lg" className="text-lg px-10 py-7 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-xl shadow-emerald-300/40 border-0 group font-semibold">
                                    Try Free for 20 Days
                                    <ArrowRight className="h-5 w-5 ml-2 transition-transform group-hover:translate-x-1" />
                                </Button>
                            </Link>
                        </div>

                        {/* Trust indicators */}
                        <div className="flex flex-wrap justify-center gap-6 md:gap-10 text-slate-500">
                            <div className="flex items-center gap-2">
                                <Check className="h-5 w-5 text-emerald-500" />
                                <span className="text-sm font-medium">No credit card required</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock className="h-5 w-5 text-emerald-500" />
                                <span className="text-sm font-medium">We setup your menu</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                                <span className="text-sm font-medium">Cancel anytime</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-20 md:py-28 px-4 bg-gradient-to-b from-white to-slate-50">
                <div className="container mx-auto max-w-6xl">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 mb-6">
                            <span className="text-sm font-semibold">Powerful Features</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-slate-800">
                            Everything Your Restaurant Needs
                        </h2>
                        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                            From order management to analytics - all tools to run your restaurant efficiently
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Feature Card 1 - QR Ordering */}
                        <div className="group p-6 bg-white rounded-2xl border border-slate-200 hover:shadow-xl hover:shadow-emerald-100/40 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200">
                            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mb-5 shadow-lg shadow-emerald-200/50">
                                <QrCode className="h-7 w-7 text-white" />
                            </div>
                            <h3 className="font-semibold text-lg mb-3 text-slate-800">QR Scan Ordering</h3>
                            <p className="text-slate-600 leading-relaxed">
                                Customers scan QR code and order directly from their phone. No app download needed.
                            </p>
                        </div>

                        {/* Feature Card 2 - Waiter View */}
                        <div className="group p-6 bg-white rounded-2xl border border-slate-200 hover:shadow-xl hover:shadow-teal-100/40 transition-all duration-300 hover:-translate-y-1 hover:border-teal-200">
                            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center mb-5 shadow-lg shadow-teal-200/50">
                                <Smartphone className="h-7 w-7 text-white" />
                            </div>
                            <h3 className="font-semibold text-lg mb-3 text-slate-800">Waiter View</h3>
                            <p className="text-slate-600 leading-relaxed">
                                Dedicated waiter interface to take orders, manage tables and serve customers faster.
                            </p>
                        </div>

                        {/* Feature Card 3 - Bill Generate */}
                        <div className="group p-6 bg-white rounded-2xl border border-slate-200 hover:shadow-xl hover:shadow-cyan-100/40 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-200">
                            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center mb-5 shadow-lg shadow-cyan-200/50">
                                <Receipt className="h-7 w-7 text-white" />
                            </div>
                            <h3 className="font-semibold text-lg mb-3 text-slate-800">Bill Generation</h3>
                            <p className="text-slate-600 leading-relaxed">
                                Generate professional bills instantly. Print or share digitally with customers.
                            </p>
                        </div>

                        {/* Feature Card 4 - Website Orders */}
                        <div className="group p-6 bg-white rounded-2xl border border-slate-200 hover:shadow-xl hover:shadow-green-100/40 transition-all duration-300 hover:-translate-y-1 hover:border-green-200">
                            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center mb-5 shadow-lg shadow-green-200/50">
                                <Globe className="h-7 w-7 text-white" />
                            </div>
                            <h3 className="font-semibold text-lg mb-3 text-slate-800">Direct Website Orders</h3>
                            <p className="text-slate-600 leading-relaxed">
                                Customers can order directly from your website. All orders in one dashboard.
                            </p>
                        </div>

                        {/* Feature Card 5 - Zomato/Swiggy */}
                        <div className="group p-6 bg-white rounded-2xl border border-slate-200 hover:shadow-xl hover:shadow-orange-100/40 transition-all duration-300 hover:-translate-y-1 hover:border-orange-200">
                            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center mb-5 shadow-lg shadow-orange-200/50">
                                <Package className="h-7 w-7 text-white" />
                            </div>
                            <h3 className="font-semibold text-lg mb-3 text-slate-800">Zomato & Swiggy Integration</h3>
                            <p className="text-slate-600 leading-relaxed">
                                All orders from Zomato, Swiggy and direct channels show in single dashboard.
                            </p>
                        </div>

                        {/* Feature Card 6 - WhatsApp Campaign */}
                        <div className="group p-6 bg-white rounded-2xl border border-slate-200 hover:shadow-xl hover:shadow-lime-100/40 transition-all duration-300 hover:-translate-y-1 hover:border-lime-200">
                            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-lime-500 to-green-600 flex items-center justify-center mb-5 shadow-lg shadow-lime-200/50">
                                <MessageCircle className="h-7 w-7 text-white" />
                            </div>
                            <h3 className="font-semibold text-lg mb-3 text-slate-800">WhatsApp Campaigns</h3>
                            <p className="text-slate-600 leading-relaxed">
                                Send promotional messages, offers and updates to your customers via WhatsApp.
                            </p>
                        </div>

                        {/* Feature Card 7 - Analytics */}
                        <div className="group p-6 bg-white rounded-2xl border border-slate-200 hover:shadow-xl hover:shadow-blue-100/40 transition-all duration-300 hover:-translate-y-1 hover:border-blue-200">
                            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center mb-5 shadow-lg shadow-blue-200/50">
                                <LineChart className="h-7 w-7 text-white" />
                            </div>
                            <h3 className="font-semibold text-lg mb-3 text-slate-800">Complete Analytics</h3>
                            <p className="text-slate-600 leading-relaxed">
                                Daily, weekly, monthly, yearly earnings. Track profit and see day-wise reports.
                            </p>
                        </div>

                        {/* Feature Card 8 - Top Products */}
                        <div className="group p-6 bg-white rounded-2xl border border-slate-200 hover:shadow-xl hover:shadow-violet-100/40 transition-all duration-300 hover:-translate-y-1 hover:border-violet-200">
                            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center mb-5 shadow-lg shadow-violet-200/50">
                                <Flame className="h-7 w-7 text-white" />
                            </div>
                            <h3 className="font-semibold text-lg mb-3 text-slate-800">Top Selling & Rush Hours</h3>
                            <p className="text-slate-600 leading-relaxed">
                                See your best-selling items and peak business hours to optimize operations.
                            </p>
                        </div>

                        {/* Feature Card 9 - Real-time */}
                        <div className="group p-6 bg-white rounded-2xl border border-slate-200 hover:shadow-xl hover:shadow-indigo-100/40 transition-all duration-300 hover:-translate-y-1 hover:border-indigo-200">
                            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center mb-5 shadow-lg shadow-indigo-200/50">
                                <TrendingUp className="h-7 w-7 text-white" />
                            </div>
                            <h3 className="font-semibold text-lg mb-3 text-slate-800">Live Order Tracking</h3>
                            <p className="text-slate-600 leading-relaxed">
                                Track every order from new to cooking to ready. Real-time status updates.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* We Handle Everything Section */}
            <section className="py-20 md:py-28 px-4 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800">
                <div className="container mx-auto max-w-6xl">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 text-emerald-400 mb-6">
                            <span className="text-sm font-semibold">Complete Setup</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-white">
                            Software will Handle Everything For You
                        </h2>
                        <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                            No technical knowledge needed. Our team will visit your restaurant and set everything up.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="text-center p-8 bg-slate-800/50 rounded-2xl border border-slate-700 hover:border-emerald-500/30 transition-colors">
                            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white mb-6 shadow-lg shadow-emerald-500/30">
                                <Settings className="h-8 w-8" />
                            </div>
                            <h3 className="text-xl font-semibold mb-3 text-white">Menu Setup</h3>
                            <p className="text-slate-400">
                                We will setup your complete menu with photos, prices & categories
                            </p>
                        </div>

                        <div className="text-center p-8 bg-slate-800/50 rounded-2xl border border-slate-700 hover:border-teal-500/30 transition-colors">
                            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-teal-600 text-white mb-6 shadow-lg shadow-teal-500/30">
                                <Building2 className="h-8 w-8" />
                            </div>
                            <h3 className="text-xl font-semibold mb-3 text-white">Restaurant Visit</h3>
                            <p className="text-slate-400">
                                Our team visits your restaurant to understand your workflow and needs
                            </p>
                        </div>

                        <div className="text-center p-8 bg-slate-800/50 rounded-2xl border border-slate-700 hover:border-cyan-500/30 transition-colors">
                            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 text-white mb-6 shadow-lg shadow-cyan-500/30">
                                <Users className="h-8 w-8" />
                            </div>
                            <h3 className="text-xl font-semibold mb-3 text-white">Any Size Restaurant</h3>
                            <p className="text-slate-400">
                                From small food stalls to large multi-floor restaurants - we manage all
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section id="how-it-works" className="py-20 md:py-28 px-4 bg-gradient-to-br from-teal-50 via-emerald-50/50 to-cyan-50">
                <div className="container mx-auto max-w-6xl">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-slate-800">
                            Get Started in 3 Simple Steps
                        </h2>
                        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                            Start managing your restaurant efficiently in minutes
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="relative text-center">
                            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-2xl font-bold mb-6 shadow-xl shadow-emerald-300/40">
                                1
                            </div>
                            <h3 className="text-xl font-semibold mb-3 text-slate-800">Create Account</h3>
                            <p className="text-slate-600">
                                Sign up for free and tell us about your restaurant
                            </p>
                            <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-emerald-400 to-transparent"></div>
                        </div>

                        <div className="relative text-center">
                            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-2xl font-bold mb-6 shadow-xl shadow-emerald-300/40">
                                2
                            </div>
                            <h3 className="text-xl font-semibold mb-3 text-slate-800">We Setup Your Menu</h3>
                            <p className="text-slate-600">
                                Our team visits and sets up your complete menu with photos
                            </p>
                            <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-emerald-400 to-transparent"></div>
                        </div>

                        <div className="text-center">
                            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-2xl font-bold mb-6 shadow-xl shadow-emerald-300/40">
                                3
                            </div>
                            <h3 className="text-xl font-semibold mb-3 text-slate-800">Start Receiving Orders</h3>
                            <p className="text-slate-600">
                                Go live and manage all orders from single dashboard
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- PRICING --- */}
            <section id="pricing" className="py-24 bg-slate-900 text-white relative overflow-hidden">
                {/* Glow Effects */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full">
                    <div className="absolute top-[-20%] left-[20%] w-[500px] h-[500px] bg-emerald-500/20 rounded-full blur-[120px]" />
                </div>

                <div className="container mx-auto px-4 relative z-10">
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
                        <p className="text-slate-400 text-lg">One plan includes everything. No hidden charges.</p>
                    </div>

                    <div className="max-w-md mx-auto bg-slate-800/50 backdrop-blur-sm rounded-3xl border border-slate-700 p-8 sm:p-10 relative hover:border-emerald-500/50 transition-colors duration-300">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-emerald-600 text-white text-sm font-bold px-4 py-1 rounded-full shadow-lg">
                            MOST POPULAR
                        </div>

                        <div className="text-center mb-8">
                            <h3 className="text-xl font-medium text-slate-300 mb-2">Pro License</h3>
                            <div className="flex items-end justify-center gap-1">
                                <span className="text-5xl font-bold text-white">₹849</span>
                                <span className="text-slate-400 mb-1">/mo</span>
                            </div>
                            <p className="text-emerald-400 text-sm mt-3 font-medium">20 Days Free Trial Included</p>
                        </div>

                        <ul className="space-y-4 mb-8">
                            {[
                                "Unlimited Orders", "QR Code Generation", "Zomato & Swiggy Sync",
                                "Advanced Analytics", "Inventory Management", "24/7 Premium Support"
                            ].map(feat => (
                                <li key={feat} className="flex items-center gap-3 text-slate-300">
                                    <div className="h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                                        <Check className="h-3 w-3 text-emerald-400" />
                                    </div>
                                    {feat}
                                </li>
                            ))}
                        </ul>

                        <Link to="/auth/register">
                            <Button size="lg" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white border-0 h-12 rounded-xl text-base font-semibold shadow-lg shadow-emerald-900/20">
                                Start Free Trial
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section id="faq" className="py-20 md:py-28 px-4 bg-gradient-to-br from-violet-50 via-purple-50/50 to-indigo-50">
                <div className="container mx-auto max-w-3xl">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-100 text-violet-700 mb-6">
                            <span className="text-sm font-semibold">FAQ</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-slate-800">
                            Frequently Asked Questions
                        </h2>
                        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                            Aapke common questions ke jawab
                        </p>
                    </div>

                    <div className="space-y-4">
                        {faqData.map((faq, index) => (
                            <FAQItem key={index} question={faq.question} answer={faq.answer} />
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 md:py-28 px-4 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700">
                <div className="container mx-auto max-w-4xl text-center">
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-white">
                        Ready to Transform Your Restaurant?
                    </h2>
                    <p className="text-lg md:text-xl text-emerald-100 mb-10 max-w-2xl mx-auto">
                        Start your 20 days free trial today. We'll setup everything for you.
                    </p>
                    <Link to="/auth/register">
                        <Button size="lg" className="text-lg px-10 py-7 bg-white text-emerald-700 hover:bg-emerald-50 shadow-2xl border-0 font-semibold">
                            Start Your Free Trial
                            <ArrowRight className="h-5 w-5 ml-2" />
                        </Button>
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-slate-900 py-16 px-4">
                <div className="container mx-auto max-w-6xl">
                    <div className="grid md:grid-cols-3 gap-12 mb-12">
                        <div>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                                    <ChefHat className="h-6 w-6 text-white" />
                                </div>
                                <div className="text-xl font-bold text-white">eatNbill</div>
                            </div>
                            <p className="text-slate-400 leading-relaxed">
                                Complete restaurant management platform. From small food stalls to large restaurants - we manage all.
                            </p>
                        </div>

                        <div>
                            <h4 className="font-semibold text-white mb-6 text-lg">Quick Links</h4>
                            <ul className="space-y-3">
                                <li>
                                    <a href="#" className="flex items-center gap-2 text-slate-400 hover:text-emerald-400 transition-colors">
                                        <Play className="h-4 w-4" />
                                        <span>Full Video</span>
                                    </a>
                                </li>
                                <li>
                                    <Link to="/privacy-policy" className="text-slate-400 hover:text-emerald-400 transition-colors">
                                        Privacy Policy
                                    </Link>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-semibold text-white mb-6 text-lg">Contact Us</h4>
                            <ul className="space-y-4">
                                <li>
                                    <a href="tel:+917990471946" className="flex items-center gap-3 text-slate-400 hover:text-emerald-400 transition-colors">
                                        <div className="h-10 w-10 rounded-lg bg-slate-800 flex items-center justify-center">
                                            <Phone className="h-5 w-5 text-emerald-500" />
                                        </div>
                                        <span>+91 7990471946</span>
                                    </a>
                                </li>
                                <li>
                                    <a href="mailto:contact@eatnbill.com" className="flex items-center gap-3 text-slate-400 hover:text-emerald-400 transition-colors">
                                        <div className="h-10 w-10 rounded-lg bg-slate-800 flex items-center justify-center">
                                            <Mail className="h-5 w-5 text-emerald-500" />
                                        </div>
                                        <span>contact@eatnbill.com</span>
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="text-sm text-slate-500">
                            © 2026 eatNbill. All rights reserved.
                        </div>
                        <div className="flex items-center gap-6">
                            <a href="#" className="text-slate-500 hover:text-emerald-400 transition-colors text-sm">
                                Terms
                            </a>
                            <Link to="/privacy-policy" className="text-slate-500 hover:text-emerald-400 transition-colors text-sm">
                                Privacy
                            </Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
