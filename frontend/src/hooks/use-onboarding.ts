 import { useEffect } from "react";
 import { driver } from "driver.js";
 import "driver.js/dist/driver.css";
 
 const ONBOARDING_KEY = "arabian-nights:hasSeenTour";
 
 export function useOnboarding() {
   useEffect(() => {
     // Check if user has already seen the tour
     const hasSeenTour = localStorage.getItem(ONBOARDING_KEY);
     
     if (hasSeenTour) {
       return;
     }
 
     // Wait for DOM to be ready
     const timer = setTimeout(() => {
       const driverObj = driver({
         showProgress: true,
         steps: [
           {
             element: '[data-tour="earnings"]',
             popover: {
               title: "Today's Earnings",
               description: "View your daily earnings and track revenue in real-time. The date shows your current business day.",
               side: "bottom",
               align: "center",
             },
           },
           {
             element: '[data-tour="orders-table"]',
             popover: {
               title: "Active Orders Management",
               description: "Manage live orders through the workflow: New → Cooking → Ready → Completed. Click the action button on each order card to move it to the next stage.",
               side: "top",
               align: "center",
             },
           },
           {
             element: '[data-tour="add-order"]',
             popover: {
               title: "Manual Order Creation",
               description: "Manually create orders for walk-in customers. Perfect for in-person orders that don't come through online platforms.",
               side: "left",
               align: "center",
             },
           },
           {
             element: '[data-tour="stock-toggle"]',
             popover: {
               title: "Quick Stock Management",
               description: "Toggle item availability instantly when items run out. This prevents customers from ordering unavailable items.",
               side: "top",
               align: "center",
             },
           },
           {
             element: '[data-tour="analytics"]',
             popover: {
               title: "Business Analytics",
               description: "Track your top-selling items and peak rush hours. Use these insights to optimize inventory and staffing.",
               side: "top",
               align: "center",
             },
           },
         ],
         onDestroyStarted: () => {
           // Mark tour as completed
           localStorage.setItem(ONBOARDING_KEY, "true");
           driverObj.destroy();
         },
       });
 
       driverObj.drive();
     }, 1000); // Wait 1 second for page to fully render
 
     return () => clearTimeout(timer);
   }, []);
 }