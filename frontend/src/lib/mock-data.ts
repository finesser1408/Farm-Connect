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

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image?: string;
}

export interface Farmer {
  id: string;
  name: string;
  farmName: string;
  location: string;
  description: string;
  rating: number;
  products: number;
  image?: string;
}

// Categories
export const categories: Category[] = [
  {
    id: "1",
    name: "Vegetables",
    slug: "vegetables",
    description: "Fresh, locally grown vegetables straight from the farm"
  },
  {
    id: "2",
    name: "Fruits",
    slug: "fruits",
    description: "Seasonal fruits picked at peak ripeness"
  },
  {
    id: "3",
    name: "Dairy & Eggs",
    slug: "dairy-eggs",
    description: "Fresh dairy products and farm-fresh eggs"
  },
  {
    id: "4",
    name: "Herbs & Spices",
    slug: "herbs-spices",
    description: "Aromatic herbs and spices to enhance your cooking"
  },
  {
    id: "5",
    name: "Honey & Preserves",
    slug: "honey-preserves",
    description: "Natural honey and homemade preserves"
  },
  {
    id: "6",
    name: "Grains & Cereals",
    slug: "grains-cereals",
    description: "Whole grains and cereals from local farms"
  }
];

// Farmers
export const farmers: Farmer[] = [];

// Products
export const products: Product[] = [];
