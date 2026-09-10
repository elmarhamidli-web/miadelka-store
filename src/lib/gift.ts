/* ------------------------------------------------------------------ */
/* Gift vouchers — delivery mode                                       */
/*                                                                     */
/* A voucher has no size, so the cart line's `size` slot carries how it */
/* is delivered: 'online' (e-mailed code) or 'physical' (card sent by   */
/* post). That keeps one line per mode in the cart, in the order and on */
/* the invoice without a parallel data path.                            */
/* ------------------------------------------------------------------ */

export type GiftDelivery = 'online' | 'physical'

interface Giftish {
  isGiftCard?: boolean
  giftDelivery?: 'online' | 'physical' | 'both'
}

/** Delivery modes the shop offers for this voucher. */
export function giftModes(p: Giftish | null | undefined): GiftDelivery[] {
  const mode = p?.giftDelivery ?? 'online'
  return mode === 'both' ? ['online', 'physical'] : [mode]
}

/** The mode used when the customer has not picked one (quick-add). */
export function defaultGiftMode(p: Giftish | null | undefined): GiftDelivery {
  return giftModes(p)[0]
}

/** True for a cart line that has to be physically shipped. */
export function isPhysicalGift(item: {
  product: Giftish
  size: string
}): boolean {
  return item.product.isGiftCard === true && item.size === 'physical'
}

/** True when nothing in the basket needs a carrier. */
export function isEmailOnlyBasket(
  items: { product: Giftish; size: string }[],
): boolean {
  return (
    items.length > 0 &&
    items.every((i) => i.product.isGiftCard === true && i.size !== 'physical')
  )
}
