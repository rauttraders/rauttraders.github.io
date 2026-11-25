import type { Product } from '../types'

type Seed = [name: string, company: string, category: string, sizes: [size: string, price: number][]]

// Sample catalogue (prices are placeholders). Replaced by the admin/API later.
const seeds: Seed[] = [
  ['Good Day Butter Cookies', 'britannia', 'biscuits', [['60 g', 10], ['120 g', 20], ['250 g', 40]]],
  ['Marie Gold', 'britannia', 'biscuits', [['100 g', 10], ['250 g', 30], ['600 g', 60]]],
  ['Tiger Glucose', 'britannia', 'biscuits', [['80 g', 10], ['200 g', 25]]],
  ['Bourbon', 'britannia', 'biscuits', [['100 g', 20], ['150 g', 35]]],
  ['50-50 Maska Chaska', 'britannia', 'biscuits', [['70 g', 10], ['120 g', 20]]],
  ['Bread Sandwich', 'britannia', 'staples', [['400 g', 45]]],
  ['Parle-G', 'parle', 'biscuits', [['56 g', 5], ['130 g', 10], ['800 g', 80]]],
  ['Hide & Seek', 'parle', 'biscuits', [['100 g', 30], ['200 g', 55]]],
  ['Monaco', 'parle', 'biscuits', [['63 g', 10], ['150 g', 25]]],
  ['Krackjack', 'parle', 'biscuits', [['60 g', 10], ['200 g', 30]]],
  ['Wafers Tomato', 'parle', 'snacks', [['30 g', 10], ['75 g', 20]]],
  ['Frooti', 'parle', 'beverages', [['160 ml', 10], ['600 ml', 40], ['1.2 L', 70]]],
  ['Aashirvaad Atta', 'itc', 'staples', [['1 kg', 55], ['5 kg', 260], ['10 kg', 510]]],
  ['Bingo Mad Angles', 'itc', 'snacks', [['35 g', 10], ['72 g', 20], ['130 g', 40]]],
  ['Sunfeast Dark Fantasy', 'itc', 'biscuits', [['75 g', 40], ['300 g', 150]]],
  ['Yippee Noodles', 'itc', 'staples', [['60 g', 14], ['280 g', 60]]],
  ['Fiama Shower Gel', 'itc', 'personal-care', [['250 ml', 220], ['500 ml', 400]]],
  ['Surf Excel Easy Wash', 'hul', 'home-care', [['500 g', 110], ['1 kg', 210], ['2 kg', 400]]],
  ['Lifebuoy Soap', 'hul', 'personal-care', [['56 g', 10], ['125 g', 32], ['4 x 125 g', 120]]],
  ['Dove Shampoo', 'hul', 'personal-care', [['180 ml', 190], ['340 ml', 330]]],
  ['Vim Dishwash Gel', 'hul', 'home-care', [['250 ml', 55], ['500 ml', 105], ['1 L', 190]]],
  ['Brooke Bond Red Label', 'hul', 'beverages', [['250 g', 120], ['500 g', 235], ['1 kg', 455]]],
  ['Patanjali Atta', 'patanjali', 'staples', [['1 kg', 48], ['5 kg', 235]]],
  ['Dant Kanti Toothpaste', 'patanjali', 'personal-care', [['100 g', 60], ['200 g', 110]]],
  ['Cow Ghee', 'patanjali', 'dairy', [['200 ml', 140], ['500 ml', 330], ['1 L', 650]]],
  ['Honey', 'patanjali', 'staples', [['250 g', 110], ['500 g', 200]]],
  ['Aloe Vera Gel', 'patanjali', 'personal-care', [['150 ml', 85], ['300 ml', 150]]],
  ['Maggi 2-Minute Noodles', 'nestle', 'staples', [['70 g', 14], ['280 g', 56], ['560 g', 108]]],
  ['Nescafé Classic', 'nestle', 'beverages', [['25 g', 85], ['50 g', 160], ['100 g', 300]]],
  ['KitKat', 'nestle', 'snacks', [['19 g', 10], ['37 g', 20]]],
  ['Dabur Chyawanprash', 'dabur', 'staples', [['500 g', 250], ['1 kg', 440]]],
  ['Real Fruit Juice Mango', 'dabur', 'beverages', [['200 ml', 20], ['1 L', 110]]],
  ['Red Toothpaste', 'dabur', 'personal-care', [['100 g', 70], ['200 g', 125]]],
  ['Amul Butter', 'amul', 'dairy', [['100 g', 58], ['500 g', 285]]],
  ['Amul Taaza Milk', 'amul', 'dairy', [['500 ml', 29], ['1 L', 56]]],
  ['Amul Cheese Slices', 'amul', 'dairy', [['100 g', 70], ['200 g', 135]]],
  ['Amul Kool Flavoured Milk', 'amul', 'beverages', [['200 ml', 25], ['1 L', 120]]],
]

export const products: Product[] = seeds.flatMap(([name, companyId, categoryId, sizes]) =>
  sizes.map(([size, price]) => ({
    id: `${companyId}-${name}-${size}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name,
    companyId,
    categoryId,
    price,
    size,
  })),
)
