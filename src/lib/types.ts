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
