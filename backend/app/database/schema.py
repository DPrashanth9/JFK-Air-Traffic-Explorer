"""
Neo4j Database Schema
Defines the graph data model and creates indexes
"""

from app.database.connection import db


def create_indexes():
    """
    Create indexes for better query performance
    """
    indexes = [
        # Airport code index (for fast airport lookups)
        "CREATE INDEX airport_code IF NOT EXISTS FOR (a:Airport) ON (a.code)",
        
        # Airline name index (for fast airline lookups)
        "CREATE INDEX airline_name IF NOT EXISTS FOR (a:Airline) ON (a.name)",
        
        # Month index (for time-based queries)
        "CREATE INDEX month_id IF NOT EXISTS FOR (m:Month) ON (m.month)",
    ]
    
    try:
        with db.get_session() as session:
            for index_query in indexes:
                try:
                    session.run(index_query)
                    print(f"[INFO] Created index: {index_query[:50]}...")
                except Exception as e:
                    # Index might already exist, that's okay
                    if "already exists" in str(e).lower() or "equivalent" in str(e).lower():
                        print(f"[INFO] Index already exists, skipping...")
                    else:
                        print(f"[WARNING] Could not create index: {e}")
        print("[SUCCESS] All indexes created/verified")
        return True
    except Exception as e:
        print(f"[ERROR] Failed to create indexes: {e}")
        return False


def clear_database():
    """
    Clear all nodes and relationships (use with caution!)
    """
    try:
        with db.get_session() as session:
            # Delete all relationships first
            session.run("MATCH ()-[r]->() DELETE r")
            # Delete all nodes
            session.run("MATCH (n) DELETE n")
            print("[SUCCESS] Database cleared")
            return True
    except Exception as e:
        print(f"[ERROR] Failed to clear database: {e}")
        return False


def get_database_stats():
    """
    Get statistics about the database
    """
    try:
        with db.get_session() as session:
            # Count nodes by type
            node_counts = {}
            result = session.run("""
                MATCH (n)
                RETURN labels(n)[0] as label, count(n) as count
                ORDER BY count DESC
            """)
            for record in result:
                node_counts[record["label"]] = record["count"]
            
            # Count relationships by type
            rel_counts = {}
            result = session.run("""
                MATCH ()-[r]->()
                RETURN type(r) as type, count(r) as count
                ORDER BY count DESC
            """)
            for record in result:
                rel_counts[record["type"]] = record["count"]
            
            # Total counts
            total_nodes = sum(node_counts.values())
            total_rels = sum(rel_counts.values())
            
            return {
                "total_nodes": total_nodes,
                "total_relationships": total_rels,
                "nodes_by_type": node_counts,
                "relationships_by_type": rel_counts
            }
    except Exception as e:
        print(f"[ERROR] Failed to get database stats: {e}")
        return None


if __name__ == "__main__":
    # Test the schema functions
    print("Testing Neo4j schema...")
    db.connect()
    
    print("\n1. Creating indexes...")
    create_indexes()
    
    print("\n2. Getting database stats...")
    stats = get_database_stats()
    if stats:
        print(f"   Total nodes: {stats['total_nodes']}")
        print(f"   Total relationships: {stats['total_relationships']}")
        print(f"   Nodes by type: {stats['nodes_by_type']}")
        print(f"   Relationships by type: {stats['relationships_by_type']}")
    
    db.close()
