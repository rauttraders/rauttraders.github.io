export interface Company {
  id: string
  name: string
  image?: string
}

export interface Category {
  id: string
  name: string
}

export interface Product {
  id: string
  name: string
  companyId: string
  categoryId: string
  /** MRP in INR */
  price: number
  /** e.g. "200 g", "1 L" */
  size: string
  image?: string
}

export interface Customer {
  name: string
  shopName: string
  phone: string
}

export interface CartLine {
  product: Product
  qty: number
}
