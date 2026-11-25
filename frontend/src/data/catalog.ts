import type { Product } from '../types'
import { categories, companies } from './companies'
import { products } from './products'

// Single data-access point. Swap these for API calls when a backend exists.
export const getCompanies = () => companies
export const getCategories = () => categories
export const getCompany = (id: string) => companies.find((c) => c.id === id)
export const getCategory = (id: string) => categories.find((c) => c.id === id)

const byId = new Map(products.map((p) => [p.id, p]))
export const getProduct = (id: string): Product | undefined => byId.get(id)

export interface ProductFilter {
  company?: string | null
  category?: string | null
  q?: string | null
}

export function queryProducts({ company, category, q }: ProductFilter): Product[] {
  const term = q?.trim().toLowerCase()
  return products.filter(
    (p) =>
      (!company || p.companyId === company) &&
      (!category || p.categoryId === category) &&
      (!term || `${p.name} ${p.size}`.toLowerCase().includes(term) || getCompany(p.companyId)?.name.toLowerCase().includes(term)),
  )
}

export const countByCompany = (id: string) => products.filter((p) => p.companyId === id).length
