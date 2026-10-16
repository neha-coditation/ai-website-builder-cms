# Cloudflare Workers bindings (staging)
# Copy the following into wrangler.jsonc ONLY after creating the actual resources.
# Never commit database passwords or API credentials.
#
# "hyperdrive": [{"binding":"HYPERDRIVE","id":"<hyperdrive-config-id>"}],
# "r2_buckets": [{"binding":"MEDIA_BUCKET","bucket_name":"studio-cms-media-staging"}]
#
# Required Worker secrets:
# STUDIO_ADMIN_PASSWORD
# STUDIO_SESSION_SECRET
#
# DATABASE_URL is needed by Prisma CLI for migrations and local development.
# A Workers-compatible Prisma client/adapter and runtime connection must be
# implemented and tested before production deploy.
#
# Do not expose MEDIA_BUCKET publicly until authenticated asset-serving
# routes, access controls and content-type validation are implemented.
