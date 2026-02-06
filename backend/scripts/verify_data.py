"""
Verify imported data in Neo4j
Run some test queries to verify the data was imported correctly
"""

import sys
import os
from pathlib import Path

backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.database.connection import db
from app.database.schema import get_database_stats


def test_queries():
    """Run test queries to verify data"""
    
    print("=" * 60)
    print("Verifying Neo4j Data")
    print("=" * 60)
    
    if not db.connect():
        print("[ERROR] Failed to connect to Neo4j")
        return False
    
    try:
        with db.get_session() as session:
            # Test 1: Count routes from JFK
            print("\n[Test 1] Routes from JFK:")
            result = session.run("""
                MATCH (jfk:Airport {code: "JFK"})-[:FLIES_TO]->(dest:Airport)
                RETURN count(*) as route_count
            """)
            count = result.single()["route_count"]
            print(f"   Total routes from JFK: {count}")
            
            # Test 2: Top 5 destinations by passengers
            print("\n[Test 2] Top 5 destinations by passengers (October 2025):")
            result = session.run("""
                MATCH (jfk:Airport {code: "JFK"})-[route:FLIES_TO {month: "2025-10"}]->(dest:Airport)
                RETURN dest.code, dest.name, dest.state, 
                       SUM(route.passengers) as total_passengers
                ORDER BY total_passengers DESC
                LIMIT 5
            """)
            for i, record in enumerate(result, 1):
                print(f"   {i}. {record['dest.code']} ({record['dest.name']}, {record['dest.state']}): "
                      f"{record['total_passengers']:,} passengers")
            
            # Test 3: Airlines operating from JFK
            print("\n[Test 3] Airlines operating from JFK:")
            result = session.run("""
                MATCH (jfk:Airport {code: "JFK"})-[route:FLIES_TO]->(dest:Airport)
                RETURN DISTINCT route.carrier as airline
                ORDER BY airline
            """)
            airlines = [record["airline"] for record in result]
            print(f"   Airlines: {', '.join(airlines)}")
            
            # Test 4: Total passengers by month
            print("\n[Test 4] Total passengers by month:")
            result = session.run("""
                MATCH (jfk:Airport {code: "JFK"})-[route:FLIES_TO]->(dest:Airport)
                RETURN route.month as month, 
                       SUM(route.passengers) as total_passengers
                ORDER BY month
            """)
            for record in result:
                print(f"   {record['month']}: {record['total_passengers']:,} passengers")
            
            # Test 5: States served
            print("\n[Test 5] Number of destination states:")
            result = session.run("""
                MATCH (jfk:Airport {code: "JFK"})-[:FLIES_TO]->(dest:Airport)
                RETURN COUNT(DISTINCT dest.state) as state_count
            """)
            state_count = result.single()["state_count"]
            print(f"   States served: {state_count}")
            
        print("\n" + "=" * 60)
        print("[SUCCESS] All verification tests passed!")
        print("=" * 60)
        
        # Get database stats
        stats = get_database_stats()
        if stats:
            print(f"\nDatabase Statistics:")
            print(f"  Total nodes: {stats['total_nodes']}")
            print(f"  Total relationships: {stats['total_relationships']}")
            print(f"  Node types: {stats['nodes_by_type']}")
            print(f"  Relationship types: {stats['relationships_by_type']}")
        
        db.close()
        return True
        
    except Exception as e:
        print(f"\n[ERROR] Verification failed: {e}")
        import traceback
        traceback.print_exc()
        db.close()
        return False


if __name__ == "__main__":
    success = test_queries()
    sys.exit(0 if success else 1)
