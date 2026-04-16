from __future__ import annotations

import time
from collections.abc import Callable
from datetime import datetime
from typing import Any, Optional

import requests
from requests_oauthlib import OAuth1Session

from ..config import settings
from ..domain.models import AuthType


class DiscogsClient:
    def __init__(
        self,
        consumer_key: Optional[str] = None,
        consumer_secret: Optional[str] = None,
    ) -> None:
        self.consumer_key = consumer_key or settings.discogs_consumer_key
        self.consumer_secret = consumer_secret or settings.discogs_consumer_secret
        self.user_agent = "DiscogsMigrationLocalApp/0.1"

    def _oauth_session(
        self,
        oauth_token: Optional[str] = None,
        oauth_token_secret: Optional[str] = None,
        verifier: Optional[str] = None,
        callback_uri: Optional[str] = None,
    ) -> OAuth1Session:
        return OAuth1Session(
            self.consumer_key,
            client_secret=self.consumer_secret,
            resource_owner_key=oauth_token,
            resource_owner_secret=oauth_token_secret,
            verifier=verifier,
            callback_uri=callback_uri,
        )

    def _request(
        self,
        method: str,
        url: str,
        *,
        auth_type: AuthType,
        token: str,
        token_secret: Optional[str] = None,
        params: Optional[dict[str, Any]] = None,
    ) -> requests.Response:
        headers = {"User-Agent": self.user_agent}
        if auth_type == "token":
            headers["Authorization"] = f"Discogs token={token}"
            response = requests.request(
                method,
                url,
                headers=headers,
                params=params,
                timeout=30,
            )
            return response

        session = self._oauth_session(
            oauth_token=token,
            oauth_token_secret=token_secret,
        )
        return session.request(
            method,
            url,
            headers=headers,
            params=params,
            timeout=30,
        )

    def start_oauth(self, callback_uri: str) -> tuple[str, str, str]:
        session = self._oauth_session(callback_uri=callback_uri)
        tokens = session.fetch_request_token(settings.discogs_request_token_url)
        token_key = tokens["oauth_token"]
        token_secret = tokens["oauth_token_secret"]
        url = session.authorization_url(settings.discogs_authorize_url)
        return url, token_key, token_secret

    def finish_oauth(
        self, request_token_key: str, request_token_secret: str, oauth_verifier: str
    ) -> dict[str, str]:
        session = self._oauth_session(
            oauth_token=request_token_key,
            oauth_token_secret=request_token_secret,
            verifier=oauth_verifier,
        )
        return session.fetch_access_token(settings.discogs_access_token_url)

    def verify_user_token(self, user_token: str) -> dict[str, Any]:
        return self.get_identity(user_token, auth_type="token")

    def get_identity(
        self,
        token: str,
        token_secret: Optional[str] = None,
        *,
        auth_type: AuthType = "oauth",
    ) -> dict[str, Any]:
        response = self._request(
            "GET",
            f"{settings.discogs_api_base}/oauth/identity",
            auth_type=auth_type,
            token=token,
            token_secret=token_secret,
        )
        response.raise_for_status()
        return response.json()

    def paged_collection_items(
        self,
        username: str,
        token: str,
        token_secret: Optional[str] = None,
        *,
        auth_type: AuthType = "oauth",
        on_progress: Optional[Callable[[int, int], None]] = None,
    ) -> list[dict[str, Any]]:
        page = 1
        items: list[dict[str, Any]] = []
        while True:
            response = self._request(
                "GET",
                f"{settings.discogs_api_base}/users/{username}/collection/folders/0/releases",
                auth_type=auth_type,
                token=token,
                token_secret=token_secret,
                params={
                    "page": page,
                    "per_page": 100,
                    "sort": "added",
                    "sort_order": "desc",
                },
            )
            response.raise_for_status()
            data = response.json()
            batch = data.get("releases", [])
            items.extend(batch)
            pagination = data.get("pagination", {})
            if on_progress is not None:
                on_progress(len(items), pagination.get("items", 0))
            if not batch or page >= pagination.get("pages", 0):
                break
            page += 1
            time.sleep(settings.request_delay_seconds)
        return items

    def add_release(
        self,
        username: str,
        token: str,
        folder_id: int,
        release_id: int,
        *,
        token_secret: Optional[str] = None,
        auth_type: AuthType = "oauth",
    ) -> requests.Response:
        response = self._request(
            "POST",
            f"{settings.discogs_api_base}/users/{username}/collection/folders/{folder_id}/releases/{release_id}",
            auth_type=auth_type,
            token=token,
            token_secret=token_secret,
        )
        time.sleep(settings.request_delay_seconds)
        return response

    def delete_release_instance(
        self,
        username: str,
        token: str,
        folder_id: int,
        release_id: int,
        instance_id: int,
        *,
        token_secret: Optional[str] = None,
        auth_type: AuthType = "oauth",
    ) -> requests.Response:
        response = self._request(
            "DELETE",
            f"{settings.discogs_api_base}/users/{username}/collection/folders/{folder_id}/releases/{release_id}/instances/{instance_id}",
            auth_type=auth_type,
            token=token,
            token_secret=token_secret,
        )
        time.sleep(settings.request_delay_seconds)
        return response

    @staticmethod
    def parse_discogs_datetime(value: Optional[str]) -> Optional[datetime]:
        if not value:
            return None
        return datetime.fromisoformat(value.replace("Z", "+00:00"))


discogs_client = DiscogsClient()
