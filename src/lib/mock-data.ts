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

export const products: Product[] = [
  { id: "1", name: "Organic Tomatoes", price: 3.50, image: "", farmer: "Green Valley Farm", farmLocation: "Harare", category: "vegetables", description: "Fresh, vine-ripened organic tomatoes grown without pesticides. Perfect for salads, sauces, and cooking.", stock: 50, rating: 4.8, reviews: 24 },
  { id: "2", name: "Fresh Strawberries", price: 5.00, image: "", farmer: "Sunrise Berries", farmLocation: "Mutare", category: "fruits", description: "Sweet, juicy strawberries picked at peak ripeness. Grown with love on our family farm.", stock: 30, rating: 4.9, reviews: 42 },
  { id: "3", name: "Farm Eggs (Dozen)", price: 4.00, image: "", farmer: "Happy Hen Farm", farmLocation: "Bulawayo", category: "livestock", description: "Free-range eggs from happy, healthy hens. Rich golden yolks and superior taste.", stock: 100, rating: 4.7, reviews: 56 },
  { id: "4", name: "Raw Honey (500ml)", price: 8.50, image: "", farmer: "Bee Haven Apiary", farmLocation: "Masvingo", category: "livestock", description: "Pure, unprocessed raw honey. Rich in enzymes and natural antioxidants.", stock: 25, rating: 5.0, reviews: 38 },
  { id: "5", name: "Whole Wheat Flour (2kg)", price: 6.00, image: "", farmer: "Golden Fields", farmLocation: "Chinhoyi", category: "grains", description: "Stone-ground whole wheat flour from locally grown wheat. Perfect for baking bread and pastries.", stock: 80, rating: 4.6, reviews: 19 },
  { id: "6", name: "Fresh Milk (1L)", price: 2.50, image: "", farmer: "Meadow Dairy", farmLocation: "Gweru", category: "dairy", description: "Fresh whole milk from grass-fed cows. Creamy, rich, and full of natural goodness.", stock: 60, rating: 4.8, reviews: 31 },
  { id: "7", name: "Organic Carrots (1kg)", price: 2.00, image: "", farmer: "Root & Stem Farm", farmLocation: "Harare", category: "vegetables", description: "Crispy, sweet organic carrots. Great for juicing, cooking, or snacking.", stock: 45, rating: 4.5, reviews: 15 },
  { id: "8", name: "Mangoes (6 pack)", price: 7.00, image: "", farmer: "Tropical Orchard", farmLocation: "Chipinge", category: "fruits", description: "Luscious, tree-ripened mangoes bursting with tropical flavor.", stock: 20, rating: 4.9, reviews: 27 },
  { id: "9", name: "Maize Meal (5kg)", price: 4.50, image: "", farmer: "Golden Fields", farmLocation: "Chinhoyi", category: "grains", description: "Premium quality maize meal, finely ground. A staple for every kitchen.", stock: 120, rating: 4.7, reviews: 63 },
  { id: "10", name: "Artisan Cheese (250g)", price: 9.00, image: "", farmer: "Meadow Dairy", farmLocation: "Gweru", category: "dairy", description: "Handcrafted artisan cheese aged to perfection. Rich, creamy, and full of character.", stock: 15, rating: 4.8, reviews: 22 },
  { id: "11", name: "Fresh Spinach Bunch", price: 1.50, image: "", farmer: "Green Valley Farm", farmLocation: "Harare", category: "vegetables", description: "Tender, dark green spinach leaves. Packed with iron and vitamins.", stock: 40, rating: 4.6, reviews: 18 },
  { id: "12", name: "Groundnuts (1kg)", price: 5.50, image: "", farmer: "Savanna Nuts", farmLocation: "Karoi", category: "grains", description: "Roasted groundnuts with a rich, nutty flavor. Perfect for snacking or cooking.", stock: 55, rating: 4.4, reviews: 12 },
];
