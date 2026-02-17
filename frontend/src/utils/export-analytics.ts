import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';
import { format } from 'date-fns';
import { AdvancedAnalyticsResponse } from '@/api/analytics';

// Extend jsPDF type to include autoTable plugin properties
interface jsPDFWithAutoTable extends jsPDF {
    lastAutoTable: {
        finalY: number;
    };
}

/**
 * Format currency for display
 */
const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
};

/**
 * Export analytics data to CSV
 */
export const exportToCSV = (data: AdvancedAnalyticsResponse, view: string, date: Date) => {
    const { metrics, trends, distribution, products, debts, paymentMethods } = data;

    // Prepare summary data
    const summary = [
        ['EatNbill Analytics Report', ''],
        ['Generated On', format(new Date(), 'PPP p')],
        ['Report Period', `${view.toUpperCase()} - ${format(date, 'PPP')}`],
        ['', ''],
        ['KEY METRICS', ''],
        ['Total Revenue', formatCurrency(metrics.totalRevenue)],
        ['Total Orders', metrics.totalOrders.toString()],
        ['Total Cost', formatCurrency(metrics.totalCost)],
        ['Total Profit', formatCurrency(metrics.totalProfit)],
        ['Profit Margin', `${((metrics.totalProfit / metrics.totalRevenue) * 100).toFixed(2)}%`],
        ['', '']
    ];

    // Revenue Trends
    const trendsData = [
        ['', ''],
        ['REVENUE TRENDS', ''],
        ['Period', 'Revenue', 'Orders'],
        ...trends.map(t => [t.period, t.revenue.toString(), t.orders.toString()])
    ];

    // Category Distribution
    const categoryData = [
        ['', ''],
        ['CATEGORY DISTRIBUTION', ''],
        ['Category', 'Revenue'],
        ...distribution.map(c => [c.name, formatCurrency(c.value)])
    ];

    // Top Products
    const productData = [
        ['', ''],
        ['TOP PRODUCTS', ''],
        ['Product', 'Quantity Sold', 'Revenue'],
        ...products.map(p => [p.name, p.quantity.toString(), formatCurrency(p.revenue)])
    ];

    // Payment Methods
    const paymentData = [
        ['', ''],
        ['PAYMENT METHODS', ''],
        ['Method', 'Count', 'Amount'],
        ...paymentMethods.map(pm => [pm.method, pm.count.toString(), formatCurrency(pm.amount)])
    ];

    // Outstanding Debts
    const debtData = [
        ['', ''],
        ['OUTSTANDING DEBTS', ''],
        ['Customer', 'Phone', 'Amount'],
        ...debts.map(d => [d.customer, d.phone, formatCurrency(d.amount)])
    ];

    // Combine all sections
    const csvData = [
        ...summary,
        ...trendsData,
        ...categoryData,
        ...productData,
        ...paymentData,
        ...debtData
    ];

    // Convert to CSV
    const csv = Papa.unparse(csvData, {
        quotes: false,
        delimiter: ',',
        newline: '\n'
    });

    // Download file
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const filename = `analytics_${view}_${format(date, 'yyyy-MM-dd')}.csv`;

    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();

    URL.revokeObjectURL(link.href);
};

/**
 * Export analytics data to PDF
 */
export const exportToPDF = (data: AdvancedAnalyticsResponse, view: string, date: Date) => {
    const { metrics, trends, distribution, products, debts, paymentMethods } = data;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPosition = 20;

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('EatNbill Analytics Report', pageWidth / 2, yPosition, { align: 'center' });

    yPosition += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on ${format(new Date(), 'PPP p')}`, pageWidth / 2, yPosition, { align: 'center' });

    yPosition += 5;
    doc.text(`Period: ${view.toUpperCase()} - ${format(date, 'PPP')}`, pageWidth / 2, yPosition, { align: 'center' });

    yPosition += 15;

    // Key Metrics Section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Key Metrics', 14, yPosition);
    yPosition += 7;

    autoTable(doc, {
        startY: yPosition,
        head: [['Metric', 'Value']],
        body: [
            ['Total Revenue', formatCurrency(metrics.totalRevenue)],
            ['Total Orders', metrics.totalOrders.toString()],
            ['Total Cost', formatCurrency(metrics.totalCost)],
            ['Total Profit', formatCurrency(metrics.totalProfit)],
            ['Profit Margin', `${((metrics.totalProfit / metrics.totalRevenue) * 100).toFixed(2)}%`]
        ],
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229], fontSize: 10, fontStyle: 'bold' },
        styles: { fontSize: 9 }
    });

    yPosition = (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 10;

    // Payment Methods
    if (paymentMethods.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Payment Methods', 14, yPosition);
        yPosition += 7;

        autoTable(doc, {
            startY: yPosition,
            head: [['Method', 'Count', 'Amount']],
            body: paymentMethods.map(pm => [
                pm.method,
                pm.count.toString(),
                formatCurrency(pm.amount)
            ]),
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229], fontSize: 10, fontStyle: 'bold' },
            styles: { fontSize: 9 }
        });

        yPosition = (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 10;
    }

    // Category Distribution
    if (distribution.length > 0 && yPosition < 250) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Category Distribution', 14, yPosition);
        yPosition += 7;

        autoTable(doc, {
            startY: yPosition,
            head: [['Category', 'Revenue']],
            body: distribution.map(c => [c.name, formatCurrency(c.value)]),
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229], fontSize: 10, fontStyle: 'bold' },
            styles: { fontSize: 9 }
        });

        yPosition = (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 10;
    }

    // Add new page for products if needed
    if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
    }

    // Top Products
    if (products.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Top Products', 14, yPosition);
        yPosition += 7;

        autoTable(doc, {
            startY: yPosition,
            head: [['Product', 'Quantity', 'Revenue']],
            body: products.slice(0, 10).map(p => [
                p.name,
                p.quantity.toString(),
                formatCurrency(p.revenue)
            ]),
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229], fontSize: 10, fontStyle: 'bold' },
            styles: { fontSize: 9 }
        });

        yPosition = (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 10;
    }

    // Outstanding Debts
    if (debts.length > 0 && yPosition < 250) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Outstanding Debts', 14, yPosition);
        yPosition += 7;

        autoTable(doc, {
            startY: yPosition,
            head: [['Customer', 'Phone', 'Amount']],
            body: debts.map(d => [d.customer, d.phone, formatCurrency(d.amount)]),
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229], fontSize: 10, fontStyle: 'bold' },
            styles: { fontSize: 9 }
        });
    }

    // Save PDF
    const filename = `analytics_${view}_${format(date, 'yyyy-MM-dd')}.pdf`;
    doc.save(filename);
};

/**
 * Print analytics report
 */
export const printAnalytics = () => {
    window.print();
};
