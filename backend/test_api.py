"""
Test API Endpoints
Quick test script to verify API endpoints work
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_endpoint(name, url, params=None):
    """Test an API endpoint"""
    print(f"\n[{name}]")
    print(f"GET {url}")
    try:
        response = requests.get(url, params=params)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success! Response keys: {list(data.keys())}")
            if isinstance(data, dict) and "count" in data:
                print(f"   Count: {data['count']}")
            elif isinstance(data, dict) and "rankings" in data:
                print(f"   Rankings: {len(data['rankings'])} items")
            elif isinstance(data, dict) and "routes" in data:
                print(f"   Routes: {len(data['routes'])} items")
            return True
        else:
            print(f"❌ Error {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Exception: {e}")
        return False

def main():
    print("=" * 60)
    print("Testing API Endpoints")
    print("=" * 60)
    
    # Test endpoints
    tests = [
        ("Health Check", f"{BASE_URL}/health"),
        ("Root", f"{BASE_URL}/"),
        ("Available Filters", f"{BASE_URL}/api/filters"),
        ("All Routes", f"{BASE_URL}/api/flights"),
        ("Routes (Oct 2025)", f"{BASE_URL}/api/flights", {"month": "2025-10"}),
        ("Routes (JetBlue)", f"{BASE_URL}/api/flights", {"airline": "JetBlue"}),
        ("Aggregations", f"{BASE_URL}/api/aggregations", {"month": "2025-10"}),
        ("State Rankings", f"{BASE_URL}/api/states/rankings", {"month": "2025-10", "limit": 5}),
        ("Airline Rankings", f"{BASE_URL}/api/airlines/rankings", {"month": "2025-10", "limit": 5}),
        ("Route Rankings", f"{BASE_URL}/api/routes/rankings", {"month": "2025-10", "limit": 10}),
    ]
    
    results = []
    for name, url, *params in tests:
        params_dict = params[0] if params else None
        success = test_endpoint(name, url, params_dict)
        results.append((name, success))
    
    # Summary
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    passed = sum(1 for _, success in results if success)
    total = len(results)
    print(f"Passed: {passed}/{total}")
    
    for name, success in results:
        status = "✅" if success else "❌"
        print(f"{status} {name}")
    
    return passed == total

if __name__ == "__main__":
    import sys
    success = main()
    sys.exit(0 if success else 1)
