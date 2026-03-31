from __future__ import annotations

import threading
from collections import Counter
from typing import Any

from ..domain.models import CollectionItemSnapshot
from ..repository import Repository
from .discogs import DiscogsClient
from .keychain import KeychainStore


class JobRunner:
    def __init__(
        self,
        repository: Repository,
        discogs_client: DiscogsClient,
        keychain_store: KeychainStore,
    ) -> None:
        self.repository = repository
        self.discogs_client = discogs_client
        self.keychain_store = keychain_store
        self._threads: dict[str, threading.Thread] = {}
        self._lock = threading.Lock()

    def start_copy(self, job_id: str) -> None:
        with self._lock:
            if job_id in self._threads and self._threads[job_id].is_alive():
                return
            thread = threading.Thread(target=self._run_copy, args=(job_id,), daemon=True)
            self._threads[job_id] = thread
            thread.start()

    def resume(self, job_id: str) -> None:
        job = self.repository.get_job(job_id)
        if job.status in {"draft", "running_copy"}:
            self.start_copy(job_id)
        elif job.status == "running_delete":
            with self._lock:
                thread = threading.Thread(target=self._run_delete, args=(job_id,), daemon=True)
                self._threads[job_id] = thread
                thread.start()

    def confirm_delete(self, job_id: str) -> None:
        with self._lock:
            thread = threading.Thread(target=self._run_delete, args=(job_id,), daemon=True)
            self._threads[job_id] = thread
            thread.start()

    def rollback(self, job_id: str) -> None:
        detail = self.repository.get_job_detail(job_id)
        job = detail.job
        if job.status != "awaiting_delete_confirmation":
            raise ValueError("Rollback is only allowed before deletion starts.")

        destination = self.repository.get_account(job.destination_account_id)
        oauth_token = self.keychain_store.get_secret(destination.token_key)
        oauth_secret = self.keychain_store.get_secret(destination.token_secret_key)
        for item in detail.items:
            if item.status != "copied" or not item.destination_instance_id:
                continue
            response = self.discogs_client.delete_release_instance(
                username=destination.username,
                oauth_token=oauth_token,
                oauth_token_secret=oauth_secret,
                folder_id=item.destination_folder_id or 1,
                release_id=item.release_id,
                instance_id=item.destination_instance_id,
            )
            if response.status_code == 204:
                self.repository.update_job_item(
                    item.id,
                    status="rolled_back",
                    message="Rolled back before delete phase.",
                    increment_attempt=False,
                )
        self.repository.update_job_status(job_id, status="completed_with_issues", finished=True)
        self.repository.add_job_event(job_id, "info", "Rollback finished.")

    def _run_copy(self, job_id: str) -> None:
        detail = self.repository.get_job_detail(job_id)
        job = detail.job
        source = self.repository.get_account(job.source_account_id)
        destination = self.repository.get_account(job.destination_account_id)
        destination_token = self.keychain_store.get_secret(destination.token_key)
        destination_secret = self.keychain_store.get_secret(destination.token_secret_key)
        self.repository.update_job_status(job_id, status="running_copy", started=True)
        self.repository.add_job_event(job_id, "info", "Copy phase started.")

        for item in self.repository.get_job_detail(job_id).items:
            if item.status not in {"pending", "failed"}:
                continue
            response = self.discogs_client.add_release(
                username=destination.username,
                oauth_token=destination_token,
                oauth_token_secret=destination_secret,
                folder_id=item.destination_folder_id or 1,
                release_id=item.release_id,
            )
            if response.status_code in {200, 201}:
                body = response.json() if response.content else {}
                self.repository.update_job_item(
                    item.id,
                    status="copied" if job.workflow_mode == "copy" else "awaiting_delete_confirmation",
                    destination_instance_id=body.get("instance_id"),
                    message="Copied to destination account.",
                )
            elif response.status_code == 422:
                self.repository.update_job_item(
                    item.id,
                    status="skipped",
                    message="Skipped because the release already exists in the destination account.",
                )
            else:
                self.repository.update_job_item(
                    item.id,
                    status="failed",
                    message=f"Discogs returned {response.status_code} during copy.",
                )

        summary = self._summarize(job_id)
        final_status = "completed" if job.workflow_mode == "copy" and summary.get("failed", 0) == 0 else "completed_with_issues"
        if job.workflow_mode == "move":
            final_status = "awaiting_delete_confirmation"
        self.repository.update_job_status(
            job_id,
            status=final_status,
            summary=summary,
            finished=job.workflow_mode == "copy",
        )
        self.repository.add_job_event(job_id, "info", "Copy phase finished.")

    def _run_delete(self, job_id: str) -> None:
        detail = self.repository.get_job_detail(job_id)
        job = detail.job
        if job.workflow_mode != "move":
            raise ValueError("Delete phase is only valid for move jobs.")
        source = self.repository.get_account(job.source_account_id)
        source_token = self.keychain_store.get_secret(source.token_key)
        source_secret = self.keychain_store.get_secret(source.token_secret_key)
        self.repository.update_job_status(job_id, status="running_delete")
        self.repository.add_job_event(job_id, "info", "Delete phase started.")

        for item in self.repository.get_job_detail(job_id).items:
            if item.status not in {"awaiting_delete_confirmation", "delete_failed"}:
                continue
            response = self.discogs_client.delete_release_instance(
                username=source.username,
                oauth_token=source_token,
                oauth_token_secret=source_secret,
                folder_id=item.source_folder_id,
                release_id=item.release_id,
                instance_id=item.instance_id,
            )
            if response.status_code == 204:
                self.repository.update_job_item(item.id, status="deleted", message="Deleted from source account.")
            elif response.status_code == 404:
                self.repository.update_job_item(
                    item.id,
                    status="delete_skipped_drift",
                    message="Source item drifted before delete; review required.",
                )
            else:
                self.repository.update_job_item(
                    item.id,
                    status="delete_failed",
                    message=f"Discogs returned {response.status_code} during delete.",
                )

        summary = self._summarize(job_id)
        final_status = "completed" if summary.get("delete_failed", 0) == 0 else "completed_with_issues"
        self.repository.update_job_status(job_id, status=final_status, summary=summary, finished=True)
        self.repository.add_job_event(job_id, "info", "Delete phase finished.")

    def _summarize(self, job_id: str) -> dict[str, int]:
        counts = Counter(item.status for item in self.repository.get_job_detail(job_id).items)
        return dict(counts)

