"""IPFS pinning service using Pinata API for off-chain carbon report storage."""

import json
import requests
from typing import Optional
from app.config import settings


PINATA_PIN_URL = "https://api.pinata.cloud/pinning/pinJSONToIPFS"
PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs"


class IPFSService:
    """Service for pinning and retrieving JSON data from IPFS via Pinata."""

    def __init__(self):
        """Initialize IPFS service."""
        self._available = bool(settings.pinata_api_key and settings.pinata_secret_key)
        if not self._available:
            print("⚠️ Pinata API keys missing. IPFS storage disabled.")

    @property
    def is_available(self) -> bool:
        """Check if IPFS service is available."""
        return self._available

    def _headers(self) -> dict:
        """Get Pinata API headers."""
        return {
            "Content-Type": "application/json",
            "pinata_api_key": settings.pinata_api_key,
            "pinata_secret_api_key": settings.pinata_secret_key,
        }

    def pin_json(self, data: dict, name: Optional[str] = None) -> str:
        """
        Pin JSON data to IPFS via Pinata.

        Args:
            data: JSON-serializable data to pin
            name: Optional name for the pin

        Returns:
            IPFS CID (Content Identifier)
        """
        if not self._available:
            raise RuntimeError("IPFS service not configured")

        payload = {
            "pinataContent": data,
        }
        if name:
            payload["pinataMetadata"] = {"name": name}

        response = requests.post(
            PINATA_PIN_URL,
            headers=self._headers(),
            json=payload,
            timeout=30,
        )
        response.raise_for_status()

        result = response.json()
        cid = result["IpfsHash"]
        print(f"📌 Pinned to IPFS: {cid}")
        return cid

    def get_json(self, cid: str) -> Optional[dict]:
        """
        Retrieve JSON data from IPFS by CID.

        Args:
            cid: IPFS Content Identifier

        Returns:
            Parsed JSON data or None if retrieval fails
        """
        try:
            url = f"{PINATA_GATEWAY}/{cid}"
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"⚠️ Failed to retrieve from IPFS ({cid}): {e}")
            return None
