# Saleor Wishlist App

Wishlist app that provides authenticated APIs for storefront wishlist operations, with optional DynamoDB persistence.

## Endpoints

- `GET /api/manifest` - app manifest
- `POST /api/register` - Saleor app installation callback
- `GET /api/wishlist/items?channel=<slug>&userId=<id>`
- `POST /api/wishlist/items`
- `DELETE /api/wishlist/items`
- `GET /api/configuration` (Dashboard-protected)
- `POST /api/configuration` (Dashboard-protected)

Request body for `POST /api/wishlist/items` and `DELETE /api/wishlist/items`:

```json
{
  "channel": "default-channel",
  "userId": "user-123",
  "productVariantId": "variant-id-123"
}
```

## Authentication

### Wishlist items API (`/api/wishlist/items`)

Headers required:

- `Authorization: Bearer <APP_TOKEN>`
- `saleor-api-url: <SALEOR_GRAPHQL_URL>`

Also supported:

- `authorization-bearer` as an alternative auth header
- `x-saleor-api-url` as an alternative Saleor URL header

The app validates token by loading APL entry for `saleor-api-url` and checking token equality.

### Configuration API (`/api/configuration`)

This endpoint is protected with Saleor App Bridge auth (`createProtectedHandler`) and requires `MANAGE_APPS`.
Use it from Saleor Dashboard iframe context, not from direct public browser access.

## Storage

Default storage is in-memory:

- `WISHLIST_REPOSITORY=memory`

For persistent storage with DynamoDB:

1. Set `WISHLIST_REPOSITORY=dynamodb`
2. Set `DYNAMODB_MAIN_TABLE_NAME`
3. Set `AWS_REGION`
4. Optionally set `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`
5. Optionally set `DYNAMODB_ENDPOINT` for local DynamoDB

Create/verify table with:

```bash
pnpm setup-dynamodb
```

Table keys used by this app:

- `PK` (partition key, string)
- `SK` (sort key, string)

## Configuration UI behavior

- `/` redirects to `/configuration`
- `/configuration` works best when opened from Saleor Dashboard app iframe
- Direct public access may show read-only/limited behavior because protected configuration API calls require Dashboard auth context
