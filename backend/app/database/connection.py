"""
Neo4j Database Connection
Handles connection to Neo4j database instance
"""

from neo4j import GraphDatabase
from typing import Optional
import os
from dotenv import load_dotenv

# Load environment variables from .env file
# Specify the path explicitly to avoid encoding issues
import os as os_module
env_path = os_module.path.join(os_module.path.dirname(__file__), '..', '..', '.env')
load_dotenv(dotenv_path=env_path, encoding='utf-8')


class Neo4jConnection:
    """
    Manages connection to Neo4j database
    """
    
    def __init__(self):
        """
        Initialize Neo4j connection using environment variables
        """
        # Get connection details from environment variables
        self.uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
        self.user = os.getenv("NEO4J_USER", "neo4j")
        self.password = os.getenv("NEO4J_PASSWORD", "")
        self.database = os.getenv("NEO4J_DATABASE", "neo4j")  # Default database name
        
        # Create driver instance
        self.driver: Optional[GraphDatabase.driver] = None
        
    def connect(self):
        """
        Establish connection to Neo4j database
        """
        try:
            self.driver = GraphDatabase.driver(
                self.uri,
                auth=(self.user, self.password)
            )
            # Verify connection
            self.driver.verify_connectivity()
            print(f"[SUCCESS] Connected to Neo4j at {self.uri}")
            print(f"[INFO] Database: {self.database}")
            return True
        except Exception as e:
            print(f"[ERROR] Failed to connect to Neo4j: {e}")
            return False
    
    def close(self):
        """
        Close the database connection
        """
        if self.driver:
            self.driver.close()
            print("[INFO] Neo4j connection closed")
    
    def get_session(self):
        """
        Get a new database session
        Use this for executing queries
        
        Example:
            with db.get_session() as session:
                result = session.run("MATCH (n) RETURN count(n)")
        """
        if not self.driver:
            raise Exception("Database not connected. Call connect() first.")
        return self.driver.session(database=self.database)
    
    def test_connection(self):
        """
        Test the database connection with a simple query
        """
        try:
            with self.get_session() as session:
                result = session.run("RETURN 1 as test")
                record = result.single()
                if record and record["test"] == 1:
                    print("[SUCCESS] Database connection test successful!")
                    return True
                return False
        except Exception as e:
            print(f"[ERROR] Connection test failed: {e}")
            return False


# Global database instance
# Import this in other files: from app.database.connection import db
db = Neo4jConnection()
