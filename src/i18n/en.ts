import type { Dictionary } from './types'

export const en: Dictionary = {
  localeName: 'English',
  flag: '🇬🇧',
  currency: { symbol: '$', rate: 1, position: 'before', thousand: ',' },
  ui: {
    announce: '✨ Free carbon-neutral delivery over $60 · Easy 30-day returns ✨',
    search: {
      placeholder: 'Search for hoodies, dresses, sneakers…',
      submit: 'Search',
      aria: 'Search',
    },
    nav: {
      menuOpen: 'Open menu',
      menuClose: 'Close menu',
      wishlist: 'Wishlist',
      cartOpen: 'Open cart',
      cartClose: 'Close cart',
      language: 'Language',
    },
    hero: {
      pill: '🌿 New Spring Collection 2026',
      titleLine1: 'Soft, safe & seriously',
      titleAccent: 'stylish',
      titleLine2: 'little outfits',
      sub: 'Premium organic-cotton clothing designed for tiny adventurers — gentle on delicate skin, kind to the planet, and made to be loved (and handed down).',
      shop: 'Shop New Collection',
      explore: 'Explore Categories',
      stat1: '50k+',
      stat1Label: 'Happy families',
      stat2: '4.9★',
      stat2Label: '12k reviews',
      stat3: '100%',
      stat3Label: 'Organic cotton',
      shipping: 'Free fast delivery',
      bestsellerTag: 'Bestseller',
    },
    categoriesSection: {
      eyebrow: 'Shop by category',
      title: 'Find their new favourite',
      sub: 'From first cuddles to playground heroes — curated edits for every age and stage.',
    },
    featured: {
      eyebrow: 'Handpicked for you',
      title: 'Featured favourites',
      sub: 'The pieces parents keep coming back for — soft, durable and effortlessly cute.',
    },
    bestsellers: {
      eyebrow: 'Crowd pleasers',
      title: "This week's best sellers",
      sub: 'Loved by thousands of little ones and their grown-ups.',
    },
    seasonal: {
      eyebrow: 'Spring 2026',
      title: 'The seasonal collection',
      sub: 'Breezy layers and sun-ready styles for warmer days ahead.',
    },
    viewAll: 'View all',
    promo: {
      tag: 'Limited time',
      titleA: 'New Spring Collection',
      titleHighlight: 'up to 30% off',
      sub: 'Fresh pastels, breezy cottons and pieces made to twirl in. Bloom into the new season with TinyMode Kids.',
      cta: 'Shop the sale',
      days: 'days',
      hrs: 'hrs',
      min: 'min',
      sec: 'sec',
    },
    benefits: {
      organic: {
        title: 'Organic Cotton',
        text: 'GOTS-certified, pesticide-free fibres that are gentle on delicate skin.',
      },
      delivery: {
        title: 'Fast Delivery',
        text: 'Carbon-neutral shipping in 2–4 days, free on orders over $60.',
      },
      returns: {
        title: 'Easy Returns',
        text: 'Changed your mind? Enjoy a relaxed, no-questions 30-day return window.',
      },
      payment: {
        title: 'Safe Payment',
        text: 'Bank-level encryption and trusted checkout you can rely on.',
      },
    },
    reviewsSection: {
      eyebrow: 'Loved by parents',
      title: '50,000+ happy little customers',
      sub: 'Real words from the families who dress their tiny humans in TinyMode.',
    },
    newsletter: {
      title: 'Join the TinyMode family',
      sub: 'Get 10% off your first order plus early access to new drops, parenting tips and pastel-perfect inspiration.',
      placeholder: 'you@email.com',
      cta: 'Get 10% off',
      done: 'Subscribed ✓',
      fine: "No spam, ever. Unsubscribe anytime. It's a prototype 🙂",
      toast: 'Welcome to the family! Check your inbox 💌',
    },
    shop: {
      eyebrow: 'Shop all',
      titleAll: 'The full collection',
      resultsFor: 'Results for',
      countTail: 'crafted for comfy, confident little ones.',
      pieces: { one: 'piece', few: 'pieces', many: 'pieces' },
      filters: 'Filters',
      clearAll: 'Clear all',
      all: 'All',
      category: 'Category',
      size: 'Size',
      colour: 'Colour',
      age: 'Age',
      maxPrice: 'Max price',
      sort: 'Sort',
      sortFeatured: 'Featured',
      sortPriceAsc: 'Price: Low to High',
      sortPriceDesc: 'Price: High to Low',
      sortRating: 'Top rated',
      emptyTitle: 'No matches just yet',
      emptySub: 'Try clearing a filter or two.',
      reset: 'Reset filters',
    },
    card: {
      view: 'View product',
      addAria: 'Add {name} to cart',
      wishAdd: 'Add to wishlist',
      wishRemove: 'Remove from wishlist',
    },
    badges: { Bestseller: 'Bestseller', New: 'New' },
    cart: {
      title: 'Your cart',
      addMore: 'Add {amount} more for free shipping 🚚',
      freeUnlocked: "🎉 You've unlocked free shipping!",
      emptyTitle: 'Your cart is feeling light',
      emptySub: 'Add some adorable pieces to get started.',
      continue: 'Continue shopping',
      subtotal: 'Subtotal',
      note: 'Shipping & taxes calculated at checkout.',
      checkout: 'Checkout',
      clear: 'Clear cart',
      checkoutToast: 'Checkout is a prototype — nothing was charged 💖',
      sizeLabel: 'Size',
      decrease: 'Decrease quantity',
      increase: 'Increase quantity',
      remove: 'Remove',
    },
    product: {
      back: 'Back to collection',
      reviews: 'reviews',
      save: 'Save {amount}',
      colour: 'Colour',
      size: 'Size',
      quantity: 'Quantity',
      addToCart: 'Add to cart',
      deliveryInfo: 'Free delivery over $60 · ships in 2–4 days',
      returnsInfo: 'Easy 30-day returns & exchanges',
      similar: 'You may also like',
      notFoundTitle: 'Product not found',
      notFoundSub: "We couldn't find this piece.",
      backHome: 'Back to home',
    },
    footer: {
      tagline:
        'Premium, planet-friendly clothing for tiny adventurers. Designed with love, made to be handed down.',
      contactTitle: 'Get in touch',
      contact: ['✉️ hello@tinymode.kids', '📞 +1 (800) 555-0142', '📍 14 Maple Lane, Portland, OR'],
      secure: '🔒 Secure checkout',
      rights: '© 2026 TinyMode Kids — a design prototype. All rights reserved.',
      columns: [
        {
          title: 'Shop',
          links: ['New Collection', 'Baby', 'Girls', 'Boys', 'Shoes', 'Accessories'],
        },
        {
          title: 'Help',
          links: ['Size Guide', 'Shipping', 'Returns & Exchanges', 'Track Order', 'Contact Us'],
        },
        {
          title: 'Company',
          links: ['Our Story', 'Sustainability', 'Careers', 'Press', 'Stores'],
        },
      ],
    },
    toast: {
      added: '{name} added to cart',
      wishOn: 'Saved to wishlist',
      wishOff: 'Removed from wishlist',
    },
    colors: {},
  },
  categories: {
    baby: { name: 'Baby', tagline: '0 – 24 months' },
    girls: { name: 'Girls', tagline: '2 – 12 years' },
    boys: { name: 'Boys', tagline: '2 – 12 years' },
    shoes: { name: 'Shoes', tagline: 'Tiny steps' },
    accessories: { name: 'Accessories', tagline: 'Finishing touches' },
    'new-collection': { name: 'New Collection', tagline: 'Fresh arrivals' },
  },
  products: {
    'soft-cotton-baby-set': {
      name: 'Soft Cotton Baby Set',
      description:
        'A buttery-soft two-piece set spun from GOTS-certified organic cotton. Gentle flat seams and a wide envelope neck make dressing wriggly little ones effortless.',
      material: '100% organic cotton, 230 gsm interlock knit',
    },
    'rainbow-hoodie': {
      name: 'Rainbow Hoodie',
      description:
        'A cosy brushed-fleece hoodie with a cheerful rainbow appliqué, kangaroo pocket and soft jersey-lined hood. Designed to layer over everything.',
      material: '85% organic cotton, 15% recycled polyester fleece',
    },
    'little-explorer-jacket': {
      name: 'Little Explorer Jacket',
      description:
        'A water-repellent puffer built for puddle-jumping adventures. Fleece-lined pockets, reflective trims and a packable hood keep explorers warm and seen.',
      material: 'Recycled polyester shell, responsibly-sourced down-free padding',
    },
    'cozy-kids-pajamas': {
      name: 'Cozy Kids Pajamas',
      description:
        'Dreamy long-sleeve pyjamas in whisper-soft cotton with a starry print and snug ribbed cuffs. OEKO-TEX certified for sensitive skin.',
      material: '95% organic cotton, 5% elastane rib',
    },
    'organic-cotton-tshirt': {
      name: 'Organic Cotton T-Shirt',
      description:
        'The everyday hero tee. Pre-washed for zero shrink, with a relaxed fit and a tagless neck that never itches.',
      material: '100% organic combed cotton, 180 gsm',
    },
    'mini-sneakers': {
      name: 'Mini Sneakers',
      description:
        'Featherlight first sneakers with a flexible sole, easy double-strap closure and breathable mesh. Made to keep up with busy little feet.',
      material: 'Recycled mesh upper, natural rubber outsole',
    },
    'summer-dress': {
      name: 'Summer Dress',
      description:
        'A twirl-worthy tiered dress in airy cotton voile with a hidden bloomer for comfy play. Lined bodice and adjustable shoulder ties.',
      material: '100% organic cotton voile, lined bodice',
    },
    'warm-winter-coat': {
      name: 'Warm Winter Coat',
      description:
        'Toasty thermal coat with a sherpa-lined hood, fold-over mittens for the littlest sizes and a wind-blocking storm flap. Rated for real winters.',
      material: 'Recycled polyester, thermal wadding, sherpa lining',
    },
    'sunshine-bucket-hat': {
      name: 'Sunshine Bucket Hat',
      description:
        'A reversible UPF 50+ bucket hat with a chin toggle that stays put on windy days. Two looks in one for double the fun.',
      material: '100% organic cotton twill, UPF 50+',
    },
    'cuddle-knit-cardigan': {
      name: 'Cuddle Knit Cardigan',
      description:
        'A heirloom-soft chunky-knit cardigan with wooden buttons and a relaxed boxy fit that layers beautifully all year round.',
      material: 'Organic cotton & bamboo blend knit',
    },
    'star-stripe-socks': {
      name: 'Star & Stripe Socks',
      description:
        'A joyful 5-pack of grippy-sole socks in mix-and-match stars and stripes. Seamless toes keep tiny piggies happy.',
      material: 'Organic cotton blend, non-slip soles',
    },
    'denim-overalls': {
      name: 'Little Denim Overalls',
      description:
        'Soft washed-denim dungarees with adjustable straps, a roomy front pocket and reinforced knees for serious adventuring.',
      material: 'Organic cotton denim with a touch of stretch',
    },
  },
  reviews: {
    r1: {
      location: 'Lisbon, PT',
      text: 'The organic cotton is unbelievably soft — my daughter has sensitive skin and these are the only clothes that never irritate her. Beautiful quality.',
    },
    r2: {
      location: 'Manchester, UK',
      text: 'Ordered the Little Explorer Jacket for our twins. Washed it a dozen times already and it still looks brand new. Worth every penny.',
    },
    r3: {
      location: 'Berlin, DE',
      text: 'Delivery was lightning fast and the packaging was gorgeous and plastic-free. The whole experience felt premium from start to finish.',
    },
    r4: {
      location: 'Copenhagen, DK',
      text: 'Finally a kids brand that looks as good as it feels. The colours are gentle and modern — I get compliments every single time.',
    },
  },
}
