# **App Name**: B2B Marketplace

## Core Features:

- User Authentication: User registration and authentication using Firebase Authentication with assigned roles (admin, seller, buyer).
- Product Listings: Display product listings with titles, descriptions, images, and prices in the buyer's local currency using live FX rates API. Base price is in USD.
- In-App Messaging: Facilitate in-platform messaging between buyers and sellers with message monitoring for inappropriate content.
- Contact Detail Filtering: Use an AI tool running in Cloud Functions to filter messages for contact details (phone numbers, emails, links) and block or flag them, based on regex pattern matching.

## Style Guidelines:

- Primary color: HSL(210, 70%, 50%) / RGB(38, 130, 238) - A vibrant blue to inspire trust and confidence in the marketplace.
- Background color: HSL(210, 20%, 95%) / RGB(242, 245, 247) - Light and neutral background to ensure readability and focus on content.
- Accent color: HSL(180, 60%, 40%) / RGB(25, 153, 153) - A contrasting teal to highlight key interactive elements.
- Font pairing: 'Inter' (sans-serif) for headlines and body text.
- Use clean and professional icons to represent product categories and actions.
- A clean and intuitive layout with clear information hierarchy, promoting easy navigation.
- Subtle transition animations to confirm interactions, such as adding a product to a list or sending a message.