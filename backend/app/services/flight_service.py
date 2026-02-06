"""
Flight Service
Business logic for querying flight data from Neo4j
"""

from typing import List, Dict, Optional
from app.database.connection import db


class FlightService:
    """Service for flight data operations"""
    
    @staticmethod
    def get_routes(month: Optional[str] = None, 
                   airline: Optional[str] = None,
                   state: Optional[str] = None) -> List[Dict]:
        """
        Get flight routes with optional filters
        
        Returns list of route dictionaries matching the filters
        """
        # Build Cypher query with filters
        query = """
        MATCH (origin:Airport {code: "JFK"})-[route:FLIES_TO]->(dest:Airport)
        WHERE 1=1
        """
        params = {}
        
        if month:
            query += " AND route.month = $month"
            params["month"] = month
        
        if airline:
            query += " AND route.carrier = $airline"
            params["airline"] = airline
        
        if state:
            query += " AND dest.state = $state"
            params["state"] = state
        
        query += """
        RETURN dest.code as destinationCode,
               dest.name as destinationName,
               dest.city as destinationCity,
               dest.state as destinationState,
               dest.stateCode as destinationStateCode,
               dest.lat as destinationLat,
               dest.lon as destinationLon,
               route.distanceMiles as distanceMiles,
               route.passengers as passengers,
               route.flights as flights,
               route.carrier as carrier,
               route.carrierCode as carrierCode,
               route.month as month
        ORDER BY route.passengers DESC
        """
        
        try:
            with db.get_session() as session:
                result = session.run(query, params)
                routes = []
                for record in result:
                    routes.append({
                        "destinationCode": record["destinationCode"],
                        "destinationName": record["destinationName"],
                        "destinationCity": record["destinationCity"],
                        "destinationState": record["destinationState"],
                        "destinationStateCode": record["destinationStateCode"],
                        "destinationLat": record["destinationLat"],
                        "destinationLon": record["destinationLon"],
                        "distanceMiles": record["distanceMiles"],
                        "passengers": record["passengers"],
                        "flights": record["flights"],
                        "carrier": record["carrier"],
                        "carrierCode": record["carrierCode"],
                        "month": record["month"]
                    })
                return routes
        except Exception as e:
            print(f"[ERROR] Failed to get routes: {e}")
            return []
    
    @staticmethod
    def get_aggregations(month: Optional[str] = None,
                        airline: Optional[str] = None,
                        state: Optional[str] = None) -> Dict:
        """
        Get aggregated statistics
        
        Returns dictionary with totals, top state, top airline, etc.
        """
        # Build base query
        base_match = """
        MATCH (origin:Airport {code: "JFK"})-[route:FLIES_TO]->(dest:Airport)
        WHERE 1=1
        """
        params = {}
        
        if month:
            base_match += " AND route.month = $month"
            params["month"] = month
        
        if airline:
            base_match += " AND route.carrier = $airline"
            params["airline"] = airline
        
        if state:
            base_match += " AND dest.state = $state"
            params["state"] = state
        
        try:
            with db.get_session() as session:
                # Total passengers and flights
                query = base_match + """
                RETURN SUM(route.passengers) as totalPassengers,
                       SUM(route.flights) as totalFlights,
                       COUNT(DISTINCT dest.state) as uniqueStates,
                       COUNT(DISTINCT dest.code) as uniqueAirports
                """
                result = session.run(query, params)
                record = result.single()
                
                total_passengers = record["totalPassengers"] or 0
                total_flights = record["totalFlights"] or 0
                unique_states = record["uniqueStates"] or 0
                unique_airports = record["uniqueAirports"] or 0
                avg_per_flight = round(total_passengers / total_flights) if total_flights > 0 else 0
                
                # Top state
                query = base_match + """
                RETURN dest.state as state,
                       dest.stateCode as stateCode,
                       SUM(route.passengers) as passengers
                ORDER BY passengers DESC
                LIMIT 1
                """
                result = session.run(query, params)
                top_state_record = result.single()
                top_state = None
                if top_state_record:
                    top_state = {
                        "name": top_state_record["state"],
                        "stateCode": top_state_record["stateCode"],
                        "passengers": top_state_record["passengers"],
                        "share": round((top_state_record["passengers"] / total_passengers * 100) * 10) / 10 if total_passengers > 0 else 0
                    }
                
                # Top airline
                query = base_match + """
                RETURN route.carrier as carrier,
                       route.carrierCode as carrierCode,
                       SUM(route.passengers) as passengers
                ORDER BY passengers DESC
                LIMIT 1
                """
                result = session.run(query, params)
                top_airline_record = result.single()
                top_airline = None
                if top_airline_record:
                    top_airline = {
                        "name": top_airline_record["carrier"],
                        "carrierCode": top_airline_record["carrierCode"],
                        "passengers": top_airline_record["passengers"],
                        "share": round((top_airline_record["passengers"] / total_passengers * 100) * 10) / 10 if total_passengers > 0 else 0
                    }
                
                # Month-over-month comparison
                comparison = None
                if month:
                    # Get previous month
                    year, month_num = month.split("-")
                    prev_month_num = int(month_num) - 1
                    if prev_month_num < 1:
                        prev_month_num = 12
                        prev_year = int(year) - 1
                    else:
                        prev_year = int(year)
                    prev_month = f"{prev_year}-{str(prev_month_num).zfill(2)}"
                    
                    # Get previous month totals
                    prev_params = params.copy()
                    prev_params["month"] = prev_month
                    prev_query = base_match.replace("$month", "$prev_month") + """
                    RETURN SUM(route.passengers) as totalPassengers,
                           SUM(route.flights) as totalFlights
                    """
                    prev_params["prev_month"] = prev_month
                    result = session.run(prev_query, prev_params)
                    prev_record = result.single()
                    
                    if prev_record and prev_record["totalPassengers"]:
                        prev_passengers = prev_record["totalPassengers"]
                        prev_flights = prev_record["totalFlights"] or 0
                        passenger_change = round(((total_passengers - prev_passengers) / prev_passengers * 100) * 10) / 10 if prev_passengers > 0 else None
                        flight_change = round(((total_flights - prev_flights) / prev_flights * 100) * 10) / 10 if prev_flights > 0 else None
                        
                        comparison = {
                            "previousMonth": prev_month,
                            "passengerChange": passenger_change,
                            "flightChange": flight_change,
                            "previousPassengers": prev_passengers,
                            "previousFlights": prev_flights
                        }
                    else:
                        comparison = {
                            "previousMonth": None,
                            "passengerChange": None,
                            "flightChange": None,
                            "previousPassengers": None,
                            "previousFlights": None
                        }
                else:
                    comparison = {
                        "previousMonth": None,
                        "passengerChange": None,
                        "flightChange": None,
                        "previousPassengers": None,
                        "previousFlights": None
                    }
                
                return {
                    "totalPassengers": total_passengers,
                    "totalFlights": total_flights,
                    "avgPassengersPerFlight": avg_per_flight,
                    "uniqueStates": unique_states,
                    "uniqueAirports": unique_airports,
                    "topState": top_state,
                    "topAirline": top_airline,
                    "comparison": comparison
                }
        except Exception as e:
            print(f"[ERROR] Failed to get aggregations: {e}")
            return {}
    
    @staticmethod
    def get_state_rankings(month: Optional[str] = None,
                          airline: Optional[str] = None,
                          limit: int = 10) -> List[Dict]:
        """
        Get top destination states ranked by passengers
        """
        query = """
        MATCH (origin:Airport {code: "JFK"})-[route:FLIES_TO]->(dest:Airport)
        WHERE 1=1
        """
        params = {}
        
        if month:
            query += " AND route.month = $month"
            params["month"] = month
        
        if airline:
            query += " AND route.carrier = $airline"
            params["airline"] = airline
        
        # Get total for share calculation
        total_query = query + """
        RETURN SUM(route.passengers) as total
        """
        
        query += """
        RETURN dest.state as state,
               dest.stateCode as stateCode,
               SUM(route.passengers) as passengers,
               SUM(route.flights) as flights,
               COUNT(DISTINCT dest.code) as airportCount
        ORDER BY passengers DESC
        LIMIT $limit
        """
        params["limit"] = limit
        
        try:
            with db.get_session() as session:
                # Get total first
                result = session.run(total_query, params)
                total_record = result.single()
                total = total_record["total"] or 1
                
                # Get rankings
                result = session.run(query, params)
                rankings = []
                for record in result:
                    passengers = record["passengers"]
                    share = round((passengers / total * 100) * 10) / 10 if total > 0 else 0
                    rankings.append({
                        "state": record["state"],
                        "stateCode": record["stateCode"],
                        "passengers": passengers,
                        "flights": record["flights"],
                        "share": share,
                        "airportCount": record["airportCount"]
                    })
                return rankings
        except Exception as e:
            print(f"[ERROR] Failed to get state rankings: {e}")
            return []
    
    @staticmethod
    def get_airline_rankings(month: Optional[str] = None,
                            limit: int = 10) -> List[Dict]:
        """
        Get top airlines ranked by passengers
        """
        query = """
        MATCH (origin:Airport {code: "JFK"})-[route:FLIES_TO]->(dest:Airport)
        WHERE 1=1
        """
        params = {}
        
        if month:
            query += " AND route.month = $month"
            params["month"] = month
        
        # Get total for share calculation
        total_query = query + """
        RETURN SUM(route.passengers) as total
        """
        
        query += """
        RETURN route.carrier as carrier,
               route.carrierCode as carrierCode,
               SUM(route.passengers) as passengers,
               SUM(route.flights) as flights,
               COUNT(DISTINCT dest.code) as destinationCount
        ORDER BY passengers DESC
        LIMIT $limit
        """
        params["limit"] = limit
        
        try:
            with db.get_session() as session:
                # Get total first
                result = session.run(total_query, params)
                total_record = result.single()
                total = total_record["total"] or 1
                
                # Get rankings
                result = session.run(query, params)
                rankings = []
                for record in result:
                    passengers = record["passengers"]
                    share = round((passengers / total * 100) * 10) / 10 if total > 0 else 0
                    rankings.append({
                        "carrier": record["carrier"],
                        "carrierCode": record["carrierCode"],
                        "passengers": passengers,
                        "flights": record["flights"],
                        "share": share,
                        "destinationCount": record["destinationCount"]
                    })
                return rankings
        except Exception as e:
            print(f"[ERROR] Failed to get airline rankings: {e}")
            return []
    
    @staticmethod
    def get_route_rankings(month: Optional[str] = None,
                          airline: Optional[str] = None,
                          state: Optional[str] = None,
                          limit: Optional[int] = None) -> List[Dict]:
        """
        Get route rankings for map visualization
        Aggregates routes by destination (combining multiple carriers)
        """
        query = """
        MATCH (origin:Airport {code: "JFK"})-[route:FLIES_TO]->(dest:Airport)
        WHERE 1=1
        """
        params = {}
        
        if month:
            query += " AND route.month = $month"
            params["month"] = month
        
        if airline:
            query += " AND route.carrier = $airline"
            params["airline"] = airline
        
        if state:
            query += " AND dest.state = $state"
            params["state"] = state
        
        query += """
        WITH dest, 
             SUM(route.passengers) as totalPassengers,
             SUM(route.flights) as totalFlights,
             route.distanceMiles as distanceMiles,
             collect(route.carrier) as carriers,
             collect(route.passengers) as carrierPassengers
        ORDER BY totalPassengers DESC
        """
        
        if limit:
            query += " LIMIT $limit"
            params["limit"] = limit
        
        query += """
        WITH dest, totalPassengers, totalFlights, distanceMiles,
             carriers, carrierPassengers,
             [i IN range(0, size(carriers)-1) | 
              {carrier: carriers[i], passengers: carrierPassengers[i]}] as carrierData
        UNWIND carrierData as cd
        WITH dest, totalPassengers, totalFlights, distanceMiles,
             cd.carrier as carrier,
             cd.passengers as carrierPax
        ORDER BY carrierPax DESC
        WITH dest, totalPassengers, totalFlights, distanceMiles,
             collect(carrier)[0] as primaryCarrier,
             collect(carrierPax)[0] as primaryPax
        RETURN dest.code as destinationCode,
               dest.name as destinationName,
               dest.city as destinationCity,
               dest.state as destinationState,
               dest.stateCode as destinationStateCode,
               dest.lat as destinationLat,
               dest.lon as destinationLon,
               distanceMiles,
               totalPassengers as passengers,
               totalFlights as flights,
               round(totalPassengers / totalFlights) as avgPassengersPerFlight,
               primaryCarrier,
               round((primaryPax / totalPassengers * 100)) as primaryCarrierShare
        ORDER BY passengers DESC
        """
        
        try:
            with db.get_session() as session:
                result = session.run(query, params)
                routes = []
                for record in result:
                    routes.append({
                        "destinationCode": record["destinationCode"],
                        "destinationName": record["destinationName"],
                        "destinationCity": record["destinationCity"],
                        "destinationState": record["destinationState"],
                        "destinationStateCode": record["destinationStateCode"],
                        "destinationLat": record["destinationLat"],
                        "destinationLon": record["destinationLon"],
                        "distanceMiles": record["distanceMiles"],
                        "passengers": record["passengers"],
                        "flights": record["flights"],
                        "avgPassengersPerFlight": record["avgPassengersPerFlight"],
                        "primaryCarrier": record["primaryCarrier"],
                        "primaryCarrierShare": record["primaryCarrierShare"]
                    })
                return routes
        except Exception as e:
            print(f"[ERROR] Failed to get route rankings: {e}")
            return []
    
    @staticmethod
    def get_available_filters() -> Dict:
        """
        Get available filter options (months, airlines, states)
        """
        try:
            with db.get_session() as session:
                # Get available months
                result = session.run("""
                    MATCH (origin:Airport {code: "JFK"})-[route:FLIES_TO]->(dest:Airport)
                    RETURN DISTINCT route.month as month
                    ORDER BY month DESC
                """)
                months = [record["month"] for record in result]
                
                # Get available airlines
                result = session.run("""
                    MATCH (origin:Airport {code: "JFK"})-[route:FLIES_TO]->(dest:Airport)
                    RETURN DISTINCT route.carrier as airline
                    ORDER BY airline
                """)
                airlines = [record["airline"] for record in result]
                
                # Get available states
                result = session.run("""
                    MATCH (origin:Airport {code: "JFK"})-[route:FLIES_TO]->(dest:Airport)
                    RETURN DISTINCT dest.state as state
                    ORDER BY state
                """)
                states = [record["state"] for record in result]
                
                return {
                    "months": months,
                    "airlines": airlines,
                    "states": states
                }
        except Exception as e:
            print(f"[ERROR] Failed to get filter options: {e}")
            return {"months": [], "airlines": [], "states": []}
