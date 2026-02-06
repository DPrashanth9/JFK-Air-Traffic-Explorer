"""
Database Configuration
Settings for Neo4j connection
"""

from pydantic_settings import BaseSettings
from typing import Optional


class DatabaseSettings(BaseSettings):
    """
    Database configuration settings
    Loads from environment variables or .env file
    """
    
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = ""
    neo4j_database: str = "neo4j"  # Your instance name: "JFK explorer"
    
    class Config:
        env_file = ".env"
        env_prefix = "NEO4J_"
        case_sensitive = False


# Create settings instance
db_settings = DatabaseSettings()
