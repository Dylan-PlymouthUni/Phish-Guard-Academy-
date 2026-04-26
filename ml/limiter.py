"""Limiter utilities for PhishGuard Academy.
This module sets up the rate limiting functionality for the PhishGuard Academy platform using the slowapi library. It defines a shared Limiter instance that can be imported and used across different API modules to enforce rate limits on incoming requests based on the client's IP address. 
This helps protect the platform from abuse and ensures fair usage of resources while providing a consistent way to apply rate limits across all endpoints."""

from slowapi import Limiter
from slowapi.util import get_remote_address

# Shared rate limiter instance
limiter = Limiter(key_func=get_remote_address)
