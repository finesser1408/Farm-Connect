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

export const categories = [
  { name: "Fruits", slug: "fruits", image: "/cat-fruits.jpg" },
  { name: "Vegetables", slug: "vegetables", image: "/cat-vegetables.jpg" },
  { name: "Grains", slug: "grains", image: "/cat-grains.jpg" },
  { name: "Dairy", slug: "dairy", image: "/cat-dairy.jpg" },
  { name: "Livestock", slug: "livestock", image: "/cat-livestock.jpg" },
];

export const products: Product[] = [];
