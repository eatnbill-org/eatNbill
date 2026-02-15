// import { Button } from "@/components/ui/button";
// import { Link } from "react-router-dom";
// import { BarChart3, Package, TrendingUp, Users } from "lucide-react";
// export default function LandingPage() {
//   return <div className="min-h-screen bg-background">
//        {/* Header */}
//        <header className="border-b">
//          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
//            <div className="flex items-center gap-2">
//              <div className="text-2xl font-bold text-brand">eatNbill</div>
//            </div>
//            <div className="flex items-center gap-4">
//              <Link to="/auth/login">
//                <Button variant="ghost">Sign In</Button>
//              </Link>
//              <Link to="/auth/register">
//                <Button variant="hero">Try Free for 14 Days</Button>
//              </Link>
//            </div>
//          </div>
//        </header>
 
//        {/* Hero Section */}
//        <section className="py-20 px-4">
//          <div className="container mx-auto max-w-5xl text-center">
//            <h1 className="text-5xl md:text-6xl font-bold mb-6 text-foreground">
//              Manage Your Restaurant{" "}
//              <span className="text-brand">Efficiently</span>
//            </h1>
//            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
//              Streamline orders, track inventory, and grow your business with eatNbill's
//              all-in-one restaurant management platform
//            </p>
//            <div className="flex gap-4 justify-center flex-wrap">
//              <Link to="/auth/register">
//                <Button size="lg" variant="hero" className="text-lg px-8">
//                  Try for 14 Days Free
//                </Button>
//              </Link>
//              <Link to="/shop">
//                <Button size="lg" variant="outline" className="text-lg px-8">
//                  View Demo Menu
//                </Button>
//              </Link>
//            </div>
//          </div>
//        </section>
 
//        {/* Features Section */}
//        <section className="py-16 px-4 bg-muted/30">
//          <div className="container mx-auto max-w-6xl">
//            <h2 className="text-3xl font-bold text-center mb-12">
//              Everything You Need to Run Your Restaurant
//            </h2>
//            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
//              <div className="flex flex-col items-center text-center p-6 bg-background rounded-lg border">
//                <div className="h-12 w-12 rounded-full bg-brand/10 flex items-center justify-center mb-4">
//                  <BarChart3 className="h-6 w-6 text-brand" />
//                </div>
//                <h3 className="font-semibold mb-2">Real-time Analytics</h3>
//                <p className="text-sm text-muted-foreground">
//                  Track sales, peak hours, and customer insights in real-time
//                </p>
//              </div>
 
//              <div className="flex flex-col items-center text-center p-6 bg-background rounded-lg border">
//                <div className="h-12 w-12 rounded-full bg-brand/10 flex items-center justify-center mb-4">
//                  <Package className="h-6 w-6 text-brand" />
//                </div>
//                <h3 className="font-semibold mb-2">Stock Management</h3>
//                <p className="text-sm text-muted-foreground">
//                  Keep track of inventory and toggle availability instantly
//                </p>
//              </div>
 
//              <div className="flex flex-col items-center text-center p-6 bg-background rounded-lg border">
//                <div className="h-12 w-12 rounded-full bg-brand/10 flex items-center justify-center mb-4">
//                  <TrendingUp className="h-6 w-6 text-brand" />
//                </div>
//                <h3 className="font-semibold mb-2">Live Order Tracking</h3>
//                <p className="text-sm text-muted-foreground">
//                  Manage orders from new to cooking to ready seamlessly
//                </p>
//              </div>
 
//              <div className="flex flex-col items-center text-center p-6 bg-background rounded-lg border">
//                <div className="h-12 w-12 rounded-full bg-brand/10 flex items-center justify-center mb-4">
//                  <Users className="h-6 w-6 text-brand" />
//                </div>
//                <h3 className="font-semibold mb-2">Customer Management</h3>
//                <p className="text-sm text-muted-foreground">
//                  Track customer orders, preferences, and loyalty
//                </p>
//              </div>
//            </div>
//          </div>
//        </section>
 
//        {/* CTA Section */}
//        <section className="py-20 px-4">
//          <div className="container mx-auto max-w-4xl text-center">
//            <h2 className="text-4xl font-bold mb-6">
//              Ready to Transform Your Restaurant?
//            </h2>
//            <p className="text-xl text-muted-foreground mb-8">
//              Join hundreds of restaurants already using eatNbill
//            </p>
//            <Link to="/auth/register">
//              <Button size="lg" variant="hero" className="text-lg px-8">
//                Start Your Free Trial
//              </Button>
//            </Link>
//          </div>
//        </section>
 
//        {/* Footer */}
//        <footer className="border-t py-8 px-4 mt-auto">
//          <div className="container mx-auto text-center text-sm text-muted-foreground">
//            © 2026 eatNbill. All rights reserved.
//          </div>
//        </footer>
//      </div>;
// }