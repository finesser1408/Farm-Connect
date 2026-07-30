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
    name: 'Makanaka Machiridza',
    farmName: 'Green Valley Farm',
    location: 'Harare, Zimbabwe',
    description: 'Family-owned farm specializing in organic vegetables and free-range eggs.',
    rating: 4.8,
    products: 12,
    image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=200&h=200&fit=crop&auto=format'
  },
  {
    id: '2',
    name: 'Rutendo Chikodzi',
    farmName: 'Sunrise Orchard',
    location: 'Harare, Zimbabwe',
    description: 'Specializing in tropical fruits and citrus varieties.',
    rating: 4.9,
    products: 8,
    image: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=200&h=200&fit=crop&auto=format'
  },
  {
    id: '3',
    name: 'Tadiwa Ndlovu',
    farmName: 'Heritage Dairy',
    location: 'Bulawayo, Zimbabwe',
    description: 'Traditional dairy farm with grass-fed cows producing premium milk.',
    rating: 4.7,
    products: 10,
    image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=200&h=200&fit=crop&auto=format'
  },
  {
    id: '4',
    name: 'Kunashe Brown',
    farmName: 'Herb Garden Paradise',
    location: 'Harare, Zimbabwe',
    description: 'Specializing in organic herbs and spices.',
    rating: 4.9,
    products: 15,
    image: 'https://images.unsplash.com/photo-1532335692672-9a1f8b0b9f58?w=200&h=200&fit=crop&auto=format'
  },
  {
    id: '5',
    name: 'Melanie Makanza',
    farmName: 'Honey Bee Farms',
    location: 'Harare, Zimbabwe',
    description: 'Local honey producer with various floral sources.',
    rating: 4.6,
    products: 7,
    image: 'https://images.unsplash.com/photo-1587049352851-8d4e89133924?w=200&h=200&fit=crop&auto=format'
  },
  {
    id: '6',
    name: 'Kayla Choto',
    farmName: 'Kayla Poultries',
    location: 'Norton, Zimbabwe',
    description: 'Specializing in qaulity egg production and delivery.',
    rating: 4.8,
    products: 9,
    image: 'https://assets.vogue.com/photos/69409e19496dc9b72e7e755a/master/w_2560%2Cc_limit/AdobeStock_248253485%2520copy.jpg'
  }
];

// Products  
export const products: Product[] = [
  // Green Valley Farm Products
  {
    id: '1',
    name: 'Fresh Tomatoes',
    price: 1.50,
    image:  'https://images.stockcake.com/public/9/6/5/9651dec8-d480-4402-8ce1-eaac2b48a3f0_large/sunlit-fresh-tomatoes-stockcake.jpg',
    farmer: 'Green Valley Farm',
    farmLocation: 'Harare, Zimbabwe',
    category: 'vegetables',
    description: 'Vine-ripened tomatoes grown without pesticides. Perfect for salads and cooking.',
    stock: 100,
    rating: 4.7,
    reviews: 124
  },
  {
    id: '2',
    name: 'Organic Spinach',
    price: 1.00,
    image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&h=400&fit=crop&auto=format',
    farmer: 'Green Valley Farm',
    farmLocation: 'Harare, Zimbabwe',
    category: 'vegetables',
    description: 'Tender organic spinach leaves, rich in vitamins and minerals.',
    stock: 50,
    rating: 4.8,
    reviews: 89
  },
  {
    id: '3',
    name: 'Carrots',
    price: 1.00,
    image: 'https://images.unsplash.com/photo-1582515073490-39981397c445?w=400&h=400&fit=crop&auto=format',
    farmer: 'Green Valley Farm',
    farmLocation: 'Harare, Zimbabwe',
    category: 'vegetables',
    description: 'Sweet and crunchy carrots, perfect for snacking or cooking.',
    stock: 80,
    rating: 4.6,
    reviews: 67
  },
  {
    id: '4',
    name: 'Bell Peppers',
    price: 0.50,
    image: ' https://www.chilipeppermadness.com/wp-content/uploads/2024/02/Bell-Peppers1.jpg',
    farmer: 'Green Valley Farm',
    farmLocation: 'Harare, Zimbabwe',
    category: 'vegetables',
    description: 'Colorful mix of red, yellow, and green bell peppers.',
    stock: 60,
    rating: 4.5,
    reviews: 45
  },
  {
    id: '5',
    name: 'Fresh Lettuce',
    price: 0.50,
    image: 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=400&h=400&fit=crop&auto=format',
    farmer: 'Green Valley Farm',
    farmLocation: 'Harare, Zimbabwe',
    category: 'vegetables',
    description: 'Crisp iceberg lettuce, perfect for sandwiches and salads.',
    stock: 40,
    rating: 4.4,
    reviews: 38
  },
  {
    id: '6',
    name: 'Free-Range Eggs',
    price: 4.00,
    image: ' https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSMawv9Yhc-3N7JabvSbJ3sHS3fxc3psaPTWqoIPJGmSeFG0LWVGJAKLx3Y&s=10',
    farmer: 'Kayla Poultries',
    farmLocation: 'Norton, Zimbabwe',
    category: 'dairy-eggs',
    description: 'Farm-fresh eggs from free-range chickens. Rich in omega-3.',
    stock: 120,
    rating: 4.9,
    reviews: 156
  },

  // Sunrise Orchard Products
  {
    id: '7',
    name: 'Mangoes',
    price: 1.00,
    image: 'https://www.paperandtea.de/cdn/shop/articles/Mango_6fb74c95-c9b0-4559-88e8-f542e6d6b18d.jpg?v=1769533193&width=1024',
    farmer: 'Sunrise Orchard',
    farmLocation: 'Harare, Zimbabwe',
    category: 'fruits',
    description: 'Sweet, juicy mangoes at peak ripeness. Perfect for smoothies or eating fresh.',
    stock: 75,
    rating: 4.8,
    reviews: 203
  },
  {
    id: '8',
    name: 'Avocados',
    price: 0.50,
    image: 'https://images.immediate.co.uk/production/volatile/sites/30/2022/07/Avocado-sliced-in-half-ca9d808.jpg?quality=90&resize=440,400',
    farmer: 'Sunrise Orchard',
    farmLocation: ' Harare, Zimbabwe',
    category: 'fruits',
    description: 'Creamy, rich avocados perfect for guacamole or toast.',
    stock: 60,
    rating: 4.7,
    reviews: 178
  },
  {
    id: '9',
    name: 'Pineapples',
    price: 2.00,
    image: 'https://images.stockcake.com/public/6/3/a/63a5c9b7-aeb8-46c1-b1ce-fff916580676_large/slicing-fresh-pineapple-stockcake.jpg',
    farmer: 'Sunrise Orchard',
    farmLocation: 'Harare, Zimbabwe',
    category: 'fruits',
    description: 'Sweet tropical pineapples, grown without chemicals.',
    stock: 30,
    rating: 4.6,
    reviews: 92
  },
  {
    id: '10',
    name: 'Papayas',
    price: 1.50,
    image: 'https://images.unsplash.com/photo-1517282009859-f000ec3b26fe?w=400&h=400&fit=crop&auto=format',
    farmer: 'Sunrise Orchard',
    farmLocation: 'Harare, Zimbabwe',
    category: 'fruits',
    description: 'Sweet, orange-fleshed papayas rich in digestive enzymes.',
    stock: 45,
    rating: 4.5,
    reviews: 67
  },
  {
    id: '11',
    name: 'Passion Fruits',
    price: 0.50,
    image: 'https://images.stockcake.com/public/3/0/8/308fecd1-c72b-49a8-ba38-dfe8a37430f4_large/exotic-fruit-assortment-stockcake.jpg',
    farmer: 'Sunrise Orchard',
    farmLocation: 'Harare, Zimbabwe',
    category: 'fruits',
    description: 'Tangy passion fruits, perfect for juices and desserts.',
    stock: 80,
    rating: 4.8,
    reviews: 134
  },

  // Heritage Dairy Products
  {
    id: '12',
    name: 'Fresh Milk',
    price: 1.50,
    image: 'https://images.stockcake.com/public/e/2/e/e2e05460-0afc-457b-85bc-024ba3506507_large/fresh-milk-bottle-stockcake.jpg',
    farmer: 'Heritage Dairy',
    farmLocation: 'Bulawayo, Zimbabwe',
    category: 'dairy-eggs',
    description: 'Pasteurized whole milk from grass-fed cows. Rich and creamy.',
    stock: 40,
    rating: 4.7,
    reviews: 89
  },
  {
    id: '13',
    name: 'Greek Yogurt',
    price: 2.50,
    image: ' https://images.stockcake.com/public/b/3/8/b382080d-a727-495a-af74-463b354c02c4_large/honey-yogurt-swirl-stockcake.jpg',
    farmer: 'Heritage Dairy',
    farmLocation: 'Bulawayo, Zimbabwe',
    category: 'dairy-eggs',
    description: 'Thick, creamy Greek yogurt made from fresh milk.',
    stock: 25,
    rating: 4.8,
    reviews: 112
  },
  {
    id: '14',
    name: 'Cheddar Cheese',
    price: 3.00,
    image: 'https://images.stockcake.com/public/c/f/1/cf16c9ea-226d-42cf-971e-7199bc513398_large/cheese-tower-display-stockcake.jpg',
    farmer: 'Heritage Dairy',
    farmLocation: 'Bulawayo, Zimbabwe',
    category: 'dairy-eggs',
    description: 'Aged cheddar cheese with sharp flavor.',
    stock: 15,
    rating: 4.9,
    reviews: 78
  },
  {
    id: '15',
    name: 'Farm Butter',
    price: 2.00,
    image: 'https://images.stockcake.com/public/6/f/e/6feab08b-41d7-4dc3-a76c-ff9cf4832983_large/golden-butter-block-stockcake.jpg',
    farmer: 'Heritage Dairy',
    farmLocation: 'Bulawayo, Zimbabwe',
    category: 'dairy-eggs',
    description: 'Golden butter from fresh cream. Perfect for baking.',
    stock: 30,
    rating: 4.6,
    reviews: 56
  },
  {
    id: '16',
    name: 'Cottage Cheese',
    price: 2.50,
    image: 'https://images.stockcake.com/public/e/0/7/e0726bbb-4b40-45f8-83b8-77926a695c6c_large/gourmet-cheese-board-stockcake.jpg',
    farmer: 'Heritage Dairy',
    farmLocation: 'Bulawayo, Zimbabwe',
    category: 'dairy-eggs',
    description: 'Fresh cottage cheese, high in protein.',
    stock: 20,
    rating: 4.5,
    reviews: 43
  },

  // Herb Garden Paradise Products
  {
    id: '17',
    name: 'Fresh Basil',
    price: 0.50,
    image: ' https://images.stockcake.com/public/8/0/5/80598e15-c3fa-41d9-8364-af8f8429a9be_large/fresh-herb-assortment-stockcake.jpg',
    farmer: 'Herb Garden Paradise',
    farmLocation: 'Harare, Zimbabwe',
    category: 'herbs-spices',
    description: 'Aromatic basil leaves, perfect for pesto and Italian dishes.',
    stock: 35,
    rating: 4.7,
    reviews: 67
  },
  {
    id: '18',
    name: 'Rosemary',
    price: 1.00,
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRimaQrC2F7HpykddHUjhW__HzFlw0gsPj8100jxcBSUw&s=10',
    farmer: 'Herb Garden Paradise',
    farmLocation: 'Harare, Zimbabwe',
    category: 'herbs-spices',
    description: 'Fragrant rosemary sprigs, great for roasted meats.',
    stock: 40,
    rating: 4.6,
    reviews: 45
  },
  {
    id: '19',
    name: 'Thyme',
    price: 0.50,
    image: ' https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQAxl5k6VyOZmNg9_hckvJlvoDKaGKQd_0lLhe399uHKYpyk6iyx48lQTdH4CiMUfRTCRfDZh3p8neoq8CIwVn-_0GXTyIGhqbYjs4f8rY&s=10',
    farmer: 'Herb Garden Paradise',
    farmLocation: 'Harare, Zimbabwe',
    category: 'herbs-spices',
    description: 'Earthy thyme leaves, essential for Mediterranean cooking.',
    stock: 45,
    rating: 4.5,
    reviews: 38
  },
  {
    id: '20',
    name: 'Mint',
    price: 2.00,
    image: 'https://www.civilwarmed.org/wp-content/uploads/2021/02/peppermint-1-1024x768.jpg',
    farmer: 'Herb Garden Paradise',
    farmLocation: 'Harare, Zimbabwe',
    category: 'herbs-spices',
    description: 'Refreshing mint leaves, perfect for teas and cocktails.',
    stock: 50,
    rating: 4.8,
    reviews: 89
  },
  {
    id: '21',
    name: 'Parsley',
    price: 1.00,
    image: 'https://cdn.britannica.com/62/193862-050-4A7DBC6F/Parsley.jpg',
    farmer: 'Herb Garden Paradise',
    farmLocation: 'Harare, Zimbabwe',
    category: 'herbs-spices',
    description: 'Fresh parsley, rich in vitamins. Great garnish for dishes.',
    stock: 60,
    rating: 4.4,
    reviews: 34
  },

  // Honey Bee Farms Products
  {
    id: '22',
    name: 'Wildflower Honey',
    price: 1.50,
    image: 'https://images.unsplash.com/photo-1587049352851-8d4e89133924?w=400&h=400&fit=crop&auto=format',
    farmer: 'Honey Bee Farms',
    farmLocation: 'Harare, Zimbabwe',
    category: 'honey-preserves',
    description: 'Pure wildflower honey with complex floral notes.',
    stock: 25,
    rating: 4.9,
    reviews: 145
  },
  {
    id: '23',
    name: 'Acacia Honey',
    price: 2.00,
    image: 'https://cdn.salla.sa/vXxRbz/V8Q9xtQkwhTugmDAS7SJpWtD38uQZ2JTFwaF0bFM.jpg',
    farmer: 'Honey Bee Farms',
    farmLocation: 'Harare, Zimbabwe',
    category: 'honey-preserves',
    description: 'Light and sweet acacia honey, perfect for tea.',
    stock: 20,
    rating: 4.8,
    reviews: 98
  },
  {
    id: '24',
    name: 'Mango Jam',
    price: 2.50,
    image: 'https://smithakalluraya.com/wp-content/uploads/2019/07/indian-mango-jam.jpg',
    farmer: 'Honey Bee Farms',
    farmLocation: 'Harare, Zimbabwe',
    category: 'honey-preserves',
    description: 'Homemade mango jam with chunks of real fruit.',
    stock: 30,
    rating: 4.7,
    reviews: 76
  },
  {
    id: '25',
    name: 'Strawberry Preserves',
    price: 3.00,
    image: 'https://images.stockcake.com/public/d/a/6/da6583b1-7f83-4a1a-998c-39bfdadef285_large/homemade-strawberry-jam-stockcake.jpg',
    farmer: 'Honey Bee Farms',
    farmLocation: 'Harare, Zimbabwe',
    category: 'honey-preserves',
    description: 'Sweet strawberry preserves made with locally grown berries.',
    stock: 35,
    rating: 4.6,
    reviews: 62
  },
  {
    id: '26',
    name: 'Beeswax Candles',
    price: 1.00,
    image: 'https://teaandtableny.com/cdn/shop/files/67EB30AF-0B3F-492C-8F7A-B055ED1213EB.jpg?v=1709655162',
    farmer: 'Honey Bee Farms',
    farmLocation: 'Harare, Zimbabwe',
    category: 'honey-preserves',
    description: 'Natural beeswax candles, clean burning with subtle honey scent.',
    stock: 40,
    rating: 4.5,
    reviews: 48
  },

  // Additional Products
  {
    id: '27',
    name: 'Brown Rice',
    price: 3.50,
    image: ' https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRntVu9b3muw-ZUkn4daTUUH7loP0iCwt_YM06V-rN1ugB-r2X5Hlw_K6-L&s=10',
    farmer: 'Green Valley Farm',
    farmLocation: 'Harare, Zimbabwe',
    category: 'grains-cereals',
    description: 'Organic brown rice, rich in fiber and nutrients.',
    stock: 50,
    rating: 4.4,
    reviews: 56
  },
  {
    id: '28',
    name: 'Whole Wheat Flour',
    price: 2.75,
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop&auto=format',
    farmer: 'Green Valley Farm',
    farmLocation: 'Harare, Zimbabwe',
    category: 'grains-cereals',
    description: 'Stone-ground whole wheat flour for healthy baking.',
    stock: 40,
    rating: 4.3,
    reviews: 42
  },
  {
    id: '29',
    name: 'Quinoa',
    price: 2.35,
    image: 'https://www.fodmapeveryday.com/wp-content/uploads/2017/04/raw-quinoa-closeup-copy-855x570.jpg',
    farmer: 'Sunrise Orchard',
    farmLocation: 'Harare, Zimbabwe',
    category: 'grains-cereals',
    description: 'High-protein quinoa grains, perfect for healthy meals.',
    stock: 25,
    rating: 4.7,
    reviews: 89
  },
  {
    id: '30',
    name: 'Sweet Potatoes',
    price: 1.00,
    image: 'https://newsmeter.in/h-upload/2026/02/17/424006-pexels-marceloverfe-13059602.jpg',
    farmer: 'Green Valley Farm',
    farmLocation: 'Harare, Zimbabwe',
    category: 'vegetables',
    description: 'Nutritious sweet potatoes, rich in vitamin A and fiber.',
    stock: 70,
    rating: 4.5,
    reviews: 78
  },
  {
    id: '31',
    name: 'Fresh Corn',
    price: 1.50,
    image: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=400&h=400&fit=crop&auto=format',
    farmer: 'Green Valley Farm',
    farmLocation: 'Harare, Zimbabwe',
    category: 'vegetables',
    description: 'Sweet corn on the cob, perfect for grilling or boiling.',
    stock: 60,
    rating: 4.6,
    reviews: 92
  }
];
