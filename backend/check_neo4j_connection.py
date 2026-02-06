"""
Alternative connection test - tries different database names
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from neo4j import GraphDatabase
from dotenv import load_dotenv

# Load environment variables
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path=env_path, encoding='utf-8')

uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
user = os.getenv("NEO4J_USER", "neo4j")
password = os.getenv("NEO4J_PASSWORD", "")

print(f"🔌 Testing connection...")
print(f"URI: {uri}")
print(f"User: {user}")
print(f"Password: {'*' * len(password) if password else '(empty)'}")
print("-" * 50)

# Try different database names
databases_to_try = ["neo4j", "JFK explorer", None]  # None = default

for db_name in databases_to_try:
    try:
        print(f"\n📊 Trying database: {db_name or '(default)'}...")
        driver = GraphDatabase.driver(uri, auth=(user, password))
        driver.verify_connectivity()
        
        # Try to get a session
        if db_name:
            session = driver.session(database=db_name)
        else:
            session = driver.session()  # Default database
        
        # Test query
        result = session.run("RETURN 1 as test")
        record = result.single()
        session.close()
        
        if record and record["test"] == 1:
            print(f"✅ SUCCESS! Connected to database: {db_name or '(default)'}")
            
            # Get database info
            if db_name:
                session = driver.session(database=db_name)
            else:
                session = driver.session()
            
            # List all databases
            result = session.run("SHOW DATABASES")
            print("\n📋 Available databases:")
            for record in result:
                print(f"   - {record['name']}")
            
            session.close()
            driver.close()
            print("\n✅ Update your .env file with the working database name!")
            break
    except Exception as e:
        print(f"❌ Failed: {str(e)[:100]}")
        if driver:
            driver.close()
else:
    print("\n❌ Could not connect with any database name.")
    print("\n💡 Please check:")
    print("   1. Your password is correct in .env file")
    print("   2. Neo4j instance is running")
    print("   3. Try resetting password in Neo4j Desktop")
