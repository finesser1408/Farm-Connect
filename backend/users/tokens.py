from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken


def revoke_user_refresh_tokens(user):
    """Blacklist all outstanding refresh tokens for a deactivated/suspended user."""
    tokens = OutstandingToken.objects.filter(user=user)
    revoked_count = 0
    for token in tokens:
        _, created = BlacklistedToken.objects.get_or_create(token=token)
        if created:
            revoked_count += 1
    return revoked_count
