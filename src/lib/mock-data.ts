
import type { User, Product, Message, Category, Offer, VerificationTemplate, SpecTemplate } from './types';

// This file is now deprecated for users, but still used for products, messages, etc.
// We will migrate these to Firestore in a future step.

export const mockUsers: Record<string, User> = {
  'user-1': {
    id: 'user-1',
    name: 'Alice Buyer',
    email: 'alice@example.com',
    avatar: 'https://i.pravatar.cc/150?u=user-1',
    role: 'buyer',
  },
  'user-2': {
    id: 'user-2',
    name: 'Bob\'s Manufacturing Co.',
    email: 'contact@bob-mfg.com',
    avatar: 'https://i.pravatar.cc/150?u=user-2',
    role: 'seller',
    businessType: 'Manufacturer',
    location: 'Detroit, USA',
    memberSince: 2018,
    certifications: ['ISO 9001', 'Verified Supplier'],
    companyDescription: 'Bob\'s Manufacturing Co. has been a leader in industrial components since 2018. We specialize in high-quality widgets, gears, and automated systems for factories worldwide. Our commitment to quality is backed by our ISO 9001 certification.'
  },
  'user-3': {
    id: 'user-3',
    name: 'Charlie Global Trading',
    email: 'sales@charlie-global.com',
    avatar: 'https://i.pravatar.cc/150?u=user-3',
    role: 'seller',
    businessType: 'Trading Company',
    location: 'Singapore',
    memberSince: 2021,
    certifications: ['Verified Supplier', 'Top Exporter'],
    companyDescription: 'Charlie Global Trading sources and supplies high-quality raw materials and electronic components for businesses across the globe. We pride ourselves on our robust supply chain and excellent customer service.'
  },
  'system': {
      id: 'system',
      name: 'System',
      email: '',
      avatar: '',
      role: 'admin'
  }
};

export const mockVerificationTemplates: VerificationTemplate[] = [
    {
        id: 'IN', // Country Code
        countryName: 'India',
        fields: [
            {
                name: 'gstn',
                label: 'GSTN (Goods and Services Tax Identification Number)',
                type: 'text',
                required: 'always',
                validationRegex: '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$',
                helperText: 'Enter your 15-digit GSTN number.'
            },
            {
                name: 'iec',
                label: 'Import Export Code (IEC)',
                type: 'text',
                required: 'international',
                validationRegex: '^\\d{10}$',
                helperText: 'Required for international trade.'
            }
        ]
    },
    {
        id: 'AU',
        countryName: 'Australia',
        fields: [
             {
                name: 'abn',
                label: 'Australian Business Number (ABN)',
                type: 'text',
                required: 'always',
                validationRegex: '^(\\d *?){11}$',
                helperText: 'Enter your 11-digit ABN.'
            }
        ]
    },
    {
        id: 'GB',
        countryName: 'United Kingdom',
        fields: [
            {
                name: 'crn',
                label: 'Company Registration Number (CRN)',
                type: 'text',
                required: 'always',
                validationRegex: '^([A-Z]{2}\\d{6}|\\d{8})$',
                helperText: 'Found on your Certificate of Incorporation.'
            },
            {
                name: 'vat',
                label: 'VAT Number',
                type: 'text',
                required: 'never',
                helperText: 'Your Value Added Tax registration number.'
            }
        ]
    }
];

export const mockSpecTemplates: SpecTemplate[] = [
  {
    id: 'spec-template-tractors',
    name: 'Tractor Specifications',
    fields: [
      { name: 'Brand Name', type: 'text' },
      { name: 'Model', type: 'text' },
      { name: 'Country of Origin', type: 'text' },
      { name: 'Engine Power (HP)', type: 'text' },
      { name: 'Drive Type', type: 'select', options: ['2-Wheel Drive (2WD)', '4-Wheel Drive (4WD)'] },
      { name: 'Transmission Type', type: 'select', options: ['Manual', 'Hydrostatic', 'CVT (Continuously Variable Transmission)'] },
      { name: 'PTO (Power Take-off)', type: 'switch' },
      { name: 'PTO Speed (RPM)', type: 'text' },
      { name: 'Hydraulic Capacity (L/min)', type: 'text' },
    ]
  }
];


export const mockCategories: Category[] = [
  { id: 'cat-1', name: 'Industrial Supplies', parentId: null, status: 'active', imageUrl: 'https://picsum.photos/seed/industrial/400/300' },
  { id: 'cat-2', name: 'Raw Materials', parentId: null, status: 'active', imageUrl: 'https://picsum.photos/seed/raw-materials/400/300' },
  { id: 'cat-3', name: 'Electronics', parentId: null, status: 'active', imageUrl: 'https://picsum.photos/seed/electronics/400/300' },
  { id: 'cat-4', name: 'Beauty & Personal Care', parentId: null, status: 'active', imageUrl: 'https://picsum.photos/seed/beauty/400/300' },
  { id: 'cat-5', name: 'Agriculture', parentId: null, status: 'active', imageUrl: 'https://picsum.photos/seed/agriculture/400/300' },

  { id: 'cat-1-1', name: 'Mechanical Components', parentId: 'cat-1', status: 'active' },
  { id: 'cat-1-2', name: 'Conveying Systems', parentId: 'cat-1', status: 'active' },

  { id: 'cat-2-1', name: 'Textiles', parentId: 'cat-2', status: 'active' },
  { id: 'cat-2-2', name: 'Metals & Alloys', parentId: 'cat-2', status: 'active' },
  
  { id: 'cat-3-1', name: 'Electronic Components', parentId: 'cat-3', status: 'active' },

  { id: 'cat-4-1', name: 'Hair Care & Styling', parentId: 'cat-4', status: 'active' },
  
  { id: 'cat-5-1', name: 'Farming Equipment & Machinery', parentId: 'cat-5', status: 'active' },
  { id: 'cat-5-2', name: 'Fertilizers & Soil Amendments', parentId: 'cat-5', status: 'active' },


  { id: 'cat-1-1-1', name: 'Widgets', parentId: 'cat-1-1', status: 'active' },
  { id: 'cat-1-1-2', name: 'Gears & Cogs', parentId: 'cat-1-1', status: 'active' },
  { id: 'cat-1-2-1', name: 'Belt Conveyors', parentId: 'cat-1-2', status: 'active' },

  { id: 'cat-2-1-1', name: 'Cotton', parentId: 'cat-2-1', status: 'active' },
  { id: 'cat-2-2-1', name: 'Titanium', parentId: 'cat-2-2', status: 'active' },

  { id: 'cat-3-1-1', name: 'Printed Circuit Boards (PCBs)', parentId: 'cat-3-1', status: 'active' },

  { id: 'cat-4-1-1', name: 'Wigs & Hairpieces', parentId: 'cat-4-1', status: 'active' },
  
  { id: 'cat-5-1-1', name: 'Tractors', parentId: 'cat-5-1', status: 'active', specTemplateId: 'spec-template-tractors' },
  { id: 'cat-5-1-2', name: 'Harvesters', parentId: 'cat-5-1', status: 'active' },
  { id: 'cat-5-2-1', name: 'Organic Fertilizers', parentId: 'cat-5-2', status: 'active' },
];

export const mockProducts: Omit<Product, 'priceUSD'>[] = [
  {
    id: 'prod-1',
    title: 'Industrial Grade Widgets',
    description: 'High-quality widgets for all your industrial needs. Made from reinforced steel.',
    images: ['https://picsum.photos/600/400?random=1', 'https://picsum.photos/600/400?random=8', 'https://picsum.photos/600/400?random=9'],
    price: { baseAmount: 1200.50, baseCurrency: 'USD' },
    sellerId: 'user-2',
    categoryId: 'cat-1-1-1',
    specifications: [
        { name: 'Material', value: 'Reinforced Steel' },
        { name: 'Weight', value: '15.5 kg' },
    ],
    status: 'approved',
    countryOfOrigin: 'United States',
    stockAvailability: 'in_stock',
    moq: 100,
    moqUnit: 'units',
    sku: 'WID-IND-001',
    leadTime: '3-5 business days'
  },
  {
    id: 'prod-2',
    title: 'Precision Cog Set',
    description: 'A set of 12 precision-engineered cogs for high-performance machinery.',
    images: ['https://picsum.photos/600/400?random=2', 'https://picsum.photos/600/400?random=10', 'https://picsum.photos/600/400?random=11'],
    price: { baseAmount: 850.00, baseCurrency: 'USD' },
    sellerId: 'user-2',
    categoryId: 'cat-1-1-2',
    specifications: [
        { name: 'Material', value: 'Hardened Brass' },
        { name: 'Units per Set', value: '12' },
        { name: 'Tolerance', value: '±0.01mm' },
    ],
    status: 'approved',
    countryOfOrigin: 'Germany',
    stockAvailability: 'in_stock',
    moq: 50,
    moqUnit: 'sets',
    sku: 'COG-PRE-012',
    leadTime: '7 business days'
  },
  {
    id: 'prod-3',
    title: 'Bulk Organic Cotton',
    description: '1000kg of premium, ethically sourced organic cotton bales.',
    images: ['https://picsum.photos/600/400?random=3', 'https://picsum.photos/600/400?random=12'],
    price: { baseAmount: 5500.00, baseCurrency: 'USD' },
    sellerId: 'user-3',
    categoryId: 'cat-2-1-1',
    specifications: [
        { name: 'Material', value: 'Organic Cotton' },
        { name: 'Weight per Bale', value: '1000 kg' },
        { name: 'Certification', value: 'GOTS Certified' },
    ],
    status: 'approved',
    countryOfOrigin: 'India',
    stockAvailability: 'in_stock',
    moq: 1,
    moqUnit: 'tonne',
    sku: 'COT-ORG-001',
    leadTime: '14-21 business days'
  },
  {
    id: 'prod-4',
    title: 'Advanced Circuit Boards (100-pack)',
    description: 'Pack of 100 multi-layer circuit boards for complex electronics manufacturing.',
    images: ['https://picsum.photos/600/400?random=4', 'https://picsum.photos/600/400?random=13', 'https://picsum.photos/600/400?random=14'],
    price: { baseAmount: 3200.75, baseCurrency: 'USD' },
    sellerId: 'user-3',
    categoryId: 'cat-3-1-1',
    specifications: [
        { name: 'Layers', value: '4' },
        { name: 'Material', value: 'FR-4' },
        { name: 'Quantity', value: '100 boards' },
    ],
    status: 'approved',
    countryOfOrigin: 'China',
    stockAvailability: 'made_to_order',
    moq: 5,
    moqUnit: 'packs',
    sku: 'PCB-ADV-4L',
    leadTime: '4-6 weeks'
  },
  {
    id: 'prod-5',
    title: 'Automated Conveyor System',
    description: 'A 10-meter modular conveyor belt system with variable speed control.',
    images: ['https://picsum.photos/600/400?random=5', 'https://picsum.photos/600/400?random=15'],
    price: { baseAmount: 15000.00, baseCurrency: 'USD' },
    sellerId: 'user-2',
    categoryId: 'cat-1-2-1',
    specifications: [
        { name: 'Length', value: '10 meters' },
        { name: 'Speed', value: '0-2 m/s' },
        { name: 'Motor', value: '2 HP Brushless DC' },
    ],
    status: 'approved',
    countryOfOrigin: 'United States',
    stockAvailability: 'made_to_order',
    moq: 1,
    moqUnit: 'system',
    sku: 'CONV-MOD-10M',
    leadTime: '3 weeks'
  },
  {
    id: 'prod-6',
    title: 'Titanium Alloy Rods (50-pack)',
    description: 'High-tensile strength titanium alloy rods, 1-meter length.',
    images: ['https://picsum.photos/600/400?random=6'],
    price: { baseAmount: 7800.00, baseCurrency: 'USD' },
    sellerId: 'user-3',
    categoryId: 'cat-2-2-1',
    specifications: [
        { name: 'Alloy', value: 'Ti-6Al-4V' },
        { name: 'Length', value: '1 meter' },
        { name: 'Quantity', value: '50 rods' },
    ],
    status: 'approved',
    countryOfOrigin: 'Japan',
    stockAvailability: 'in_stock',
    moq: 1,
    moqUnit: 'pack',
    sku: 'TI-ROD-64-1M',
    leadTime: '5-7 business days'
  },
  {
    id: 'prod-7',
    title: 'Lace Front Human Hair Wig',
    description: '22-inch Brazilian human hair wig with a natural-looking lace front.',
    images: ['https://picsum.photos/600/400?random=7', 'https://picsum.photos/600/400?random=16', 'https://picsum.photos/600/400?random=17'],
    price: { baseAmount: 450.00, baseCurrency: 'USD' },
    sellerId: 'user-3',
    categoryId: 'cat-4-1-1',
    specifications: [
        { name: 'Hair Type', value: 'Human Hair' },
        { name: 'Hair Origin', value: 'Brazilian' },
        { name: 'Cap Construction', value: 'Lace Front' },
        { name: 'Length', value: '22 inches' },
        { name: 'Color', value: 'Natural Black' },
    ],
    status: 'approved',
    countryOfOrigin: 'Brazil',
    stockAvailability: 'in_stock',
    moq: 10,
    moqUnit: 'pieces',
    sku: 'WIG-LFB-22',
    leadTime: '2-4 business days'
  },
  {
    id: 'prod-8',
    title: 'AgroMax X120 Tractor',
    description: 'A powerful and reliable 120HP tractor for medium to large scale farming operations. Features a comfortable cabin and advanced CVT transmission.',
    images: ['https://picsum.photos/600/400?random=18', 'https://picsum.photos/600/400?random=19', 'https://picsum.photos/600/400?random=20'],
    price: { baseAmount: 75000.00, baseCurrency: 'USD' },
    sellerId: 'user-2',
    categoryId: 'cat-5-1-1',
    specifications: [
        { name: 'Brand Name', value: 'AgroMax' },
        { name: 'Model', value: 'X120' },
        { name: 'Engine Power (HP)', value: '120' },
        { name: 'Drive Type', value: '4-Wheel Drive (4WD)' },
        { name: 'Transmission Type', value: 'CVT (Continuously Variable Transmission)' },
        { name: 'PTO (Power Take-off)', value: 'true' },
        { name: 'PTO Speed (RPM)', value: '540 / 1000' },
        { name: 'Hydraulic Capacity (L/min)', value: '75' },
    ],
    status: 'approved',
    countryOfOrigin: 'Germany',
    stockAvailability: 'made_to_order',
    moq: 1,
    moqUnit: 'unit',
    sku: 'TRACTOR-AMX120',
    leadTime: '8-12 weeks'
  },
];

export const mockOffers: Record<string, Offer> = {
  'offer-1': {
    id: 'offer-1',
    productId: 'prod-1',
    quantity: 500,
    pricePerUnit: 1100,
    notes: 'Bulk discount applied. Delivery within 14 business days.',
    status: 'pending',
    sellerId: 'user-2',
    buyerId: 'user-1',
    conversationId: '',
    productTitle: '',
    productImage: ''
  },
};

export const mockMessages: Message[] = [
    {
        id: 'msg-1',
        conversationId: '',
        text: 'Hello, I am interested in the Industrial Grade Widgets. Can you provide the spec sheet?',
        timestamp: new Date() as any,
        senderId: 'user-1',
    },
    {
        id: 'msg-2',
        conversationId: '',
        text: 'Of course, I am attaching it now. Let me know if you have any more questions.',
        timestamp: new Date() as any,
        senderId: 'user-2',
    },
    {
      id: 'msg-3',
      conversationId: '',
      text: 'After reviewing, we\'d like to place a large order. What is the price for 500 units?',
      timestamp: new Date() as any,
      senderId: 'user-1',
    },
    {
      id: 'msg-4',
      conversationId: '',
      text: 'For 500 units, I can offer a price of $1100 per unit. I\'ve created a formal offer for you to review.',
      timestamp: new Date() as any,
      senderId: 'user-2',
      offerId: 'offer-1'
    }
];

export const loggedInUser = mockUsers['user-2'];
