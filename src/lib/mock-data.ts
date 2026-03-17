export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  farmer: string;
  farmLocation: string;
  category: string;
  description: string;
  stock: number;
  rating: number;
  reviews: number;
}

// Categories placeholder (empty until backend/API is ready)
export const categories: any[] = [];

// Products placeholder (empty until backend/API is ready)
export const products: Product[] = [];
