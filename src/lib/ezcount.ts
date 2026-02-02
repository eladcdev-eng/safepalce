export interface EZcountItem {
  catalog_number?: string;
  details: string;
  amount: number;
  price: number;
  vat?: number;
  vat_type?: 'PRE' | 'INC' | 'NON';
  comment?: string;
  discount_price?: number;
  discount_type?: 'PERCENTAGE' | 'NUMBER';
}

export interface EZcountPayment {
  payment_type: number;
  payment_sum: number;
  date?: string;
  comment?: string;
}

export interface EZcountDocRequest {
  api_key: string;
  developer_email: string;
  type: number; // 300 for Proforma Invoice
  customer_name: string;
  customer_email?: string;
  customer_address?: string;
  customer_phone?: string;
  item: EZcountItem[];
  payment?: EZcountPayment[];
  price_total?: number;
  description?: string;
  comment?: string;
  vat?: number;
  dont_send_email?: number; // 0 or 1
}

export interface EZcountResponse {
  success: boolean;
  pdf_link?: string;
  pdf_link_copy?: string;
  doc_number?: string;
  doc_uuid?: string;
  errNum?: number;
  errMsg?: string;
}

const TEST_API_KEY = "f1c85d16fc1acd369a93f0489f4615d93371632d97a9b0a197de6d4dc0da51bf";
const DEVELOPER_EMAIL = "developer@example.com"; // User should probably configure this

export async function createEZcountDoc(data: Partial<EZcountDocRequest>): Promise<EZcountResponse> {
  const payload: EZcountDocRequest = {
    api_key: process.env.NEXT_PUBLIC_EZCOUNT_API_KEY || TEST_API_KEY,
    developer_email: process.env.NEXT_PUBLIC_EZCOUNT_DEVELOPER_EMAIL || DEVELOPER_EMAIL,
    type: 300, // Defaul to Proforma Invoice
    customer_name: "",
    item: [],
    ...data,
  };

  const response = await fetch("https://api.ezcount.co.il/api/createDoc", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return response.json();
}
