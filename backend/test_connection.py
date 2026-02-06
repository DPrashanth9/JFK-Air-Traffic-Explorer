"""
Test Neo4j Connection
Run this script to test your Neo4j connection
"""

import sys
import os

# Add parent directory to path so we can import app modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database.connection import db


def main():
    """
    Test the Neo4j database connection
    """
    import sys
    import io
    # Set UTF-8 encoding for console output
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    
    print("Testing Neo4j connection...")
    print(f"URI: {db.uri}")
    print(f"User: {db.user}")
    print(f"Database: {db.database}")
    print("-" * 50)
    
    # Try to connect
    if db.connect():
        # Test with a simple query
        if db.test_connection():
            print("\n[SUCCESS] All tests passed! Your Neo4j connection is working.")
            
            # Try to get some basic info
            try:
                with db.get_session() as session:
                    # Count nodes
                    result = session.run("MATCH (n) RETURN count(n) as node_count")
                    node_count = result.single()["node_count"]
                    print(f"[INFO] Current nodes in database: {node_count}")
                    
                    # Count relationships
                    result = session.run("MATCH ()-[r]->() RETURN count(r) as rel_count")
                    rel_count = result.single()["rel_count"]
                    print(f"[INFO] Current relationships in database: {rel_count}")
            except Exception as e:
                print(f"[WARNING] Could not get database stats: {e}")
            
            db.close()
            return True
        else:
            print("\n[ERROR] Connection test failed!")
            db.close()
            return False
    else:
        print("\n[ERROR] Could not connect to Neo4j!")
        print("\nMake sure:")
        print("   1. Neo4j is running")
        print("   2. Your .env file has correct credentials")
        print("   3. The database name matches your instance name")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
