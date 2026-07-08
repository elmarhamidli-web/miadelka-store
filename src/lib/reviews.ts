import { supabase } from './supabase'

export interface ReviewRow {
  id: string
  product_id: string
  author: string
  location: string | null
  rating: number
  text: string
  created_at: string
}

/** Approved reviews (RLS only exposes status=approved to visitors). */
export async function fetchApprovedReviews(productId?: string, limit = 12): Promise<ReviewRow[]> {
  if (!supabase) return []
  let q = supabase
    .from('reviews')
    .select('id,product_id,author,location,rating,text,created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (productId) q = q.eq('product_id', productId)
  const { data, error } = await q
  return error || !data ? [] : (data as ReviewRow[])
}
