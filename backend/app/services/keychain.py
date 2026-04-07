from __future__ import annotations

import subprocess

from ..config import settings


class KeychainStore:
    def set_secret(self, account_name: str, secret: str) -> None:
        subprocess.run(
            [
                "security",
                "add-generic-password",
                "-U",
                "-a",
                account_name,
                "-s",
                settings.keychain_service,
                "-w",
                secret,
            ],
            check=True,
            capture_output=True,
            text=True,
        )

    def get_secret(self, account_name: str) -> str:
        try:
            result = subprocess.run(
                [
                    "security",
                    "find-generic-password",
                    "-a",
                    account_name,
                    "-s",
                    settings.keychain_service,
                    "-w",
                ],
                check=True,
                capture_output=True,
                text=True,
            )
        except subprocess.CalledProcessError:
            raise ValueError(
                f"Token '{account_name}' not found in Keychain. Re-connect the account."
            )
        return result.stdout.strip()

    def delete_secret(self, account_name: str) -> None:
        subprocess.run(
            [
                "security",
                "delete-generic-password",
                "-a",
                account_name,
                "-s",
                settings.keychain_service,
            ],
            check=False,
            capture_output=True,
            text=True,
        )


keychain_store = KeychainStore()

