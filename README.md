# JFK Domestic Air Traffic Explorer

A portfolio-grade web application that visualizes and analyzes domestic air traffic from JFK (New York) to U.S. destinations using monthly aggregated data.

![JFK Air Traffic Explorer](https://via.placeholder.com/800x400?text=JFK+Air+Traffic+Explorer)

## Features

### Interactive Map
- **State Choropleth**: Destination states shaded by total passenger volume using quantile breaks for clearer differentiation
- **Route Arcs**: Curved flight paths from JFK to destination airports with multiple visualization modes
- **Airline-Colored Routes**: Toggle to color routes by airline for instant carrier identification
- **Base Routes Layer**: Subtle background routes for context (low opacity)
- **Dynamic Styling**: Line thickness/opacity scales with passenger volume
- **Flight Journey Animation**: Animated points traveling along routes to show active flights (toggleable)
- **Airport Markers**: Clickable destination airport symbols with hover tooltips
- **Hover Tooltips**: Detailed route and airport information including distance, passengers, flights, and primary carrier
- **Interactive Legends**: Passenger density legend with quantile break values and airline color legend

### Analytics Panel
- **Key Metrics**: Total passengers, states reached, top destination, top airline
- **Month-over-Month Comparison**: Percentage change indicators
- **Ranked Lists**: Top 10 destination states and airlines (click to filter)
- **Fun Facts**: Engaging comparisons (e.g., "Enough passengers to fill Madison Square Garden 62 times!")

### Filters & Interactions
- Month selector (most recent available month)
- Airline filter
- State filter
- Route display controls (Top N vs All)
- **Map Controls Panel**: Toggle airline coloring, flight animation, and airport visibility
- Click-to-filter from ranked lists, map states, and airport markers
- Hover interactions on routes, airports, and states

### Charts
- Horizontal bar chart: Top 10 destination states
- Donut chart: Airline market share

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Mapping**: Mapbox GL JS
- **Styling**: Tailwind CSS
- **Charts**: Recharts

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Mapbox account (free tier available)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd jfk-air-traffic-explorer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with your Mapbox token:
   ```bash
   cp .env.example .env
   # Edit .env and add your Mapbox token
   VITE_MAPBOX_TOKEN=your_mapbox_token_here
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open http://localhost:5173 in your browser

### Build for Production

```bash
npm run build
npm run preview
```

## Dataset

### Current Implementation (MVP)

The application uses a **realistic synthetic dataset** representing monthly domestic passenger traffic from JFK. This data is structured to mirror the format of real BTS/DOT aviation data.

**Data characteristics:**
- 3 months of data (August - October 2025)
- ~180 route records per month
- 45+ destination airports across 25+ states
- 8 major carriers (JetBlue, Delta, American, United, Spirit, Alaska, Frontier, Hawaiian)

**Realism factors:**
- JetBlue has highest market share at JFK (~30-35%)
- Florida destinations have highest volume (MIA, FLL, MCO, TPA)
- California is second highest (LAX, SFO, SAN)
- Business routes (BOS, DCA, ORD) are steady

### Data Note

⚠️ **Important**: This is synthetic data for demonstration purposes. Real aviation data from the Bureau of Transportation Statistics (BTS) typically has a 2-month reporting lag.

### Future Enhancement: Real Data Pipeline

The application is structured to easily integrate real BTS/DOT data:

1. **Data Source**: [BTS T-100 Domestic Segment Data](https://www.transtats.bts.gov/Tables.asp?QO_VQ=EFD&QO_anzr=Nv4%20Pn44vr45&QO_fu146_anzr=Nv4%20Pn44vr4%20Fhzzn4l)

2. **Integration Points**:
   - Replace `src/data/flights.json` with API fetch or static file generation
   - Data schema matches expected interface (`FlightRoute`)
   - Add date range picker for historical analysis

3. **Suggested Pipeline**:
   ```
   BTS Website → Download CSV → Process with Python/Node script → Generate flights.json → Deploy
   ```

## Project Structure

```
src/
├── components/
│   ├── Map/
│   │   ├── MapView.tsx         # Main Mapbox map
│   │   └── RouteControls.tsx   # Route display options
│   ├── Panel/
│   │   ├── AnalyticsPanel.tsx  # Left sidebar container
│   │   ├── StatCard.tsx        # Metric cards
│   │   ├── RankedList.tsx      # Top 10 lists
│   │   ├── FilterControls.tsx  # Filter dropdowns
│   │   ├── FunFacts.tsx        # Fun comparisons
│   │   └── DataNote.tsx        # Data disclaimer
│   └── Charts/
│       ├── DestinationBarChart.tsx
│       └── AirlineDonutChart.tsx
├── hooks/
│   ├── useFlightData.ts        # Data loading + filtering
│   ├── useAggregations.ts      # Metric calculations
│   └── useFunFacts.ts          # Fun fact generation
├── data/
│   ├── flights.json            # Synthetic flight data
│   ├── airports.json           # Airport reference
│   └── us-states.json          # State GeoJSON
├── types/
│   └── index.ts                # TypeScript interfaces
├── utils/
│   ├── constants.ts            # Config values
│   ├── formatters.ts           # Number formatting
│   └── mapUtils.ts             # GeoJSON helpers
├── App.tsx                     # Main component
├── main.tsx                    # Entry point
└── index.css                   # Tailwind + custom styles
```

## Visualization Features

### Airline-Colored Routes
- Routes can be colored by their primary carrier for instant visual identification
- Airline color legend shows active carriers in the current view
- Toggle between airline colors and traffic-based styling

### Flight Journey Animation
- Animated points travel along route arcs to simulate active flights
- Performance-optimized: Limited to top 50 routes for smooth animation
- Continuous loop animation with staggered start times
- Toggle on/off for performance or visual preference

### Airport Markers
- Destination airports displayed as scaled circles (size = passenger volume)
- Click to filter routes by state
- Hover for quick airport details (name, passengers, flights, top carrier)
- Toggle visibility to reduce map clutter

### Enhanced Choropleth
- Uses quantile breaks (5 buckets) instead of linear scaling for better visual differentiation
- Legend shows quantile break values for precise interpretation
- Hover states highlight individual states with tooltips showing passenger counts and share

## Performance Considerations

- **Stable Map Instance**: Mapbox GL map initializes once and updates via source/layer data
- **Memoized Aggregations**: Heavy calculations wrapped in `useMemo`
- **Debounced Slider**: Route count slider updates are debounced (150ms)
- **Efficient GeoJSON**: Route arcs generated with optimized point count
- **Animation Optimization**: Flight animation capped at 50 routes, uses `requestAnimationFrame`
- **Layer Visibility**: Unused layers hidden (not removed) for instant toggle performance

## Future Improvements

1. **Real Data Integration**: Connect to BTS/DOT API or scheduled data pipeline
2. **Historical Analysis**: Multi-month trend visualization
3. **Airport-Level Detail**: Click on route to see airport-specific breakdown
4. **Comparison Mode**: Compare two months side-by-side
5. **Export Functionality**: Download filtered data as CSV
6. **Mobile Responsive**: Collapsible panel for smaller screens
7. **Additional Metrics**: Load factor, revenue passenger miles, market share trends

## Deployment

### Deploy to Render via GitHub

This application can be deployed to Render using GitHub. See the deployment guides:

- **Quick Start**: [RENDER_QUICK_START.md](./RENDER_QUICK_START.md)
- **GitHub Deployment**: [GITHUB_DEPLOYMENT.md](./GITHUB_DEPLOYMENT.md)
- **Push to GitHub**: [PUSH_TO_GITHUB.md](./PUSH_TO_GITHUB.md)
- **Deployment Checklist**: [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)

**Quick Steps**:
1. Push code to GitHub: `https://github.com/DPrashanth9/JFK-Air-Traffic-Explorer`
2. Set up Neo4j Aura (free cloud database)
3. Deploy backend as Web Service on Render
4. Deploy frontend as Static Site on Render
5. Configure environment variables

## License

MIT License - feel free to use this for your portfolio or learning purposes.

## Acknowledgments

- Data structure inspired by [BTS T-100 Domestic Segment](https://www.transtats.bts.gov/)
- US States GeoJSON from [PublicaMundi](https://github.com/PublicaMundi/MappingAPI)
- Map style by [Mapbox](https://www.mapbox.com/)
