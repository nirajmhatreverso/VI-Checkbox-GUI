import receiptLogoUrl from "@/assets/reciept_logo.png?inline";

export interface ReceiptPaymentRow {
  transId: string;
  sapBpId?: string | null;
  sapCaId?: string | null;
  name?: string | null;
  currency?: string | null;
  totalAmount?: number | null;
  payAmount?: number | null;
  receiptNo?: string | null;
  description?: string | null;
  createDt?: string | null;
  createTs?: string | null;
  updateTs?: string | null;
  payType?: string; // This property will determine the receipt's description
}

/**
 * Basic HTML escaping to prevent any injected markup from breaking the receipt.
 */
function escapeHtml(input: unknown): string {
  const s = String(input ?? "");
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatAmount(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getPrintedDate(row: ReceiptPaymentRow): string {
  const raw = row.updateTs || row.createTs || row.createDt || "";
  if (!raw) return new Date().toLocaleDateString();
  const dt = new Date(raw.replace(" ", "T"));
  return isNaN(dt.getTime()) ? escapeHtml(raw) : dt.toLocaleDateString();
}

/**
 * Generate the printable HTML for a single receipt row.
 */
export function generateReceiptHtmlFromApi(row: ReceiptPaymentRow): string {
  const amount = Number(row.totalAmount ?? row.payAmount ?? 0);
  const printedDate = getPrintedDate(row);

  // Conditionally set the item description based on payType
  const itemDescription = (row.payType || "").toUpperCase() === 'SUBSCRIPTION'
    ? 'Subscription payment'
    : 'Hardware payment';

  return `
<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Receipt ${escapeHtml(row.transId)}</title>
<style>
  body { font-family: Arial, Calibri, sans-serif; color: #222; background: #fff; margin: 0; padding: 0; }
  .receipt-container { width: 340px; margin: 120px 0 0 30px; background: #fff; }
  .header-shift { position: relative; left: -15px; }
  .center { text-align: center; }
  .logo-img { display: block; margin: 10px auto 10px auto; height: 55px; }
  .title { font-size: 20px; font-weight: bold; margin-bottom: 8px; }
  .company { font-size: 15px; font-weight: bold; margin-bottom: 3px; }
  .address { font-size: 13px; margin-bottom: 2px; line-height: 1.3; }
  .tin-vrn { font-size: 13px; margin: 14px 0 8px 0; text-align: left; line-height: 1.4; }
  .section { margin: 12px 0; line-height: 1.5; }
  .label { font-weight: bold; font-size: 13px; }
  .value { font-size: 13px; }
  .desc-title { font-weight: bold; font-size: 14px; margin: 12px 0 4px 0; }
  .desc-block { border-top: 2px solid #222; margin: 12px 0 8px 0; padding-top: 8px; }
  .desc-row { font-size: 13px; margin-bottom: 2px; display: flex; justify-content: flex-start; align-items: center; }
  .desc-row .label { font-weight: bold; margin-right: 6px; white-space: nowrap; }
  .desc-row .value { margin-left: 0; min-width: auto; text-align: left; }
  .desc-row.total { font-weight: bold; margin-top: 8px; }
  .contact-title { font-weight: bold; font-size: 14px; margin-top: 12px; }
  .contact-table { font-size: 13px; line-height: 1.4; }
  .contact-table td { padding: 2px 6px 2px 0; }
  @media print {
    body { margin: 0; }
  }
</style>
</head>
<body>
  <div class="receipt-container">
    <div class="center header-shift">
      <img src="${receiptLogoUrl}" class="logo-img" alt="AzamTV Logo" />
      <div class="title">PAYMENT RECEIPT</div>
      <div class="company">AZAM TV LTD</div>
      <div class="address">Post Box 2517</div>
      <div class="address">Plot 46/4 Nyerere Rd</div>
      <div class="address">Dar Es Salaam, Tanzania</div>
    </div>

    <div class="tin-vrn">
      <span class="label">TIN :</span> 142-196-018<br />
      <span class="label">VRN :</span> 40-038793-C
    </div>

    <div class="section">
      <span class="label">Name :</span> <span class="value">${escapeHtml(row.name)}</span><br />
      <span class="label">Customer Id:</span> <span class="value">${escapeHtml(row.sapBpId)}</span><br />
      <span class="label">Currency :</span> <span class="value">${escapeHtml(row.currency || "")}</span><br />
      <span class="label">Tax Receipt No :</span> <span class="value">${escapeHtml(row.receiptNo)}</span><br />
      <span class="label">Tax Receipt Date :</span> <span class="value">${escapeHtml(printedDate)}</span><br />
      <span class="label">Tax Receipt Total :</span> <span class="value">${escapeHtml(row.currency || "")} ${formatAmount(amount)}</span>
    </div>

    <div class="desc-title desc-block">Description</div>
    <div>
      <div class="desc-row"><span class="label">Item :</span><span class="value">${itemDescription}</span></div>
      <div class="desc-row"><span class="label">Price :</span><span class="value">${formatAmount(amount)}</span></div>
      <div class="desc-row"><span class="label">Charge Amount :</span><span class="value">${formatAmount(amount)}</span></div>
      <div class="desc-row total">Total amount</div>
      <div class="desc-row"><span class="label">inclusive of Tax 18%:</span><span class="value">${formatAmount(amount)}</span></div>
    </div>

    <div class="contact-title desc-block">AzamTV Contact Details</div>
    <table class="contact-table">
      <tr><td class="label">Airtel:</td><td class="value">0784 108000</td></tr>
      <tr><td class="label">Vodacom:</td><td class="value">0764 700222</td></tr>
      <tr><td class="label">Tigo:</td><td class="value">0659 072002</td></tr>
      <tr><td class="label">USSD:</td><td class="value">*150*50#</td></tr>
      <tr><td class="label">Email:</td><td class="value">info@azam-media.com</td></tr>
      <tr><td class="label">Web:</td><td class="value">www.azamtv.co.tz</td></tr>
    </table>
  </div>
</body>
</html>
`;
}

/**
 * Convenience helper to print the receipt HTML for a row.
 */
export function printReceiptFromApiRow(row: ReceiptPaymentRow) {
  const html = generateReceiptHtmlFromApi(row);
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.visibility = "hidden";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || (iframe as any).contentDocument;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      setTimeout(() => document.body.removeChild(iframe), 500);
    }
  }, 150);
}