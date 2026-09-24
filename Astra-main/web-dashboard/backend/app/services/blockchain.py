"""Ethereum blockchain interaction service for on-chain carbon accountability."""

import json
import os
from typing import Optional
from app.config import settings


class BlockchainService:
    """Service for interacting with Ethereum smart contracts on Sepolia testnet."""

    def __init__(self):
        """Initialize Web3 connection and contract instances."""
        self.web3 = None
        self.account = None
        self.carbon_contract = None
        self.token_contract = None
        self.badge_contract = None
        self.registry_contract = None
        self._initialized = False

        if not settings.blockchain_rpc_url or not settings.blockchain_private_key:
            print("⚠️ Blockchain config missing. On-chain features disabled.")
            return

        try:
            from web3 import Web3

            self.web3 = Web3(Web3.HTTPProvider(settings.blockchain_rpc_url))

            if not self.web3.is_connected():
                print("⚠️ Cannot connect to blockchain RPC. On-chain features disabled.")
                self.web3 = None
                return

            self.account = self.web3.eth.account.from_key(settings.blockchain_private_key)
            print(f"✅ Blockchain connected. Account: {self.account.address}")

            # Load contracts
            self._load_contracts()
            self._initialized = True

        except ImportError:
            print("⚠️ web3 package not installed. On-chain features disabled.")
        except Exception as e:
            print(f"⚠️ Blockchain init error: {e}. On-chain features disabled.")

    @property
    def is_available(self) -> bool:
        """Check if blockchain service is available."""
        return self._initialized and self.web3 is not None

    def _load_contracts(self):
        """Load contract ABIs and create contract instances."""
        abi_dir = os.path.join(os.path.dirname(__file__), "..", "..", "contracts", "abis")

        if settings.carbon_contract_address:
            self.carbon_contract = self._load_contract(
                abi_dir, "CarbonAccountability.json", settings.carbon_contract_address
            )

        if settings.token_contract_address:
            self.token_contract = self._load_contract(
                abi_dir, "GreenToken.json", settings.token_contract_address
            )

        if settings.badge_contract_address:
            self.badge_contract = self._load_contract(
                abi_dir, "GreenBadge.json", settings.badge_contract_address
            )

        if settings.registry_contract_address:
            self.registry_contract = self._load_contract(
                abi_dir, "CarbonRegistry.json", settings.registry_contract_address
            )

    def _load_contract(self, abi_dir: str, abi_filename: str, address: str):
        """Load a single contract from ABI file."""
        abi_path = os.path.join(abi_dir, abi_filename)
        if not os.path.exists(abi_path):
            print(f"⚠️ ABI not found: {abi_path}")
            return None

        with open(abi_path, "r") as f:
            abi = json.load(f)

        return self.web3.eth.contract(
            address=self.web3.to_checksum_address(address),
            abi=abi
        )

    def _send_transaction(self, tx_function):
        """Build, sign, and send a transaction. Returns tx hash."""
        if not self.web3 or not self.account:
            raise RuntimeError("Blockchain not initialized")

        tx = tx_function.build_transaction({
            "from": self.account.address,
            "nonce": self.web3.eth.get_transaction_count(self.account.address),
            "gas": 300000,
            "gasPrice": self.web3.eth.gas_price,
        })

        signed = self.account.sign_transaction(tx)
        tx_hash = self.web3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = self.web3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)

        return {
            "tx_hash": receipt.transactionHash.hex(),
            "block_number": receipt.blockNumber,
            "gas_used": receipt.gasUsed,
            "status": "success" if receipt.status == 1 else "failed",
        }

    # --- Carbon Accountability ---

    def store_carbon_hash(self, report_hash: str, ipfs_cid: str) -> dict:
        """Store a carbon report hash on-chain."""
        if not self.carbon_contract:
            raise RuntimeError("Carbon contract not deployed or configured")

        report_hash_bytes = bytes.fromhex(report_hash)
        tx_fn = self.carbon_contract.functions.commitReport(report_hash_bytes, ipfs_cid)
        return self._send_transaction(tx_fn)

    def verify_carbon_hash(self, report_hash: str) -> Optional[dict]:
        """Verify a carbon report hash exists on-chain."""
        if not self.carbon_contract:
            return None

        report_hash_bytes = bytes.fromhex(report_hash)
        try:
            result = self.carbon_contract.functions.getReport(report_hash_bytes).call()
            if result[0] == b'\x00' * 32:  # Empty hash means not found
                return None
            return {
                "reporter": result[1],
                "ipfs_cid": result[2],
                "timestamp": result[3],
                "exists": True,
            }
        except Exception:
            return None

    # --- Green Token ---

    def mint_green_tokens(self, to_address: str, amount: int) -> dict:
        """Mint green incentive tokens to an address."""
        if not self.token_contract:
            raise RuntimeError("Token contract not deployed or configured")

        to_addr = self.web3.to_checksum_address(to_address)
        tx_fn = self.token_contract.functions.mint(to_addr, amount)
        return self._send_transaction(tx_fn)

    def get_token_balance(self, address: str) -> int:
        """Get green token balance for an address."""
        if not self.token_contract:
            return 0

        addr = self.web3.to_checksum_address(address)
        return self.token_contract.functions.balanceOf(addr).call()

    # --- Green Badge NFT ---

    def mint_badge(self, to_address: str, badge_uri: str) -> dict:
        """Mint a green badge NFT to an address."""
        if not self.badge_contract:
            raise RuntimeError("Badge contract not deployed or configured")

        to_addr = self.web3.to_checksum_address(to_address)
        tx_fn = self.badge_contract.functions.mintBadge(to_addr, badge_uri)
        return self._send_transaction(tx_fn)

    # --- Carbon Registry ---

    def register_entry_on_chain(self, entry_hash: str, entry_type: int) -> dict:
        """Register a verified carbon data entry on-chain."""
        if not self.registry_contract:
            raise RuntimeError("Registry contract not deployed or configured")

        entry_hash_bytes = bytes.fromhex(entry_hash)
        tx_fn = self.registry_contract.functions.registerEntry(entry_hash_bytes, entry_type)
        return self._send_transaction(tx_fn)

    def is_entry_verified(self, entry_hash: str) -> bool:
        """Check if an entry hash is verified on-chain."""
        if not self.registry_contract:
            return False

        entry_hash_bytes = bytes.fromhex(entry_hash)
        try:
            return self.registry_contract.functions.isVerified(entry_hash_bytes).call()
        except Exception:
            return False
