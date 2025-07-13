import { Timestamp } from "firebase/firestore";

export interface Product {
  id: string;
  name: string;
  stock: number;
  image: string;
  category: "Creampuff" | "Cheesecake" | "Millecrepes" | "Minuman" | "Snackbox" | "Lainnya";
}

export interface UserSession {
  id: string;
  name: string;
  position: string;
  loginTime: Timestamp;
  status: "active" | "inactive";
}

export interface SaleHistoryItem {
  productId: string;
  productName: string;
  quantity: number;
  image: string;
}

export interface SaleHistory {
  id: string;
  timestamp: Timestamp;
  session: {
    name: string;
    position: string;
  };
  items: SaleHistoryItem[];
  totalItems: number;
}

export interface ReportItem {
  productName: string;
  category: string;
  quantity: number;
  image: string;
}

export interface Report {
  id:string;
  timestamp: Timestamp;
  session: {
    name: string;
    position: string;
  };
  itemsSold: ReportItem[];
  itemsRejected: ReportItem[];
  totalSold: number;
  totalRejected: number;
}

export interface StockUpdateHistory {
  id: string;
  timestamp: Timestamp;
  session: {
    name: string;
    position: string;
  };
  product: {
    id: string;
    name: string;
    image: string;
  };
  quantityAdded: number;
  stockAfter: number;
}

export interface UserProfile {
  photoURL?: string;
  statusNote?: string;
}
