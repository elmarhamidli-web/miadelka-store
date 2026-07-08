export type Locale = 'cs' | 'en' | 'uk'

export interface PluralForms {
  one: string
  few: string
  many: string
}

export interface Dictionary {
  localeName: string
  flag: string
  currency: {
    symbol: string
    rate: number
    position: 'before' | 'after'
    thousand: string
  }
  ui: {
    announce: string
    search: { placeholder: string; submit: string; aria: string }
    nav: {
      menuOpen: string
      menuClose: string
      wishlist: string
      cartOpen: string
      cartClose: string
      language: string
    }
    hero: {
      pill: string
      titleLine1: string
      titleAccent: string
      titleLine2: string
      sub: string
      shop: string
      explore: string
      stat1: string
      stat1Label: string
      stat2: string
      stat2Label: string
      stat3: string
      stat3Label: string
      shipping: string
      bestsellerTag: string
    }
    categoriesSection: { eyebrow: string; title: string; sub: string }
    featured: { eyebrow: string; title: string; sub: string }
    bestsellers: { eyebrow: string; title: string; sub: string }
    seasonal: { eyebrow: string; title: string; sub: string }
    viewAll: string
    promo: {
      tag: string
      titleA: string
      titleHighlight: string
      sub: string
      cta: string
      days: string
      hrs: string
      min: string
      sec: string
    }
    benefits: {
      organic: { title: string; text: string }
      delivery: { title: string; text: string }
      returns: { title: string; text: string }
      payment: { title: string; text: string }
    }
    reviewsSection: { eyebrow: string; title: string; sub: string }
    review: {
      formTitle: string
      formIntro: string
      nameLabel: string
      textPlaceholder: string
      submit: string
      thanksTitle: string
      thanksSub: string
      alreadyTitle: string
      alreadySub: string
      invalidTitle: string
      invalidSub: string
      errorGeneric: string
      productHeading: string
      verified: string
    }
    newsletter: {
      title: string
      sub: string
      placeholder: string
      cta: string
      done: string
      fine: string
      toast: string
    }
    shop: {
      eyebrow: string
      titleAll: string
      resultsFor: string
      countTail: string
      pieces: PluralForms
      filters: string
      clearAll: string
      all: string
      category: string
      size: string
      colour: string
      age: string
      maxPrice: string
      sort: string
      sortFeatured: string
      sortPriceAsc: string
      sortPriceDesc: string
      sortRating: string
      emptyTitle: string
      emptySub: string
      reset: string
    }
    card: { view: string; addAria: string; wishAdd: string; wishRemove: string; outOfStock: string }
    badges: Record<string, string>
    cart: {
      title: string
      addMore: string
      freeUnlocked: string
      emptyTitle: string
      emptySub: string
      continue: string
      subtotal: string
      shipping: string
      shippingFree: string
      total: string
      note: string
      checkout: string
      clear: string
      checkoutToast: string
      sizeLabel: string
      decrease: string
      increase: string
      remove: string
    }
    product: {
      back: string
      reviews: string
      save: string
      colour: string
      size: string
      quantity: string
      addToCart: string
      deliveryInfo: string
      returnsInfo: string
      similar: string
      notFoundTitle: string
      notFoundSub: string
      backHome: string
    }
    checkout: {
      title: string
      contact: string
      name: string
      email: string
      phone: string
      shippingAddr: string
      street: string
      city: string
      zip: string
      note: string
      payment: string
      cod: string
      codNote: string
      card: string
      cardSoon: string
      cardNote: string
      payNow: string
      canceled: string
      successPaid: string
      summary: string
      placeOrder: string
      placing: string
      successTitle: string
      successSub: string
      backToShop: string
      errorGeneric: string
      emptyCart: string
      promoTitle: string
      promoPlaceholder: string
      promoApply: string
      promoRemove: string
      promoDiscount: string
      promoGift: string
      promoInvalid: string
      promoExpired: string
      promoExhausted: string
      promoMin: string
      promoEmpty: string
      promoAlready: string
    }
    footer: {
      tagline: string
      contactTitle: string
      contact: string[]
      companyTitle: string
      company: string[]
      secure: string
      rights: string
      credit: string
      instagramAria: string
      columns: { title: string; links: { label: string; to: string }[] }[]
    }
    pages: {
      back: string
      termsTitle: string
      termsNote: string
      sizeTitle: string
      sizeIntro: string
      sizeColAge: string
      sizeColHeight: string
      sizeTip: string
      sizeRows: [string, string][]
      shipTitle: string
      shipSections: { h: string; ps: string[] }[]
      contactTitle: string
      contactIntro: string
      contactRows: { label: string; value: string; href?: string }[]
    }
    toast: { added: string; wishOn: string; wishOff: string }
    colors: Record<string, string>
  }
  categories: Record<string, { name: string; tagline: string }>
  products: Record<string, { name: string; description: string; material: string }>
  reviews: Record<string, { location: string; text: string }>
}
