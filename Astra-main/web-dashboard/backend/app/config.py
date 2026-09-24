"""Configuration settings for the backend application."""
import os
from typing import Optional
from dotenv import load_dotenv
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # API Configuration
    api_title: str = "Architecture Sandbox Chatbot API"
    api_version: str = "1.0.0"
    api_prefix: str = "/api"
    
    # Gemini API
    gemini_api_key: str = os.getenv("GEMINI_API_KEY")
    gemini_model: str = "gemini-2.5-flash"
    
    # MongoDB
    mongodb_uri: Optional[str] = os.getenv("MONGODB_URI")
    
    # CORS
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    
    @property
    def cors_origins_list(self) -> list[str]:
        """Get CORS origins as a list."""
        return [origin.strip() for origin in self.cors_origins.split(",")]
    
    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False
    
    # Blockchain (Ethereum Sepolia)
    blockchain_rpc_url: Optional[str] = os.getenv("BLOCKCHAIN_RPC_URL")
    blockchain_private_key: Optional[str] = os.getenv("BLOCKCHAIN_PRIVATE_KEY")
    carbon_contract_address: Optional[str] = os.getenv("CARBON_CONTRACT_ADDRESS")
    token_contract_address: Optional[str] = os.getenv("TOKEN_CONTRACT_ADDRESS")
    badge_contract_address: Optional[str] = os.getenv("BADGE_CONTRACT_ADDRESS")
    registry_contract_address: Optional[str] = os.getenv("REGISTRY_CONTRACT_ADDRESS")
    
    # IPFS (Pinata)
    pinata_api_key: Optional[str] = os.getenv("PINATA_API_KEY")
    pinata_secret_key: Optional[str] = os.getenv("PINATA_SECRET_KEY")
    
    # RAG Configuration
    rag_top_k: int = 3  # Number of documents to retrieve
    
    class Config:
        env_file = [".env", "../../.env", "../../../.env"]
        case_sensitive = False
        extra = "ignore"


settings = Settings()
