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
    id: '1',
    name: 'Vegetables',
    slug: 'vegetables',
    description: 'Fresh, locally grown vegetables straight from the farm'
  },
  {
    id: '2',
    name: 'Fruits',
    slug: 'fruits',
    description: 'Seasonal fruits picked at peak ripeness'
  },
  {
    id: '3',
    name: 'Dairy & Eggs',
    slug: 'dairy-eggs',
    description: 'Fresh dairy products and farm-fresh eggs'
  },
  {
    id: '4',
    name: 'Herbs & Spices',
    slug: 'herbs-spices',
    description: 'Aromatic herbs and spices to enhance your cooking'
  },
  {
    id: '5',
    name: 'Honey & Preserves',
    slug: 'honey-preserves',
    description: 'Natural honey and homemade preserves'
  },
  {
    id: '6',
    name: 'Grains & Cereals',
    slug: 'grains-cereals',
    description: 'Whole grains and cereals from local farms'
  }
];

// Farmers
export const farmers: Farmer[] = [
  {
    id: '1',
    name: 'John Smith',
    farmName: 'Green Valley Farm',
    location: 'Nairobi, Kenya',
    description: 'Family-owned farm specializing in organic vegetables and free-range eggs. We have been farming for over 20 years and believe in sustainable agriculture practices.',
    rating: 4.8,
    products: 12,
    image: '/api/placeholder/200/200'
  },
  {
    id: '2',
    name: 'Mary Johnson',
    farmName: 'Sunrise Orchard',
    location: 'Nakuru, Kenya',
    description: 'Specializing in tropical fruits and citrus varieties. Our orchard uses natural farming methods and we harvest at peak ripeness for maximum flavor.',
    rating: 4.9,
    products: 8,
    image: '/api/placeholder/200/200'
  },
  {
    id: '3',
    name: 'David Williams',
    farmName: 'Heritage Dairy',
    location: 'Eldoret, Kenya',
    description: 'Traditional dairy farm with grass-fed cows producing premium milk, cheese, and yogurt. We follow traditional methods passed down through generations.',
    rating: 4.7,
    products: 10,
    image: '/api/placeholder/200/200'
  },
  {
    id: '4',
    name: 'Sarah Brown',
    farmName: 'Herb Garden Paradise',
    location: 'Mombasa, Kenya',
    description: 'Specializing in organic herbs and spices. Our coastal climate provides perfect conditions for growing aromatic herbs year-round.',
    rating: 4.9,
    products: 15,
    image: '/api/placeholder/200/200'
  },
  {
    id: '5',
    name: 'James Davis',
    farmName: 'Honey Bee Farms',
    location: 'Kisumu, Kenya',
    description: 'Local honey producer with various floral sources. Our bees collect nectar from wildflowers and local crops, creating unique honey varieties.',
    rating: 4.6,
    products: 7,
    image: '/api/placeholder/200/200'
  }
];

// Products
export const products: Product[] = [
  // Green Valley Farm Products
  {
    id: '1',
    name: 'Fresh Tomatoes',
    price: 45.50,
    image: '/api/placeholder/300/200',
    farmer: 'Green Valley Farm',
    farmLocation: 'Nairobi, Kenya',
    category: 'vegetables',
    description: 'Vine-ripened tomatoes grown without pesticides. Perfect for salads and cooking. These tomatoes are picked at the peak of ripeness to ensure maximum flavor and nutritional value.',
    stock: 100,
    rating: 4.7,
    reviews: 124
  },
  {
    id: '2',
    name: 'Organic Spinach',
    price: 35.00,
    image: '/api/placeholder/300/200',
    farmer: 'Green Valley Farm',
    farmLocation: 'Nairobi, Kenya',
    category: 'vegetables',
    description: 'Tender organic spinach leaves, rich in vitamins and minerals. Harvested fresh daily and delivered within hours of picking.',
    stock: 50,
    rating: 4.8,
    reviews: 89
  },
  {
    id: '3',
    name: 'Carrots',
    price: 28.75,
    image: '/api/placeholder/300/200',
    farmer: 'Green Valley Farm',
    farmLocation: 'Nairobi, Kenya',
    category: 'vegetables',
    description: 'Sweet and crunchy carrots, perfect for snacking or cooking. Grown in sandy soil for best flavor and texture.',
    stock: 80,
    rating: 4.6,
    reviews: 67
  },
  {
    id: '4',
    name: 'Bell Peppers',
    price: 55.00,
    image: '/api/placeholder/300/200',
    farmer: 'Green Valley Farm',
    farmLocation: 'Nairobi, Kenya',
    category: 'vegetables',
    description: 'Colorful mix of red, yellow, and green bell peppers. Great for stir-fries and salads. Rich in vitamins A and C.',
    stock: 60,
    rating: 4.5,
    reviews: 45
  },
  {
    id: '5',
    name: 'Fresh Lettuce',
    price: 25.00,
    image: '/api/placeholder/300/200',
    farmer: 'Green Valley Farm',
    farmLocation: 'Nairobi, Kenya',
    category: 'vegetables',
    description: 'Crisp iceberg lettuce, perfect for sandwiches and salads. Grown using organic methods without harmful pesticides.',
    stock: 40,
    rating: 4.4,
    reviews: 38
  },
  {
    id: '6',
    name: 'Free-Range Eggs',
    price: 48.00,
    image: '/api/placeholder/300/200',
    farmer: 'Green Valley Farm',
    farmLocation: 'Nairobi, Kenya',
    category: 'dairy-eggs',
    description: 'Farm-fresh eggs from free-range chickens. Rich in omega-3 and vitamin D. Our chickens roam freely and eat natural feed.',
    stock: 120,
    rating: 4.9,
    reviews: 156
  },

  // Sunrise Orchard Products
  {
    id: '7',
    name: 'Mangoes',
    price: 65.00,
    image: '/api/placeholder/300/200',
    farmer: 'Sunrise Orchard',
    farmLocation: 'Nakuru, Kenya',
    category: 'fruits',
    description: 'Sweet, juicy mangoes at peak ripeness. Local variety with exceptional flavor. Perfect for smoothies, desserts, or eating fresh.',
    stock: 75,
    rating: 4.8,
    reviews: 203
  },
  {
    id: '8',
    name: 'Avocados',
    price: 85.00,
    image: '/api/placeholder/300/200',
    farmer: 'Sunrise Orchard',
    farmLocation: 'Nakuru, Kenya',
    category: 'fruits',
    description: 'Creamy, rich avocados perfect for guacamole or toast. Hass variety with buttery texture and nutty flavor.',
    stock: 60,
    rating: 4.7,
    reviews: 178
  },
  {
    id: '9',
    name: 'Pineapples',
    price: 95.00,
    image: '/api/placeholder/300/200',
    farmer: 'Sunrise Orchard',
    farmLocation: 'Nakuru, Kenya',
    category: 'fruits',
    description: 'Sweet tropical pineapples, grown without chemicals. Freshly harvested and delivered at optimal ripeness.',
    stock: 30,
    rating: 4.6,
    reviews: 92
  },
  {
    id: '10',
    name: 'Papayas',
    price: 55.00,
    image: '/api/placeholder/300/200',
    farmer: 'Sunrise Orchard',
    farmLocation: 'Nakuru, Kenya',
    category: 'fruits',
    description: 'Sweet, orange-fleshed papayas rich in digestive enzymes. Great for digestion and overall health.',
    stock: 45,
    rating: 4.5,
    reviews: 67
  },
  {
    id: '11',
    name: 'Passion Fruits',
    price: 75.00,
    image: '/api/placeholder/300/200',
    farmer: 'Sunrise Orchard',
    farmLocation: 'Nakuru, Kenya',
    category: 'fruits',
    description: 'Tangy passion fruits, perfect for juices and desserts. Aromatic and flavorful with bright orange pulp.',
    stock: 80,
    rating: 4.8,
    reviews: 134
  },

  // Heritage Dairy Products
  {
    id: '12',
    name: 'Fresh Milk',
    price: 55.00,
    image: '/api/placeholder/300/200',
    farmer: 'Heritage Dairy',
    farmLocation: 'Eldoret, Kenya',
    category: 'dairy-eggs',
    description: 'Pasteurized whole milk from grass-fed cows. Rich and creamy with natural vitamins and minerals.',
    stock: 40,
    rating: 4.7,
    reviews: 89
  },
  {
    id: '13',
    name: 'Greek Yogurt',
    price: 120.00,
    image: '/api/placeholder/300/200',
    farmer: 'Heritage Dairy',
    farmLocation: 'Eldoret, Kenya',
    category: 'dairy-eggs',
    description: 'Thick, creamy Greek yogurt made from fresh milk. No artificial additives. High in protein and probiotics.',
    stock: 25,
    rating: 4.8,
    reviews: 112
  },
  {
    id: '14',
    name: 'Cheddar Cheese',
    price: 280.00,
    image: '/api/placeholder/300/200',
    farmer: 'Heritage Dairy',
    farmLocation: 'Eldoret, Kenya',
    category: 'dairy-eggs',
    description: 'Aged cheddar cheese with sharp flavor. Made using traditional methods and aged for maximum flavor development.',
    stock: 15,
    rating: 4.9,
    reviews: 78
  },
  {
    id: '15',
    name: 'Farm Butter',
    price: 150.00,
    image: '/api/placeholder/300/200',
    farmer: 'Heritage Dairy',
    farmLocation: 'Eldoret, Kenya',
    category: 'dairy-eggs',
    description: 'Golden butter from fresh cream. Perfect for baking and cooking. Made from the milk of grass-fed cows.',
    stock: 30,
    rating: 4.6,
    reviews: 56
  },
  {
    id: '16',
    name: 'Cottage Cheese',
    price: 95.00,
    image: '/api/placeholder/300/200',
    farmer: 'Heritage Dairy',
    farmLocation: 'Eldoret, Kenya',
    category: 'dairy-eggs',
    description: 'Fresh cottage cheese, high in protein. Great for healthy breakfasts and snacks. Low in fat and calories.',
    stock: 20,
    rating: 4.5,
    reviews: 43
  },

  // Herb Garden Paradise Products
  {
    id: '17',
    name: 'Fresh Basil',
    price: 40.00,
    image: '/api/placeholder/300/200',
    farmer: 'Herb Garden Paradise',
    farmLocation: 'Mombasa, Kenya',
    category: 'herbs-spices',
    description: 'Aromatic basil leaves, perfect for pesto and Italian dishes. Grown without pesticides for maximum flavor.',
    stock: 35,
    rating: 4.7,
    reviews: 67
  },
  {
    id: '18',
    name: 'Rosemary',
    price: 35.00,
    image: '/api/placeholder/300/200',
    farmer: 'Herb Garden Paradise',
    farmLocation: 'Mombasa, Kenya',
    category: 'herbs-spices',
    description: 'Fragrant rosemary sprigs, great for roasted meats and vegetables. Strong, pine-like aroma and flavor.',
    stock: 40,
    rating: 4.6,
    reviews: 45
  },
  {
    id: '19',
    name: 'Thyme',
    price: 30.00,
    image: '/api/placeholder/300/200',
    farmer: 'Herb Garden Paradise',
    farmLocation: 'Mombasa, Kenya',
    category: 'herbs-spices',
    description: 'Earthy thyme leaves, essential for Mediterranean cooking. Pungent, warm flavor with subtle floral notes.',
    stock: 45,
    rating: 4.5,
    reviews: 38
  },
  {
    id: '20',
    name: 'Mint',
    price: 25.00,
    image: '/api/placeholder/300/200',
    farmer: 'Herb Garden Paradise',
    farmLocation: 'Mombasa, Kenya',
    category: 'herbs-spices',
    description: 'Refreshing mint leaves, perfect for teas and cocktails. Cool, refreshing flavor with sweet undertones.',
    stock: 50,
    rating: 4.8,
    reviews: 89
  },
  {
    id: '21',
    name: 'Parsley',
    price: 20.00,
    image: '/api/placeholder/300/200',
    farmer: 'Herb Garden Paradise',
    farmLocation: 'Mombasa, Kenya',
    category: 'herbs-spices',
    description: 'Fresh parsley, rich in vitamins. Great garnish for dishes. Bright, clean flavor with mild peppery notes.',
    stock: 60,
    rating: 4.4,
    reviews: 34
  },

  // Honey Bee Farms Products
  {
    id: '22',
    name: 'Wildflower Honey',
    price: 180.00,
    image: '/api/placeholder/300/200',
    farmer: 'Honey Bee Farms',
    farmLocation: 'Kisumu, Kenya',
    category: 'honey-preserves',
    description: 'Pure wildflower honey with complex floral notes. Raw and unprocessed, retaining all natural enzymes and nutrients.',
    stock: 25,
    rating: 4.9,
    reviews: 145
  },
  {
    id: '23',
    name: 'Acacia Honey',
    price: 200.00,
    image: '/api/placeholder/300/200',
    farmer: 'Honey Bee Farms',
    farmLocation: 'Kisumu, Kenya',
    category: 'honey-preserves',
    description: 'Light and sweet acacia honey, perfect for tea and desserts. Delicate floral aroma with mild, clean taste.',
    stock: 20,
    rating: 4.8,
    reviews: 98
  },
  {
    id: '24',
    name: 'Mango Jam',
    price: 125.00,
    image: '/api/placeholder/300/200',
    farmer: 'Honey Bee Farms',
    farmLocation: 'Kisumu, Kenya',
    category: 'honey-preserves',
    description: 'Homemade mango jam with chunks of real fruit. No artificial preservatives. Sweet and tangy flavor.',
    stock: 30,
    rating: 4.7,
    reviews: 76
  },
  {
    id: '25',
    name: 'Strawberry Preserves',
    price: 115.00,
    image: '/api/placeholder/300/200',
    farmer: 'Honey Bee Farms',
    farmLocation: 'Kisumu, Kenya',
    category: 'honey-preserves',
    description: 'Sweet strawberry preserves made with locally grown berries. Rich, fruity flavor with natural sweetness.',
    stock: 35,
    rating: 4.6,
    reviews: 62
  },
  {
    id: '26',
    name: 'Beeswax Candles',
    price: 85.00,
    image: '/api/placeholder/300/200',
    farmer: 'Honey Bee Farms',
    farmLocation: 'Kisumu, Kenya',
    category: 'honey-preserves',
    description: 'Natural beeswax candles, clean burning with subtle honey scent. Long-lasting and environmentally friendly.',
    stock: 40,
    rating: 4.5,
    reviews: 48
  },

  // Additional Products
  {
    id: '27',
    name: 'Brown Rice',
    price: 160.00,
    image: '/api/placeholder/300/200',
    farmer: 'Green Valley Farm',
    farmLocation: 'Nairobi, Kenya',
    category: 'grains-cereals',
    description: 'Organic brown rice, rich in fiber and nutrients. Nutty flavor and chewy texture. Perfect for healthy meals.',
    stock: 50,
    rating: 4.4,
    reviews: 56
  },
  {
    id: '28',
    name: 'Whole Wheat Flour',
    price: 140.00,
    image: '/api/placeholder/300/200',
    farmer: 'Green Valley Farm',
    farmLocation: 'Nairobi, Kenya',
    category: 'grains-cereals',
    description: 'Stone-ground whole wheat flour for healthy baking. Retains all natural nutrients and fiber.',
    stock: 40,
    rating: 4.3,
    reviews: 42
  },
  {
    id: '29',
    name: 'Quinoa',
    price: 220.00,
    image: '/api/placeholder/300/200',
    farmer: 'Sunrise Orchard',
    farmLocation: 'Nakuru, Kenya',
    category: 'grains-cereals',
    description: 'High-protein quinoa grains, perfect for healthy meals. Complete protein source with all essential amino acids.',
    stock: 25,
    rating: 4.7,
    reviews: 89
  },
  {
    id: '30',
    name: 'Sweet Potatoes',
    price: 38.00,
    image: '/api/placeholder/300/200',
    farmer: 'Green Valley Farm',
    farmLocation: 'Nairobi, Kenya',
    category: 'vegetables',
    description: 'Nutritious sweet potatoes, rich in vitamin A and fiber. Sweet, creamy texture with orange flesh.',
    stock: 70,
    rating: 4.5,
    reviews: 78
  },
  {
    id: '31',
    name: 'Fresh Corn',
    price: 32.00,
    image: '/api/placeholder/300/200',
    farmer: 'Green Valley Farm',
    farmLocation: 'Nairobi, Kenya',
    category: 'vegetables',
    description: 'Sweet corn on the cob, perfect for grilling or boiling. Tender kernels with natural sweetness.',
    stock: 60,
    rating: 4.6,
    reviews: 92
  }
];
