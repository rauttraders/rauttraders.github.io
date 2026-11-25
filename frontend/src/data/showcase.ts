// DEMO DATA — sample listings for the storefront UI only. Names come from the brands in
// /assets/companies and /assets/products; descriptions and prices are placeholders and
// must be replaced by real catalogue / API data before going live.
import britannia from '../assets/products/britaniya.png'
import gopal from '../assets/products/gopal.png'
import mamypoko from '../assets/products/mamypoko.png'
import pushp from '../assets/products/pushp.png'

const logoFiles = import.meta.glob('../assets/companies/*.png', { eager: true, import: 'default' }) as Record<string, string>
const logo = (file: string) => logoFiles[`../assets/companies/${file}.png`]

export interface ShowcaseCategory {
  id: string
  name: string
}

export interface ShowcaseProduct {
  id: string
  name: string
  company: string
  categoryId: string
  description: string
  /** Pack size, e.g. "70 g" */
  size: string
  /** Sample price in INR (demo only). */
  price: number
  /** Optional struck-through original price; only set when a real offer exists. */
  mrp?: number
  /** Product photo when available, otherwise the company logo is shown. */
  image: string
  /** True when `image` is a company logo rather than a product photo. */
  isLogo?: boolean
}

export const IS_DEMO_DATA = true

export const showcaseCategories: ShowcaseCategory[] = [
  { id: 'biscuits', name: 'Biscuits & Cookies' },
  { id: 'snacks', name: 'Snacks & Namkeen' },
  { id: 'confectionery', name: 'Confectionery' },
  { id: 'staples', name: 'Staples & Spices' },
  { id: 'home-care', name: 'Home Care' },
  { id: 'baby-care', name: 'Baby Care' },
]

export const showcaseProducts: ShowcaseProduct[] = [
  { id: 'britannia-50-50', name: '50-50 Sweet & Salty', company: 'Britannia', categoryId: 'biscuits', description: 'Crisp sweet-and-salty biscuits, a counter-top favourite for everyday snacking.', size: '70 g', price: 10, image: britannia },
  { id: 'gopal-shakkarpara', name: 'Shakkarpara Namkeen', company: 'Gopal Namkeen', categoryId: 'snacks', description: 'Crunchy, lightly sweetened diamond-cut snack, ready to retail in family packs.', size: '200 g', price: 40, image: gopal },
  { id: 'mamypoko-pants-nb', name: 'MamyPoko Pants – Newborn', company: 'MamyPoko', categoryId: 'baby-care', description: 'Soft pant-style diapers with all-night absorption for newborns.', size: '64 pants', price: 599, image: mamypoko },
  { id: 'pushp-pani-puri', name: 'Pani Puri Masala', company: 'Pushp Brand', categoryId: 'staples', description: 'Tangy pani puri masala blend for quick, flavourful golgappa water.', size: '500 g', price: 110, image: pushp },
  { id: 'lotte-choco-pie', name: 'Choco Pie', company: 'Lotte', categoryId: 'biscuits', description: 'Soft cake layers with a marshmallow filling, coated in chocolate.', size: '6 pcs', price: 120, image: logo('Lotte'), isLogo: true },
  { id: 'sunder-snacks', name: 'Snack Range', company: 'Sunder', categoryId: 'snacks', description: 'Sample listing — replace with the actual Sunder product lines.', size: '1 pack', price: 10, image: logo('Sunder'), isLogo: true },
  { id: 'boomer-bubble-gum', name: 'Boomer Bubble Gum', company: 'Boomer', categoryId: 'confectionery', description: 'Chewy bubble gum with long-lasting flavour, a fast-moving counter item.', size: '1 pc', price: 2, image: logo('Boomer'), isLogo: true },
  { id: 'mayora-kopiko', name: 'Kopiko Coffee Candy', company: 'Mayora', categoryId: 'confectionery', description: 'Rich coffee-flavoured hard candy, a popular billing-counter pick.', size: '175 g', price: 90, image: logo('Mayora'), isLogo: true },
  { id: 'ds-catch-spices', name: 'Catch Spices', company: 'DS Group', categoryId: 'staples', description: 'Pure ground spices and blends for everyday cooking.', size: '100 g', price: 55, image: logo('DS_Group'), isLogo: true },
  { id: 'nilons-pickle', name: "Nilon's Mango Pickle", company: "Nilon's", categoryId: 'staples', description: 'Traditional-style pickle with a balanced tangy and spicy taste.', size: '400 g', price: 95, image: logo('Nilons'), isLogo: true },
  { id: 'patanjali-atta', name: 'Patanjali Atta', company: 'Patanjali', categoryId: 'staples', description: 'Whole wheat flour for soft rotis, packed for household use.', size: '5 kg', price: 235, image: logo('Patanjali'), isLogo: true },
  { id: 'jyothy-henko', name: 'Henko Detergent Powder', company: 'Jyothy Labs', categoryId: 'home-care', description: 'Stain-fighting detergent powder for everyday laundry.', size: '1 kg', price: 120, image: logo('Jyothy_Labs'), isLogo: true },
]

// Single access point — swap for an API call later.
export function queryShowcase(categoryId: string | null, q: string): ShowcaseProduct[] {
  const term = q.trim().toLowerCase()
  return showcaseProducts.filter(
    (p) =>
      (!categoryId || p.categoryId === categoryId) &&
      (!term || `${p.name} ${p.company} ${p.description}`.toLowerCase().includes(term)),
  )
}
