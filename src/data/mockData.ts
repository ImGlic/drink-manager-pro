
// Mock data for demonstration

export const mockProducts = [
  {
    id: "1",
    name: "Whisky Black Label 750ml",
    category: "Destilados",
    currentStock: 15,
    minimumStock: 10,
    price: 129.9,
  },
  {
    id: "2",
    name: "Vodka Absolut 1L",
    category: "Destilados",
    currentStock: 8,
    minimumStock: 12,
    price: 89.9,
  },
  {
    id: "3",
    name: "Vinho Tinto Chileno Reservado 750ml",
    category: "Vinhos",
    currentStock: 5,
    minimumStock: 8,
    price: 49.9,
  },
  {
    id: "4",
    name: "Cerveja Heineken 350ml",
    category: "Cervejas",
    currentStock: 150,
    minimumStock: 100,
    price: 5.49,
  },
  {
    id: "5",
    name: "Gin Tanqueray 750ml",
    category: "Destilados",
    currentStock: 12,
    minimumStock: 10,
    price: 119.9,
  },
  {
    id: "6",
    name: "Rum Bacardi Carta Blanca 980ml",
    category: "Destilados",
    currentStock: 7,
    minimumStock: 15,
    price: 59.9,
  },
  {
    id: "7",
    name: "Cerveja Stella Artois 550ml",
    category: "Cervejas",
    currentStock: 56,
    minimumStock: 60,
    price: 7.9,
  },
  {
    id: "8",
    name: "Cachaça Sagatiba 700ml",
    category: "Destilados",
    currentStock: 20,
    minimumStock: 15,
    price: 34.9,
  },
  {
    id: "9",
    name: "Tequila José Cuervo 750ml",
    category: "Destilados",
    currentStock: 9,
    minimumStock: 10,
    price: 89.9,
  },
  {
    id: "10",
    name: "Champagne Chandon Brut 750ml",
    category: "Espumantes",
    currentStock: 13,
    minimumStock: 12,
    price: 99.9,
  },
];

export const mockSales = [
  {
    id: "s1",
    customer: "João Silva",
    date: new Date(2023, 10, 20, 14, 30),
    totalAmount: 285.7,
    items: [
      {
        id: "i1",
        product: "Whisky Black Label 750ml",
        quantity: 2,
        price: 129.9,
      },
      {
        id: "i2",
        product: "Cerveja Heineken 350ml",
        quantity: 5,
        price: 5.49,
      },
    ],
  },
  {
    id: "s2",
    customer: "Maria Oliveira",
    date: new Date(2023, 10, 20, 10, 15),
    totalAmount: 149.8,
    items: [
      {
        id: "i3",
        product: "Vinho Tinto Chileno Reservado 750ml",
        quantity: 3,
        price: 49.9,
      },
    ],
  },
  {
    id: "s3",
    customer: "Carlos Mendes",
    date: new Date(2023, 10, 19, 16, 45),
    totalAmount: 209.8,
    items: [
      {
        id: "i4",
        product: "Gin Tanqueray 750ml",
        quantity: 1,
        price: 119.9,
      },
      {
        id: "i5",
        product: "Vodka Absolut 1L",
        quantity: 1,
        price: 89.9,
      },
    ],
  },
  {
    id: "s4",
    customer: "Ana Costa",
    date: new Date(2023, 10, 19, 10, 30),
    totalAmount: 105.7,
    items: [
      {
        id: "i6",
        product: "Champagne Chandon Brut 750ml",
        quantity: 1,
        price: 99.9,
      },
      {
        id: "i7",
        product: "Cerveja Stella Artois 550ml",
        quantity: 1,
        price: 7.9,
      },
    ],
  },
  {
    id: "s5",
    customer: "Pedro Alves",
    date: new Date(2023, 10, 18, 19, 20),
    totalAmount: 189.8,
    items: [
      {
        id: "i8",
        product: "Tequila José Cuervo 750ml",
        quantity: 1,
        price: 89.9,
      },
      {
        id: "i9",
        product: "Vodka Absolut 1L",
        quantity: 1,
        price: 89.9,
      },
      {
        id: "i10",
        product: "Cerveja Heineken 350ml",
        quantity: 2,
        price: 5.49,
      },
    ],
  },
];

// Summary data for dashboard
export const salesSummary = {
  totalSales: 12580.45,
  salesCount: 124,
  averageTicket: 101.45,
  topProduct: "Whisky Black Label 750ml",
};

export const stockSummary = {
  totalProducts: 42,
  totalValue: 45320.78,
  lowStockCount: 8,
  categories: 6,
};

export const financialSummary = {
  revenue: 12580.45,
  costs: 8650.32,
  profit: 3930.13,
  margin: 31.24,
};
