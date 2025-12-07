# Product Addition Form: Architecture and Integration

## Overview

A new vendor-facing ProductForm implements category selection and product variants aligned with backend specifications. It replaces legacy form code and ensures accessibility, responsiveness, and consistent validation across the stack.

## Files

- `client/src/components/vendor/ProductForm.tsx`: Core form component (create/edit)
- `client/src/pages/vendor/Products.tsx`: Integrates ProductForm into Add/Edit dialogs
- `shared/schema.ts`: Shared constants and schemas (`PRODUCT_CATEGORIES`, `variantSchema`)
- `server/routes.ts`: Product API (`POST /api/products`, `PATCH /api/vendor/products/:id`) variant handling
- `client/src/pages/ProductDetail.tsx`: Variant selection, dynamic price/stock display
- `client/src/lib/cart.ts`: Variant-aware cart logic

## Backend Mapping

- Required fields: `title`, `description`, `price`, `stock`, `district`, `giBrand`, `images`
- Additions: `category` (enum), `variants` (array of `{type, option, sku, price, stock}`)
- API endpoints:
  - `POST /api/products`: Create product (server stringifies `variants`)
  - `PATCH /api/vendor/products/:id`: Update product (server stringifies `variants`)

## Validation

- Zod schema enforces minimum lengths and numeric constraints
- `hasVariants` requires at least one variant entry
- Images must be uploaded (min length 1)

## Accessibility & UX

- All inputs include visible labels and appropriate `aria-label` attributes
- Variant toggling is operable via keyboard; controls adhere to WCAG guidance
- Responsive grid: `grid-cols-1 sm:grid-cols-2` for mobile and desktop

## Error Handling

- Toast notifications for upload failures and mutation errors
- Detailed server errors surfaced from API responses

## Testing

- Unit/Integration: `client/src/pages/__tests__/ProductForm.test.tsx`
  - Valid submission including category and variants
  - Mocks image upload and API call
- Extend with invalid data tests to assert validation messages

## Maintenance

- Add new categories by updating `PRODUCT_CATEGORIES` in `shared/schema.ts`
- Server handles variant JSON serialization; client passes arrays under `variants`

