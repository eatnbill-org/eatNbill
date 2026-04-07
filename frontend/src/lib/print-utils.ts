import { formatINR } from '@/lib/format';
import i18n from '@/i18n';

type ReceiptTemplate = 'MM80_STANDARD' | 'MM58_COMPACT' | 'A4_TAX_INVOICE';

const RECEIPT_TEMPLATE_STORAGE_KEY = 'billing_receipt_template';

function getReceiptTemplate(): ReceiptTemplate {
    try {
        const raw = localStorage.getItem(RECEIPT_TEMPLATE_STORAGE_KEY) as ReceiptTemplate | null;
        if (raw === 'MM58_COMPACT' || raw === 'A4_TAX_INVOICE' || raw === 'MM80_STANDARD') {
            return raw;
        }
    } catch {
        // ignore
    }
    return 'MM80_STANDARD';
}

function billLabel(key: string) {
    const language = i18n.resolvedLanguage || 'en';
    const enLabel = i18n.getFixedT('en', 'billing')(`print.${key}`) as string;
    if (language === 'en') {
        return enLabel;
    }
    const localLabel = i18n.getFixedT(language, 'billing')(`print.${key}`) as string;
    return `${localLabel} / ${enLabel}`;
}

/**
 * Print a kitcen order slip
 */
export function printKitchenSlip(order: Order, title = "KITCHEN ORDER") {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const itemsHtml = (order.items || []).map((item: any) =>
        `<tr><td style="padding:4px 0;font-size:14px;">${item.quantity}x ${item.name_snapshot || item.product?.name || item.name || 'Item'}</td></tr>`
    ).join('');

    const slipHtml = `<!DOCTYPE html><html><head><title>${title}</title>
    <style>
        @page { margin: 5mm; size: 80mm auto; }
        body { font-family: 'Courier New', monospace; margin: 0; padding: 8px; font-size: 14px; width: 76mm; }
        .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
        .header h1 { font-size: 18px; margin: 0; letter-spacing: 2px; }
        .badge { text-align: center; background: #000; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 12px; display: inline-block; margin-bottom: 6px; }
        .info { margin-bottom: 8px; }
        .info p { margin: 2px 0; font-size: 13px; }
        .items { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 8px 0; }
        .items table { width: 100%; }
        .footer { text-align: center; margin-top: 8px; font-size: 11px; color: #666; }
    </style></head><body>
        <div class="header">
            <div class="badge">${order.source === 'QR' ? 'QR ORDER' : order.order_type || 'ORDER'}</div>
            <h1>${title}</h1>
        </div>
        <div class="info">
            <p><strong>Order:</strong> #${order.order_number || order.id?.slice(-4).toUpperCase() || '????'}</p>
            <p><strong>Table:</strong> ${order.table_number || (order as any).table?.table_number || 'Takeaway'}</p>
            <p><strong>Time:</strong> ${timeStr}</p>
            <p><strong>Date:</strong> ${dateStr}</p>
            ${order.customer_name ? `<p><strong>Customer:</strong> ${order.customer_name}</p>` : ''}
            ${order.notes ? `<p><strong>Note:</strong> ${order.notes}</p>` : ''}
        </div>
        <div class="items"><table>${itemsHtml}</table></div>
        <div class="footer"><p>--- Kitchen Copy ---</p></div>
    </body></html>`;

    printHtml(slipHtml);
}

/**
 * Print a customer bill
 */
export function printBill(order: Order, storeName = "Restaurant", address = "") {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const template = getReceiptTemplate();
    const isA4 = template === 'A4_TAX_INVOICE';
    const pageSize = template === 'MM58_COMPACT' ? '58mm auto' : template === 'MM80_STANDARD' ? '80mm auto' : 'A4';
    const bodyWidth = template === 'MM58_COMPACT' ? '54mm' : template === 'MM80_STANDARD' ? '76mm' : '100%';
    const bodyPadding = template === 'MM58_COMPACT' ? '8px' : template === 'MM80_STANDARD' ? '10px' : '20px';
    const bodyFontSize = template === 'MM58_COMPACT' ? '11px' : template === 'MM80_STANDARD' ? '12px' : '13px';
    const thankYouLabel = billLabel('thankYou');
    const visitAgainLabel = billLabel('visitAgain');

    const itemsHtml = (order.items || []).map((item: any) => {
        const price = parseFloat(item.price_snapshot || item.unit_price || '0');
        const amount = price * item.quantity;
        return `
        <tr>
            <td style="padding:4px 0;">${item.quantity}x ${item.name_snapshot || item.product?.name || item.name || 'Item'}</td>
            <td style="text-align:right;">${formatINR(amount)}</td>
        </tr>`;
    }).join('');

    const total = parseFloat(order.total_amount);
    const discount = parseFloat(order.discount_amount || '0');
    const subtotal = total + discount;

    const billHtml = `<!DOCTYPE html><html><head><title>Bill</title>
    <style>
        @page { margin: 5mm; size: ${pageSize}; }
        body { font-family: 'Courier New', monospace; margin: 0; padding: ${bodyPadding}; font-size: ${bodyFontSize}; width: ${bodyWidth}; color: #000; ${isA4 ? 'max-width: 760px;' : ''} }
        .header { text-align: center; margin-bottom: 10px; }
        .header h1 { font-size: 16px; margin: 0; font-weight: bold; text-transform: uppercase; }
        .header p { margin: 2px 0; font-size: 11px; }
        .divider { border-top: 1px dashed #000; margin: 8px 0; }
        .info { margin-bottom: 8px; font-size: 11px; }
        .info p { margin: 2px 0; display: flex; justify-content: space-between; }
        .items table { width: 100%; border-collapse: collapse; }
        .items th { text-align: left; border-bottom: 1px dashed #000; padding: 4px 0; font-size: 11px; }
        .items td { padding: 4px 0; vertical-align: top; font-size: 12px; }
        .totals { margin-top: 8px; }
        .totals p { display: flex; justify-content: space-between; margin: 4px 0; font-size: 12px; }
        .grand-total { font-weight: bold; font-size: 14px; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 6px 0; margin-top: 6px; }
        .footer { text-align: center; margin-top: 15px; font-size: 10px; }
        .qr { text-align: center; margin-top: 10px; }
    </style></head><body>
        <div class="header">
            <h1>${storeName}</h1>
            ${address ? `<p>${address}</p>` : ''}
        </div>
        
        <div class="divider"></div>
        
        <div class="info">
            <p><span>${billLabel('order')}: #${order.order_number || order.id?.slice(-4).toUpperCase()}</span> <span>${dateStr} ${timeStr}</span></p>
            <p><span>${billLabel('table')}: ${order.table_number || (order as any).table?.table_number || 'Takeaway'}</span> <span>${billLabel('type')}: ${order.order_type}</span></p>
            <p><span>${billLabel('customer')}: ${order.customer_name || 'Guest'}</span></p>
        </div>

        <div class="divider"></div>

        <div class="items">
            <table>
                <thead><tr><th>${billLabel('item')}</th><th style="text-align:right;">${billLabel('amount')}</th></tr></thead>
                <tbody>${itemsHtml}</tbody>
            </table>
        </div>

        <div class="divider"></div>

        <div class="totals">
            <p><span>${billLabel('subtotal')}</span> <span>${formatINR(subtotal)}</span></p>
            ${discount > 0 ? `<p><span>${billLabel('discount')}</span> <span>- ${formatINR(discount)}</span></p>` : ''}
            <p class="grand-total"><span>${billLabel('totalPayable').toUpperCase()}</span> <span>${formatINR(total)}</span></p>
            <p style="margin-top:8px;"><span>${billLabel('paymentMethod')}</span> <span>${order.payment_method || 'PENDING'}</span></p>
            <p><span>${billLabel('status')}</span> <span>${order.payment_status}</span></p>
        </div>

        <div class="footer">
            <p>${thankYouLabel}</p>
            <p>${visitAgainLabel}</p>
        </div>
    </body></html>`;

    printHtml(billHtml);
}

function printHtml(html: string) {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-10000px;left:-10000px;width:80mm;height:0;';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
        setTimeout(() => {
            iframe.contentWindow?.print();
            setTimeout(() => document.body.removeChild(iframe), 3000);
        }, 500);
    }
}
