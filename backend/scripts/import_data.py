"""
Import Flight Data into Neo4j
Reads flights.json and airports.json and imports into Neo4j graph database
"""

import sys
import os
import json
from pathlib import Path

# Add parent directories to path
backend_dir = Path(__file__).parent.parent
project_root = backend_dir.parent
sys.path.insert(0, str(backend_dir))

from app.database.connection import db
from app.database.schema import create_indexes


def load_json_file(filepath):
    """Load JSON file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"[ERROR] Failed to load {filepath}: {e}")
        return None


def create_airports(session, airports_data):
    """
    Create Airport nodes from airports.json
    """
    print("\n[1/4] Creating Airport nodes...")
    
    airports_created = 0
    airports_skipped = 0
    
    for code, airport in airports_data.items():
        try:
            # Use MERGE to avoid duplicates
            query = """
            MERGE (a:Airport {code: $code})
            SET a.name = $name,
                a.city = $city,
                a.state = $state,
                a.stateCode = $stateCode,
                a.lat = $lat,
                a.lon = $lon
            RETURN a
            """
            
            result = session.run(query, {
                "code": airport["code"],
                "name": airport["name"],
                "city": airport["city"],
                "state": airport["state"],
                "stateCode": airport["stateCode"],
                "lat": float(airport["lat"]),
                "lon": float(airport["lon"])
            })
            
            record = result.single()
            if record:
                airports_created += 1
            else:
                airports_skipped += 1
                
        except Exception as e:
            print(f"[WARNING] Failed to create airport {code}: {e}")
            airports_skipped += 1
    
    print(f"   Created: {airports_created} airports")
    if airports_skipped > 0:
        print(f"   Skipped: {airports_skipped} airports")
    
    return airports_created


def create_airlines(session, flights_data):
    """
    Create Airline nodes from unique carriers in flights.json
    """
    print("\n[2/4] Creating Airline nodes...")
    
    # Get unique airlines
    airlines = {}
    for route in flights_data:
        carrier = route["carrier"]
        carrier_code = route["carrierCode"]
        if carrier not in airlines:
            airlines[carrier] = carrier_code
    
    airlines_created = 0
    
    for name, code in airlines.items():
        try:
            query = """
            MERGE (a:Airline {name: $name})
            SET a.code = $code
            RETURN a
            """
            
            result = session.run(query, {
                "name": name,
                "code": code
            })
            
            record = result.single()
            if record:
                airlines_created += 1
                
        except Exception as e:
            print(f"[WARNING] Failed to create airline {name}: {e}")
    
    print(f"   Created: {airlines_created} airlines")
    return airlines_created


def create_months(session, flights_data):
    """
    Create Month nodes from unique months in flights.json
    """
    print("\n[3/4] Creating Month nodes...")
    
    # Get unique months
    months = set()
    for route in flights_data:
        months.add(route["month"])
    
    months_created = 0
    
    for month in months:
        try:
            query = """
            MERGE (m:Month {month: $month})
            RETURN m
            """
            
            result = session.run(query, {"month": month})
            record = result.single()
            if record:
                months_created += 1
                
        except Exception as e:
            print(f"[WARNING] Failed to create month {month}: {e}")
    
    print(f"   Created: {months_created} months")
    return months_created


def create_routes(session, flights_data):
    """
    Create FLIES_TO relationships from flights.json
    """
    print("\n[4/4] Creating FLIES_TO relationships...")
    
    routes_created = 0
    routes_skipped = 0
    
    # Process in batches for better performance
    batch_size = 100
    total_routes = len(flights_data)
    
    for i in range(0, total_routes, batch_size):
        batch = flights_data[i:i + batch_size]
        
        for route in batch:
            try:
                # Create relationship with all properties
                query = """
                MATCH (origin:Airport {code: $origin})
                MATCH (dest:Airport {code: $destCode})
                MERGE (origin)-[r:FLIES_TO {
                    month: $month,
                    carrier: $carrier,
                    carrierCode: $carrierCode
                }]->(dest)
                SET r.passengers = $passengers,
                    r.flights = $flights,
                    r.distanceMiles = $distanceMiles
                RETURN r
                """
                
                result = session.run(query, {
                    "origin": route["origin"],
                    "destCode": route["destinationCode"],
                    "month": route["month"],
                    "carrier": route["carrier"],
                    "carrierCode": route["carrierCode"],
                    "passengers": int(route["passengers"]),
                    "flights": int(route["flights"]),
                    "distanceMiles": float(route["distanceMiles"])
                })
                
                record = result.single()
                if record:
                    routes_created += 1
                else:
                    routes_skipped += 1
                    
            except Exception as e:
                print(f"[WARNING] Failed to create route {route.get('id', 'unknown')}: {e}")
                routes_skipped += 1
        
        # Progress indicator
        if (i + batch_size) % 200 == 0 or i + batch_size >= total_routes:
            progress = min(100, int((i + batch_size) / total_routes * 100))
            print(f"   Progress: {progress}% ({routes_created} routes created)")
    
    print(f"   Created: {routes_created} routes")
    if routes_skipped > 0:
        print(f"   Skipped: {routes_skipped} routes")
    
    return routes_created


def main():
    """
    Main import function
    """
    print("=" * 60)
    print("JFK Air Traffic Data Import to Neo4j")
    print("=" * 60)
    
    # Connect to database
    print("\nConnecting to Neo4j...")
    if not db.connect():
        print("[ERROR] Failed to connect to Neo4j")
        return False
    
    # Create indexes
    print("\nCreating indexes...")
    create_indexes()
    
    # Load data files
    print("\nLoading data files...")
    
    # Find data files (they're in the project root, not backend)
    flights_path = project_root / "src" / "data" / "flights.json"
    airports_path = project_root / "src" / "data" / "airports.json"
    
    if not flights_path.exists():
        print(f"[ERROR] flights.json not found at {flights_path}")
        db.close()
        return False
    
    if not airports_path.exists():
        print(f"[ERROR] airports.json not found at {airports_path}")
        db.close()
        return False
    
    flights_data = load_json_file(flights_path)
    airports_data = load_json_file(airports_path)
    
    if not flights_data or not airports_data:
        print("[ERROR] Failed to load data files")
        db.close()
        return False
    
    print(f"   Loaded {len(flights_data)} flight routes")
    print(f"   Loaded {len(airports_data)} airports")
    
    # Import data
    try:
        with db.get_session() as session:
            # Create nodes
            airports_count = create_airports(session, airports_data)
            airlines_count = create_airlines(session, flights_data)
            months_count = create_months(session, flights_data)
            
            # Create relationships
            routes_count = create_routes(session, flights_data)
        
        # Summary
        print("\n" + "=" * 60)
        print("Import Summary")
        print("=" * 60)
        print(f"Airports: {airports_count}")
        print(f"Airlines: {airlines_count}")
        print(f"Months: {months_count}")
        print(f"Routes: {routes_count}")
        print("=" * 60)
        print("\n[SUCCESS] Data import completed!")
        
        # Get final stats
        from app.database.schema import get_database_stats
        stats = get_database_stats()
        if stats:
            print(f"\nDatabase Statistics:")
            print(f"  Total nodes: {stats['total_nodes']}")
            print(f"  Total relationships: {stats['total_relationships']}")
        
        db.close()
        return True
        
    except Exception as e:
        print(f"\n[ERROR] Import failed: {e}")
        import traceback
        traceback.print_exc()
        db.close()
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
