import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import type { RouteRanking, StateRanking, RouteMode, FlightRoute } from '../../types';
import { MAP_CONFIG, JFK_COORDINATES, COLORS, ROUTE_CONFIG } from '../../utils/constants';
import { AIRLINE_COLORS, DEFAULT_AIRLINE_COLOR } from '../../utils/airlineColors';
import { routesToGeoJSON, routesToAirportsGeoJSON, getPointAlongLine } from '../../utils/mapUtils';
import { formatNumber, formatDistance } from '../../utils/formatters';
import { MapControls } from './MapControls';
import { calculateQuantileBreaks } from '../../utils/quantileBreaks';
import statesGeoJSON from '../../data/us-states.json';

interface MapViewProps {
  routeRankings: RouteRanking[];
  stateRankings: StateRanking[];
  routeMode: RouteMode;
  topNRoutes: number;
  onRouteModeChange: (mode: RouteMode) => void;
  onTopNChange: (n: number) => void;
  highlightedState: string | null;
  highlightedAirline: string | null;
  onStateClick?: (stateName: string) => void;
  onAirlineClick?: (airlineCode: string) => void;
  flightRoutes?: FlightRoute[]; // Optional: individual routes for airline coloring
}

export function MapView({
  routeRankings,
  stateRankings,
  routeMode,
  topNRoutes,
  onRouteModeChange,
  onTopNChange,
  highlightedState,
  highlightedAirline,
  onStateClick,
  onAirlineClick,
  flightRoutes,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const popup = useRef<mapboxgl.Popup | null>(null); // For click popups
  const hoverPopup = useRef<mapboxgl.Popup | null>(null); // For hover tooltips (anchored)
  const animationFrameRef = useRef<number | null>(null);
  const animationProgressRef = useRef<Map<string, number>>(new Map());
  const routeDrawInAnimationRef = useRef<number | null>(null);
  const introFlowAnimationRef = useRef<number | null>(null);
  const introFlowProgressRef = useRef<Map<string, number>>(new Map());
  const introFlowRouteCacheRef = useRef<Map<string, { coordinates: [number, number][]; carrierCode: string }>>(new Map());
  const jfkPulseAnimationRef = useRef<number | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  
  // New toggle states
  const [colorByAirline, setColorByAirline] = useState(false);
  const [animateFlights, setAnimateFlights] = useState(false);
  // Airports are always visible - no toggle needed

  // Get the routes to display based on mode
  const displayRoutes = useMemo(() => 
    routeMode === 'all' 
      ? routeRankings 
      : routeRankings.slice(0, topNRoutes),
    [routeRankings, routeMode, topNRoutes]
  );
  
  const maxPassengers = routeRankings.length > 0 ? routeRankings[0].passengers : 0;

  // Calculate quantile breaks for choropleth
  const quantileBreaks = useMemo(() => {
    const passengerValues = stateRankings.map(r => r.passengers);
    return calculateQuantileBreaks(passengerValues, 5);
  }, [stateRankings]);

  // Initialize map once
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    console.log('Mapbox token check:', token ? 'Token found (length: ' + token.length + ')' : 'Token NOT found');
    console.log('All env vars:', import.meta.env);
    if (!token) {
      console.error('Mapbox token not found. Please set VITE_MAPBOX_TOKEN in your .env file.');
      return;
    }

    mapboxgl.accessToken = token;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAP_CONFIG.style,
      center: MAP_CONFIG.initialCenter,
      zoom: MAP_CONFIG.initialZoom,
      minZoom: MAP_CONFIG.minZoom,
      maxZoom: MAP_CONFIG.maxZoom,
      attributionControl: true,
    });

    // Add navigation controls (includes compass and zoom)
    const navControl = new mapboxgl.NavigationControl({
      showCompass: true,
      showZoom: true,
      visualizePitch: false,
    });
    map.current.addControl(navControl, 'top-right');

    // Add custom refresh button below navigation controls
    const refreshControl = {
      onAdd: function() {
        const refreshButton = document.createElement('button');
        refreshButton.className = 'mapboxgl-ctrl-icon mapboxgl-ctrl-refresh';
        refreshButton.type = 'button';
        refreshButton.setAttribute('aria-label', 'Reset map view');
        refreshButton.title = 'Reset map view to default position and zoom';
        refreshButton.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
            <path d="M3 21v-5h5" />
          </svg>
        `;
        refreshButton.onclick = () => {
          if (map.current) {
            map.current.flyTo({
              center: MAP_CONFIG.initialCenter,
              zoom: MAP_CONFIG.initialZoom,
              bearing: 0,
              pitch: 0,
              duration: 1000,
            });
          }
        };
        
        const container = document.createElement('div');
        container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';
        container.appendChild(refreshButton);
        return container;
      },
      onRemove: function() {
        // Cleanup if needed
      }
    };
    
    map.current.addControl(refreshControl as any, 'top-right');

    // Add fullscreen control
    const fullscreenControl = {
      onAdd: function() {
        const fullscreenButton = document.createElement('button');
        fullscreenButton.className = 'mapboxgl-ctrl-icon mapboxgl-ctrl-fullscreen';
        fullscreenButton.type = 'button';
        fullscreenButton.setAttribute('aria-label', 'Toggle fullscreen');
        fullscreenButton.title = 'Toggle fullscreen mode';
        
        // Check if fullscreen is supported
        const isFullscreenSupported = !!(
          document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement ||
          (document as any).msFullscreenElement
        );

        if (!isFullscreenSupported) {
          fullscreenButton.style.display = 'none';
        }

        const updateIcon = () => {
          const isFullscreen = !!(
            document.fullscreenElement ||
            (document as any).webkitFullscreenElement ||
            (document as any).mozFullScreenElement ||
            (document as any).msFullscreenElement
          );
          
          fullscreenButton.innerHTML = isFullscreen
            ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                 <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
               </svg>`
            : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                 <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
               </svg>`;
        };

        updateIcon();

        fullscreenButton.onclick = () => {
          const isFullscreen = !!(
            document.fullscreenElement ||
            (document as any).webkitFullscreenElement ||
            (document as any).mozFullScreenElement ||
            (document as any).msFullscreenElement
          );

          const mapElement = mapContainer.current;
          if (!mapElement) return;

          if (!isFullscreen) {
            // Enter fullscreen
            if (mapElement.requestFullscreen) {
              mapElement.requestFullscreen();
            } else if ((mapElement as any).webkitRequestFullscreen) {
              (mapElement as any).webkitRequestFullscreen();
            } else if ((mapElement as any).mozRequestFullScreen) {
              (mapElement as any).mozRequestFullScreen();
            } else if ((mapElement as any).msRequestFullscreen) {
              (mapElement as any).msRequestFullscreen();
            }
          } else {
            // Exit fullscreen
            if (document.exitFullscreen) {
              document.exitFullscreen();
            } else if ((document as any).webkitExitFullscreen) {
              (document as any).webkitExitFullscreen();
            } else if ((document as any).mozCancelFullScreen) {
              (document as any).mozCancelFullScreen();
            } else if ((document as any).msExitFullscreen) {
              (document as any).msExitFullscreen();
            }
          }
        };

        // Listen for fullscreen changes
        ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(event => {
          document.addEventListener(event, updateIcon);
        });
        
        const container = document.createElement('div');
        container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';
        container.appendChild(fullscreenButton);
        return container;
      },
      onRemove: function() {
        // Cleanup
      }
    };
    
    map.current.addControl(fullscreenControl as any, 'top-right');

    // Create popup instance
    popup.current = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 15,
    });

    // Create hover popup instance for anchored tooltips
    hoverPopup.current = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      maxWidth: '260px',
      offset: { bottom: [0, -18] },
      className: 'airport-hover-tooltip',
    });

    map.current.on('load', () => {
      if (!map.current) return;

      // Add state boundaries source with passenger data
      map.current.addSource('states', {
        type: 'geojson',
        data: statesGeoJSON as GeoJSON.FeatureCollection,
      });

      // Add choropleth fill layer (initial setup, will be updated with quantile breaks)
      map.current.addLayer({
        id: 'states-fill',
        type: 'fill',
        source: 'states',
        paint: {
          'fill-color': [
            'case',
            ['has', 'passengers'],
            [
              'step',
              ['get', 'passengers'],
              COLORS.choropleth[0],
              0, COLORS.choropleth[0],
              1000, COLORS.choropleth[1],
              10000, COLORS.choropleth[2],
              50000, COLORS.choropleth[3],
              100000, COLORS.choropleth[4],
            ],
            'rgba(0, 0, 0, 0)',
          ],
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'highlighted'], false],
            0.9,
            0.6,
          ],
        },
      });

      // Add state borders
      map.current.addLayer({
        id: 'states-border',
        type: 'line',
        source: 'states',
        paint: {
          'line-color': [
            'case',
            ['boolean', ['feature-state', 'highlighted'], false],
            COLORS.routeArc,
            'rgba(255, 255, 255, 0.3)',
          ],
          'line-width': [
            'case',
            ['boolean', ['feature-state', 'highlighted'], false],
            2,
            0.5,
          ],
        },
      });

      // Add base routes source (neutral, low opacity for context)
      // Enable lineMetrics for line-progress animation
      map.current.addSource('routes-base', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
        // lineMetrics: true, // Not needed for simple opacity animation
      });

      // Add base routes layer (always visible, low opacity)
      map.current.addLayer({
        id: 'routes-base',
        type: 'line',
        source: 'routes-base',
        paint: {
          'line-color': COLORS.routeArcBase,
          'line-width': [
            'interpolate',
            ['linear'],
            ['get', 'normalizedPassengers'],
            0, ROUTE_CONFIG.minWidth * 0.8,
            1, ROUTE_CONFIG.maxWidth * 0.8,
          ],
          'line-opacity': 0.15,
        },
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
      });

      // Add airline-colored routes source
      // Enable lineMetrics for line-progress animation
      map.current.addSource('routes-airline', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
        // lineMetrics: true, // Not needed for simple opacity animation
      });

      // Add airline-colored routes layer (initially hidden)
      // Build airline color expression safely with null handling
      const airlineColorExpression: any[] = [
        'match',
        ['coalesce', ['get', 'primaryCarrierCode'], ''],
      ];
      Object.entries(AIRLINE_COLORS).forEach(([code, color]) => {
        airlineColorExpression.push(code, color);
      });
      airlineColorExpression.push(DEFAULT_AIRLINE_COLOR);
      
      map.current.addLayer({
        id: 'routes-airline',
        type: 'line',
        source: 'routes-airline',
        paint: {
          'line-color': airlineColorExpression as any,
          'line-width': [
            'interpolate',
            ['linear'],
            ['get', 'normalizedPassengers'],
            0, ROUTE_CONFIG.minWidth,
            1, ROUTE_CONFIG.maxWidth,
          ],
          'line-opacity': [
            'interpolate',
            ['linear'],
            ['get', 'normalizedPassengers'],
            0, ROUTE_CONFIG.minOpacity,
            1, ROUTE_CONFIG.maxOpacity,
          ],
        },
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
          'visibility': 'none', // Initially hidden
        },
      });

      // Add traffic-based routes source (fallback when not coloring by airline)
      // Enable lineMetrics for line-progress animation
      map.current.addSource('routes', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
        // lineMetrics: true, // Not needed for simple opacity animation
      });

      // Add traffic-based routes layer
      map.current.addLayer({
        id: 'routes',
        type: 'line',
        source: 'routes',
        paint: {
          'line-color': COLORS.routeArc,
          'line-width': [
            'interpolate',
            ['linear'],
            ['get', 'normalizedPassengers'],
            0, ROUTE_CONFIG.minWidth,
            1, ROUTE_CONFIG.maxWidth,
          ],
          'line-opacity': [
            'interpolate',
            ['linear'],
            ['get', 'normalizedPassengers'],
            0, ROUTE_CONFIG.minOpacity,
            1, ROUTE_CONFIG.maxOpacity,
          ],
        },
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
      });

      // Add dedicated destination airports source (separate from JFK)
      if (!map.current.getSource('dest-airports')) {
        map.current.addSource('dest-airports', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [],
          },
        });
        console.log('Created dest-airports source');
      }

      // Create airplane icon as PNG using canvas (Mapbox doesn't support SVG)
      const createAirplaneIcon = (): string => {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        if (!ctx) return '';

        // Draw background circle
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(16, 16, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Draw airplane shape (simplified)
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        // Airplane body
        ctx.moveTo(16, 6);
        ctx.lineTo(20, 10);
        ctx.lineTo(24, 8);
        ctx.lineTo(26, 12);
        ctx.lineTo(22, 14);
        ctx.lineTo(26, 16);
        ctx.lineTo(24, 20);
        ctx.lineTo(20, 18);
        ctx.lineTo(16, 22);
        ctx.lineTo(12, 18);
        ctx.lineTo(8, 20);
        ctx.lineTo(6, 16);
        ctx.lineTo(10, 14);
        ctx.lineTo(6, 12);
        ctx.lineTo(8, 8);
        ctx.lineTo(12, 10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        return canvas.toDataURL('image/png');
      };

      const airplaneIconDataUrl = createAirplaneIcon();
      
      // Load airplane icon with fallback to marker-15
      map.current.loadImage(airplaneIconDataUrl, (error, image) => {
        if (error || !image || !map.current) {
          console.error('Failed to load custom airplane icon, using marker-15 fallback:', error);
          // Continue with fallback marker
        } else {
          // Add custom image to map
          if (!map.current.hasImage('airport-airplane')) {
            map.current.addImage('airport-airplane', image);
            console.log('Custom airplane icon loaded successfully');
          }
        }

        // Create destination airport icon layer (always create, even if icon failed)
        if (map.current && !map.current.getLayer('dest-airports-icon')) {
          // Use custom icon if available, otherwise fallback to marker-15
          const iconImage = map.current.hasImage('airport-airplane') ? 'airport-airplane' : 'marker-15';
          
          map.current.addLayer({
            id: 'dest-airports-icon',
            type: 'symbol',
            source: 'dest-airports',
            layout: {
              'icon-image': iconImage,
              'icon-size': [
                'interpolate',
                ['linear'],
                ['zoom'],
                2, 0.8,
                4, 1.0,
                6, 1.2,
                8, 1.4,
                10, 1.6,
              ],
              'icon-allow-overlap': true,
              'icon-ignore-placement': true,
              'icon-optional': true,
            },
            paint: {
              'icon-opacity': 1.0,
            },
          }, 'routes-airline'); // Place above routes
          console.log('Created dest-airports-icon layer with icon:', iconImage);
        }

        // Create destination airport label layer
        if (map.current && !map.current.getLayer('dest-airports-label')) {
          map.current.addLayer({
            id: 'dest-airports-label',
            type: 'symbol',
            source: 'dest-airports',
            layout: {
              'text-field': ['get', 'iata'],
              'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
              'text-size': [
                'interpolate',
                ['linear'],
                ['zoom'],
                3, 10,
                5, 12,
                7, 14,
                9, 16,
              ],
              'text-offset': [0, 2.2],
              'text-anchor': 'top',
              'text-allow-overlap': true,
              'text-ignore-placement': true,
            },
            paint: {
              'text-color': '#e5e7eb',
              'text-halo-color': '#0b1220',
              'text-halo-width': 1.5,
              'text-halo-blur': 1,
              'text-opacity': 1.0,
            },
            minzoom: 3, // Only show labels at zoom >= 3
          }, 'dest-airports-icon'); // Place above icon
          console.log('Created dest-airports-label layer');
        }

        // Add debug circle layer (temporary - bright color to verify data exists)
        if (map.current && !map.current.getLayer('dest-airports-debug')) {
          map.current.addLayer({
            id: 'dest-airports-debug',
            type: 'circle',
            source: 'dest-airports',
            paint: {
              'circle-radius': 5,
              'circle-color': '#ff0000', // Bright red for visibility
              'circle-opacity': 0.8,
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 1,
            },
          }, 'dest-airports-icon'); // Place below icon (so icons appear on top)
          console.log('Created dest-airports-debug circle layer (temporary)');
        }
      });

      // Add intro flow animation source (for initial load animation)
      map.current.addSource('route-anim', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      // Add intro flow animation layer (airline-colored pulses)
      const introColorExpression: any[] = [
        'match',
        ['coalesce', ['get', 'carrierCode'], ''],
      ];
      Object.entries(AIRLINE_COLORS).forEach(([code, color]) => {
        introColorExpression.push(code, color);
      });
      introColorExpression.push(DEFAULT_AIRLINE_COLOR);

      map.current.addLayer({
        id: 'route-anim-pulses',
        type: 'circle',
        source: 'route-anim',
        paint: {
          'circle-radius': 7, // Increased from 5 to 7 for better visibility
          'circle-color': introColorExpression as any,
          'circle-opacity': 1.0, // Increased from 0.9 for maximum visibility
          'circle-blur': 1.2, // Increased from 0.8 for enhanced glow effect
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1.5, // Increased from 1 for better visibility
          'circle-stroke-opacity': 0.8, // Increased from 0.6 for better visibility
        },
      }, 'routes-airline'); // Place above routes for visibility

      // Add animated flights source (for continuous animation toggle)
      map.current.addSource('flights-animated', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      // Add animated flights layer (premium pulse effect with airline colors)
      // Build airline color expression for animation with null handling
      const animationColorExpression: any[] = [
        'match',
        ['coalesce', ['get', 'carrierCode'], ''],
      ];
      Object.entries(AIRLINE_COLORS).forEach(([code, color]) => {
        animationColorExpression.push(code, color);
      });
      animationColorExpression.push(COLORS.flightSymbol);
      
      map.current.addLayer({
        id: 'flights-animated',
        type: 'circle',
        source: 'flights-animated',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['get', 'normalizedPassengers'],
            0, 3,
            1, 6,
          ],
          'circle-color': [
            'case',
            ['has', 'carrierCode'],
            animationColorExpression,
            COLORS.flightSymbol,
          ] as any,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1,
          'circle-opacity': 0.95,
          'circle-blur': 0.6, // Glow effect for premium pulse
        },
      });

      // Add JFK marker source (distinct origin marker)
      map.current.addSource('jfk', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: { 
            name: 'JFK International Airport',
            code: 'JFK',
            isOrigin: true,
          },
          geometry: {
            type: 'Point',
            coordinates: JFK_COORDINATES,
          },
        },
      });

      // Add JFK glowing blue ring FIRST (circle layer beneath icon for 🔵 glow effect)
      // This must be added before the icon layer so it appears beneath
      map.current.addLayer({
        id: 'jfk-glow',
        type: 'circle',
        source: 'jfk',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            2, 14, // Visible even at zoom 2
            4, 16,
            6, 18,
            8, 20,
            10, 22,
          ],
          'circle-color': 'rgba(56, 189, 248, 0.45)', // Blue glow #38bdf8 with opacity
          'circle-stroke-color': 'rgba(96, 165, 250, 0.7)', // Lighter blue stroke #60a5fa
          'circle-stroke-width': 2,
          'circle-opacity': 1.0,
          'circle-blur': 1.2, // Soft glow effect
        },
      }, 'routes-airline'); // Place glow above routes but below JFK icon

      // Create JFK hub/origin icon (STAR shape to distinguish from destination airports)
      const createJFKHubIcon = (): string => {
        const canvas = document.createElement('canvas');
        canvas.width = 48;
        canvas.height = 48;
        const ctx = canvas.getContext('2d');
        if (!ctx) return '';

        // Draw outer glow ring (subtle)
        ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.beginPath();
        ctx.arc(24, 24, 22, 0, Math.PI * 2);
        ctx.fill();

        // Draw background circle (bright blue for origin hub)
        ctx.fillStyle = '#3b82f6'; // Blue
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(24, 24, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Draw star shape (hub/origin indicator) - 5-pointed star
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const centerX = 24;
        const centerY = 24;
        const outerRadius = 12;
        const innerRadius = 6;
        const spikes = 5;
        for (let i = 0; i < spikes * 2; i++) {
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          const angle = (i * Math.PI) / spikes - Math.PI / 2;
          const x = centerX + radius * Math.cos(angle);
          const y = centerY + radius * Math.sin(angle);
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        return canvas.toDataURL('image/png');
      };

      const jfkHubIconDataUrl = createJFKHubIcon();

      // Load JFK hub icon and add layer
      map.current.loadImage(jfkHubIconDataUrl, (error, image) => {
        if (error || !image || !map.current) {
          console.error('Failed to load JFK hub icon:', error);
          return;
        }

        if (!map.current.hasImage('jfk-hub-icon')) {
          map.current.addImage('jfk-hub-icon', image);
        }

        // Add JFK marker layer (symbol with star/hub icon - DISTINCT from destination airports)
        if (!map.current.getLayer('jfk-marker')) {
          map.current.addLayer({
            id: 'jfk-marker',
            type: 'symbol',
            source: 'jfk',
            layout: {
              'icon-image': 'jfk-hub-icon',
              'icon-size': [
                'interpolate',
                ['linear'],
                ['zoom'],
                2, 1.0, // Visible even at zoom 2
                4, 1.3,
                6, 1.5,
                8, 1.7,
                10, 1.9,
              ],
              'icon-allow-overlap': true,
              'icon-ignore-placement': true, // Always show JFK
              // JFK label - always visible
              'text-field': 'JFK',
              'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
              'text-size': [
                'interpolate',
                ['linear'],
                ['zoom'],
                2, 12, // Visible even at zoom 2
                4, 14,
                6, 16,
                8, 18,
                10, 20,
              ],
              'text-offset': [0, 3.0],
              'text-anchor': 'top',
              'text-allow-overlap': true,
              'text-ignore-placement': true,
            },
            paint: {
              'icon-opacity': 1.0,
              'text-color': '#ffffff',
              'text-halo-color': 'rgba(0, 0, 0, 0.95)',
              'text-halo-width': 4,
              'text-halo-blur': 2,
              'text-opacity': 1.0,
            },
          }, 'jfk-glow'); // Place JFK icon above glow ring (topmost layer)
        }
      });

      setMapLoaded(true);
    });

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (routeDrawInAnimationRef.current) {
        cancelAnimationFrame(routeDrawInAnimationRef.current);
        routeDrawInAnimationRef.current = null;
      }
      if (introFlowAnimationRef.current) {
        cancelAnimationFrame(introFlowAnimationRef.current);
        introFlowAnimationRef.current = null;
      }
      popup.current?.remove();
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update state choropleth data
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const source = map.current.getSource('states') as mapboxgl.GeoJSONSource;
    if (!source) return;

    // Create a map of state name to passenger count
    const statePassengers = new Map<string, { passengers: number; flights: number }>();
    stateRankings.forEach(r => {
      statePassengers.set(r.state, { passengers: r.passengers, flights: r.flights });
    });

    // Update the GeoJSON with passenger data
    const updatedGeoJSON = {
      ...statesGeoJSON,
      features: (statesGeoJSON as GeoJSON.FeatureCollection).features.map(feature => {
        const stateName = feature.properties?.name;
        const data = statePassengers.get(stateName);
        return {
          ...feature,
          properties: {
            ...feature.properties,
            passengers: data?.passengers || 0,
            flights: data?.flights || 0,
          },
        };
      }),
    };

    source.setData(updatedGeoJSON as GeoJSON.FeatureCollection);
  }, [stateRankings, mapLoaded]);

  // Route draw-in animation function (simple opacity fade-in)
  const animateRoutesIn = useCallback(() => {
    if (!map.current || !mapLoaded) return;

    // Cancel any existing animation
    if (routeDrawInAnimationRef.current) {
      cancelAnimationFrame(routeDrawInAnimationRef.current);
      routeDrawInAnimationRef.current = null;
    }

    const startTime = Date.now();
    const duration = 1800; // 1.8 seconds for smooth, premium feel

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation (ease-out)
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      // Update routes-base layer
      if (!map.current) return;
      const baseLayer = map.current.getLayer('routes-base');
      if (baseLayer) {
        map.current.setPaintProperty('routes-base', 'line-opacity', easedProgress * 0.15);
      }

      // Update routes-airline layer (if visible)
      const airlineLayer = map.current.getLayer('routes-airline');
      if (airlineLayer) {
        map.current.setPaintProperty('routes-airline', 'line-opacity', [
          '*',
          easedProgress,
          [
            'interpolate',
            ['linear'],
            ['get', 'normalizedPassengers'],
            0, ROUTE_CONFIG.minOpacity,
            1, ROUTE_CONFIG.maxOpacity,
          ],
        ] as any);
      }

      // Update routes layer (traffic-based)
      const routesLayer = map.current.getLayer('routes');
      if (routesLayer) {
        map.current.setPaintProperty('routes', 'line-opacity', [
          '*',
          easedProgress,
          [
            'interpolate',
            ['linear'],
            ['get', 'normalizedPassengers'],
            0, ROUTE_CONFIG.minOpacity,
            1, ROUTE_CONFIG.maxOpacity,
          ],
        ] as any);
      }

      if (progress < 1) {
        routeDrawInAnimationRef.current = requestAnimationFrame(animate);
      } else {
        routeDrawInAnimationRef.current = null;
        // Reset to final state
        if (!map.current) return;
        if (baseLayer) {
          map.current.setPaintProperty('routes-base', 'line-opacity', 0.15);
        }
        if (airlineLayer) {
          map.current.setPaintProperty('routes-airline', 'line-opacity', [
            'interpolate',
            ['linear'],
            ['get', 'normalizedPassengers'],
            0, ROUTE_CONFIG.minOpacity,
            1, ROUTE_CONFIG.maxOpacity,
          ]);
        }
        if (routesLayer) {
          map.current.setPaintProperty('routes', 'line-opacity', [
            'interpolate',
            ['linear'],
            ['get', 'normalizedPassengers'],
            0, ROUTE_CONFIG.minOpacity,
            1, ROUTE_CONFIG.maxOpacity,
          ]);
        }
      }
    };

    // Start animation
    routeDrawInAnimationRef.current = requestAnimationFrame(animate);
  }, [mapLoaded]);

  // Intro flow animation controller (airline-colored pulses from JFK)
  const startIntroFlowAnimation = useCallback((
    routesGeoJSON: GeoJSON.FeatureCollection,
    routes: RouteRanking[]
  ) => {
    if (!map.current || !mapLoaded) return;

    // Cancel any existing intro animation
    if (introFlowAnimationRef.current) {
      cancelAnimationFrame(introFlowAnimationRef.current);
      introFlowAnimationRef.current = null;
    }

    // Clear previous progress and cache
    introFlowProgressRef.current.clear();
    introFlowRouteCacheRef.current.clear();

    // Cap to top 50 routes for performance
    const routesToAnimate = routes.slice(0, Math.min(50, routes.length));

    // Build route cache with coordinates and carrier codes
    routesGeoJSON.features.forEach((feature, idx) => {
      if (idx >= routesToAnimate.length) return;
      
      const route = routesToAnimate[idx];
      const geometry = feature.geometry;
      
      if (geometry.type === 'LineString') {
        // Get carrier code from route
        const carrierCode = flightRoutes?.find(
          fr => fr.destinationCode === route.destinationCode
        )?.carrierCode || route.primaryCarrier?.substring(0, 2).toUpperCase() || '';
        
        introFlowRouteCacheRef.current.set(route.id, {
          coordinates: geometry.coordinates as [number, number][],
          carrierCode: carrierCode,
        });
        
        // Initialize progress
        introFlowProgressRef.current.set(route.id, 0);
      }
    });

    const startTime = Date.now();
    const duration = 2500; // 2.5 seconds for intro animation (more visible)

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Build animated points GeoJSON
      const animatedFeatures: GeoJSON.Feature<GeoJSON.Point>[] = [];

      introFlowRouteCacheRef.current.forEach((routeData, routeId) => {
        const routeProgress = introFlowProgressRef.current.get(routeId) || 0;
        
        // Advance progress (faster speed for more visible animation)
        const newProgress = Math.min(routeProgress + 0.035, progress); // Increased from 0.02 to 0.035
        introFlowProgressRef.current.set(routeId, newProgress);

        // Only show pulse if progress is within animation window
        if (newProgress > 0 && newProgress < 1) {
          // Get point along route line
          const point = getPointAlongLine(routeData.coordinates, newProgress);
          
          animatedFeatures.push({
            type: 'Feature',
            properties: {
              routeId: routeId,
              carrierCode: routeData.carrierCode,
            },
            geometry: {
              type: 'Point',
              coordinates: point,
            },
          });
        }
      });

      // Update source
      if (!map.current) return;
      const animSource = map.current.getSource('route-anim') as mapboxgl.GeoJSONSource;
      if (animSource) {
        animSource.setData({
          type: 'FeatureCollection',
          features: animatedFeatures,
        });
      }

      // Continue animation or stop
      if (progress < 1) {
        introFlowAnimationRef.current = requestAnimationFrame(animate);
      } else {
        // Animation complete - clear the source
        if (animSource) {
          animSource.setData({
            type: 'FeatureCollection',
            features: [],
          });
        }
        introFlowAnimationRef.current = null;
        introFlowProgressRef.current.clear();
        introFlowRouteCacheRef.current.clear();
      }
    };

    // Start animation
    introFlowAnimationRef.current = requestAnimationFrame(animate);
  }, [mapLoaded, flightRoutes]);

  // Update routes (base, airline-colored, and traffic-based)
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const routesGeoJSON = routesToGeoJSON(displayRoutes, maxPassengers, flightRoutes);
    
    // Update base routes (always show, low opacity)
    const baseSource = map.current.getSource('routes-base') as mapboxgl.GeoJSONSource;
    if (baseSource) {
      baseSource.setData(routesGeoJSON);
    }

    // Update airline-colored routes
    const airlineSource = map.current.getSource('routes-airline') as mapboxgl.GeoJSONSource;
    if (airlineSource) {
      airlineSource.setData(routesGeoJSON);
    }

    // Update traffic-based routes
    const trafficSource = map.current.getSource('routes') as mapboxgl.GeoJSONSource;
    if (trafficSource) {
      trafficSource.setData(routesGeoJSON);
    }

    // Reset animation progress when routes change
    animationProgressRef.current.clear();
    displayRoutes.forEach((route) => {
      animationProgressRef.current.set(route.id, Math.random() * 0.3); // Stagger start
    });

    // Trigger route draw-in animation when routes update
    if (displayRoutes.length > 0) {
      // Small delay to ensure data is set before animating
      setTimeout(() => {
        animateRoutesIn();
      }, 100);
    }

    // Start intro flow animation after routes are loaded
    // Use map.once("idle") to ensure data is fully rendered
    // This creates the visible "pulses traveling from JFK" effect
    if (displayRoutes.length > 0 && map.current) {
      map.current.once('idle', () => {
        // Small delay to let draw-in animation start first
        setTimeout(() => {
          startIntroFlowAnimation(routesGeoJSON, displayRoutes);
        }, 200);
      });
    }
  }, [displayRoutes, maxPassengers, mapLoaded, flightRoutes, animateRoutesIn, startIntroFlowAnimation]);

  // Update destination airports
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const destAirportsSource = map.current.getSource('dest-airports') as mapboxgl.GeoJSONSource;
    if (!destAirportsSource) {
      console.warn('dest-airports source not found');
      return;
    }

    const airportsGeoJSON = routesToAirportsGeoJSON(displayRoutes);
    console.log(`DEST airports features: ${airportsGeoJSON.features.length}`);
    
    // Debug: Log first few airports to verify coordinates
    if (airportsGeoJSON.features.length > 0) {
      const firstAirport = airportsGeoJSON.features[0];
      console.log('Sample airport:', {
        iata: firstAirport.properties?.iata,
        coordinates: firstAirport.geometry.coordinates,
        name: firstAirport.properties?.name,
      });
    }

    destAirportsSource.setData(airportsGeoJSON);
    
    // Ensure destination airport layers are visible
    const iconLayer = map.current.getLayer('dest-airports-icon');
    const labelLayer = map.current.getLayer('dest-airports-label');
    const debugLayer = map.current.getLayer('dest-airports-debug');
    
    if (iconLayer) {
      map.current.setLayoutProperty('dest-airports-icon', 'visibility', 'visible');
    }
    if (labelLayer) {
      map.current.setLayoutProperty('dest-airports-label', 'visibility', 'visible');
    }
    if (debugLayer) {
      map.current.setLayoutProperty('dest-airports-debug', 'visibility', 'visible');
    }
  }, [displayRoutes, mapLoaded]);

  // JFK pulsing glow animation (subtle, premium effect)
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Cancel any existing pulse animation
    if (jfkPulseAnimationRef.current) {
      cancelAnimationFrame(jfkPulseAnimationRef.current);
      jfkPulseAnimationRef.current = null;
    }

    const startTime = Date.now();
    const pulseDuration = 2000; // 2 seconds per pulse cycle

    const animate = () => {
      if (!map.current) return;

      const elapsed = Date.now() - startTime;
      const progress = (elapsed % pulseDuration) / pulseDuration;
      
      // Use sine wave for smooth pulsing (0 to 1)
      const pulseValue = (Math.sin(progress * Math.PI * 2) + 1) / 2; // 0 to 1
      
      // Pulse radius: base radius ± 25% (subtle but noticeable)
      const baseRadius = 18; // Base radius at zoom 6
      const radiusVariation = baseRadius * 0.25; // ±25%
      const currentRadius = baseRadius + (pulseValue * radiusVariation * 2 - radiusVariation);
      
      // Pulse opacity: base opacity ± 15% (subtle)
      const baseOpacity = 0.45;
      const opacityVariation = 0.15;
      const currentOpacity = baseOpacity + (pulseValue * opacityVariation * 2 - opacityVariation);

      // Update JFK glow layer
      const glowLayer = map.current.getLayer('jfk-glow');
      if (glowLayer) {
        // Apply pulse to radius (multiply base by pulse factor)
        const pulseFactor = currentRadius / baseRadius;
        map.current.setPaintProperty('jfk-glow', 'circle-radius', [
          '*',
          pulseFactor,
          [
            'interpolate',
            ['linear'],
            ['zoom'],
            2, 14, // Visible even at zoom 2
            4, 16,
            6, 18,
            8, 20,
            10, 22,
          ],
        ] as any);
        
        // Update opacity
        map.current.setPaintProperty('jfk-glow', 'circle-opacity', currentOpacity);
      }

      // Continue animation
      jfkPulseAnimationRef.current = requestAnimationFrame(animate);
    };

    // Start animation
    jfkPulseAnimationRef.current = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      if (jfkPulseAnimationRef.current) {
        cancelAnimationFrame(jfkPulseAnimationRef.current);
        jfkPulseAnimationRef.current = null;
      }
    };
  }, [mapLoaded]);

  // Update choropleth with quantile breaks
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Update fill-color expression with quantile breaks
    map.current.setPaintProperty('states-fill', 'fill-color', [
      'case',
      ['has', 'passengers'],
      [
        'step',
        ['get', 'passengers'],
        COLORS.choropleth[0],
        ...quantileBreaks.slice(1).flatMap((breakVal, i) => [
          breakVal,
          COLORS.choropleth[Math.min(i + 1, COLORS.choropleth.length - 1)],
        ]),
      ],
      'rgba(0, 0, 0, 0)',
    ]);
  }, [quantileBreaks, mapLoaded]);

  // Update layer visibility based on toggles
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Ensure layers exist before toggling
    const airlineLayer = map.current.getLayer('routes-airline');
    const routesLayer = map.current.getLayer('routes');
    
    if (!airlineLayer || !routesLayer) return;

    // Show/hide airline routes vs traffic routes
    if (colorByAirline) {
      map.current.setLayoutProperty('routes-airline', 'visibility', 'visible');
      map.current.setLayoutProperty('routes', 'visibility', 'none');
      map.current.setLayoutProperty('routes-base', 'visibility', 'visible'); // Keep base layer visible
    } else {
      map.current.setLayoutProperty('routes-airline', 'visibility', 'none');
      map.current.setLayoutProperty('routes', 'visibility', 'visible');
      map.current.setLayoutProperty('routes-base', 'visibility', 'visible'); // Keep base layer visible
    }

      // Airports are always visible - no toggle needed

    // Show/hide animated flights
    const flightsLayer = map.current.getLayer('flights-animated');
    if (flightsLayer) {
      map.current.setLayoutProperty('flights-animated', 'visibility', animateFlights ? 'visible' : 'none');
    }
  }, [colorByAirline, animateFlights, mapLoaded]);


  // Handle airline route highlighting
  useEffect(() => {
    if (!map.current || !mapLoaded || !colorByAirline) return;

    try {
      const airlineLayer = map.current.getLayer('routes-airline');
      if (!airlineLayer) return;

      // Update route opacity and width based on highlight
      if (highlightedAirline) {
        // Dim all routes except the highlighted airline
        map.current.setPaintProperty('routes-airline', 'line-opacity', [
          'case',
          ['==', ['coalesce', ['get', 'primaryCarrierCode'], ''], highlightedAirline],
          [
            'interpolate',
            ['linear'],
            ['get', 'normalizedPassengers'],
            0, ROUTE_CONFIG.minOpacity,
            1, ROUTE_CONFIG.maxOpacity,
          ],
          0.15, // Dimmed opacity for non-highlighted routes
        ] as any);
        
        // Make highlighted routes thicker
        map.current.setPaintProperty('routes-airline', 'line-width', [
          'case',
          ['==', ['coalesce', ['get', 'primaryCarrierCode'], ''], highlightedAirline],
          [
            'interpolate',
            ['linear'],
            ['get', 'normalizedPassengers'],
            0, ROUTE_CONFIG.minWidth * 1.5,
            1, ROUTE_CONFIG.maxWidth * 1.5,
          ],
          [
            'interpolate',
            ['linear'],
            ['get', 'normalizedPassengers'],
            0, ROUTE_CONFIG.minWidth * 0.5,
            1, ROUTE_CONFIG.maxWidth * 0.5,
          ],
        ] as any);
      } else {
        // Reset to normal opacity and width
        map.current.setPaintProperty('routes-airline', 'line-opacity', [
          'interpolate',
          ['linear'],
          ['get', 'normalizedPassengers'],
          0, ROUTE_CONFIG.minOpacity,
          1, ROUTE_CONFIG.maxOpacity,
        ]);
        
        map.current.setPaintProperty('routes-airline', 'line-width', [
          'interpolate',
          ['linear'],
          ['get', 'normalizedPassengers'],
          0, ROUTE_CONFIG.minWidth,
          1, ROUTE_CONFIG.maxWidth,
        ]);
      }
    } catch (error) {
      console.error('Error updating airline highlight:', error);
    }
  }, [highlightedAirline, colorByAirline, mapLoaded]);

  // Animation system for flight journeys
  useEffect(() => {
    if (!map.current || !mapLoaded || !animateFlights) {
      // Stop animation if disabled
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const animate = () => {
      if (!map.current) return;

      const flightsSource = map.current.getSource('flights-animated') as mapboxgl.GeoJSONSource;
      if (!flightsSource) return;

      // Limit to top routes for performance
      const routesToAnimate = displayRoutes.slice(0, Math.min(50, displayRoutes.length));
      
      // Get route features for geometry lookup (try both sources)
      if (!map.current) return;
      const routesSource = map.current.getSource('routes') as mapboxgl.GeoJSONSource;
      const airlineSource = map.current.getSource('routes-airline') as mapboxgl.GeoJSONSource;
      const routesData = routesSource?._data;
      const airlineData = airlineSource?._data;
      const routeFeatures = (
        (routesData && typeof routesData !== 'string' && 'features' in routesData ? routesData.features : null) ||
        (airlineData && typeof airlineData !== 'string' && 'features' in airlineData ? airlineData.features : null) ||
        []
      ) as any[];
      
      const features: GeoJSON.Feature<GeoJSON.Point>[] = routesToAnimate.map(route => {
        const routeId = route.id;
        let progress = animationProgressRef.current.get(routeId) || 0;
        
        // Update progress (speed varies slightly by distance for visual interest)
        const speed = 0.003 + (route.distanceMiles / 3000) * 0.002; // Faster for longer routes
        progress += speed;
        if (progress > 1) progress = 0; // Loop
        
        animationProgressRef.current.set(routeId, progress);

        // Find route feature for geometry
        const routeFeature = routeFeatures.find((f: any) => f.properties?.id === routeId);
        
        if (routeFeature?.geometry?.coordinates) {
          const point = getPointAlongLine(routeFeature.geometry.coordinates, progress);
          
          // Get carrier code from route feature or flightRoutes
          const carrierCode = routeFeature.properties?.primaryCarrierCode || 
                            flightRoutes?.find(fr => fr.destinationCode === route.destinationCode)?.carrierCode || 
                            null;
          
          // Get normalized passengers for size scaling
          const normalizedPassengers = routeFeature.properties?.normalizedPassengers || 0;
          
          return {
            type: 'Feature',
            properties: {
              routeId,
              destinationCode: route.destinationCode,
              carrierCode: carrierCode,
              normalizedPassengers: normalizedPassengers,
            },
            geometry: {
              type: 'Point',
              coordinates: point,
            },
          };
        }
        return null;
      }).filter((f): f is GeoJSON.Feature<GeoJSON.Point> => {
        return f !== null && f !== undefined;
      });

      flightsSource.setData({
        type: 'FeatureCollection',
        features,
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [displayRoutes, mapLoaded, animateFlights]);

  // Handle route hover for tooltip (works with all route layers)
  useEffect(() => {
    if (!map.current || !mapLoaded || !popup.current) return;

    const routeLayers = ['routes', 'routes-airline', 'routes-base'];
    
    const handleMouseMove = (e: mapboxgl.MapMouseEvent) => {
      if (!map.current || !popup.current) return;
      
      const features = map.current.queryRenderedFeatures(e.point, {
        layers: routeLayers,
      });

      if (features.length > 0) {
        const feature = features[0];
        const props = feature.properties;
        
        if (props) {
          map.current.getCanvas().style.cursor = 'pointer';
          
          const carrierCode = props.primaryCarrierCode || '';
          // Get color for tooltip display
          const airlineColor = carrierCode ? AIRLINE_COLORS[carrierCode] || '#60a5fa' : '';
          const colorStyle = airlineColor ? `style="color: ${airlineColor};"` : '';
          
          const html = `
            <div class="text-sm">
              <div class="font-bold text-white mb-2">
                JFK → ${props.destinationCity} (${props.destinationCode})
              </div>
              <div class="text-gray-300 mb-1">${props.destinationState}</div>
              <hr class="border-gray-600 my-2" />
              <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <span class="text-gray-400">Distance:</span>
                <span class="text-white font-medium">${formatDistance(props.distance)}</span>
                <span class="text-gray-400">Passengers:</span>
                <span class="text-white font-medium">${formatNumber(props.passengers)}</span>
                <span class="text-gray-400">Flights:</span>
                <span class="text-white font-medium">${formatNumber(props.flights)}</span>
                <span class="text-gray-400">Avg/Flight:</span>
                <span class="text-white font-medium">${props.avgPerFlight}</span>
                <span class="text-gray-400">Top Carrier:</span>
                <span class="text-white font-medium" ${colorStyle}>${props.primaryCarrier}${carrierCode ? ` (${carrierCode})` : ''}</span>
              </div>
            </div>
          `;
          
          popup.current.setLngLat(e.lngLat).setHTML(html).addTo(map.current);
        }
      } else {
        map.current.getCanvas().style.cursor = '';
        popup.current.remove();
      }
    };

    const handleMouseLeave = () => {
      if (!map.current || !popup.current) return;
      map.current.getCanvas().style.cursor = '';
      popup.current.remove();
    };

    routeLayers.forEach(layer => {
      map.current?.on('mousemove', layer, handleMouseMove);
      map.current?.on('mouseleave', layer, handleMouseLeave);
    });

    return () => {
      if (map.current) {
        routeLayers.forEach(layer => {
          map.current?.off('mousemove', layer, handleMouseMove);
          map.current?.off('mouseleave', layer, handleMouseLeave);
        });
      }
    };
  }, [mapLoaded]);

  // Format number with Intl.NumberFormat for tooltips
  const formatTooltipNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  // Handle airport click and hover
  useEffect(() => {
    if (!map.current || !mapLoaded || !hoverPopup.current) return;

    // Handle destination airport hover (anchored tooltip)
    const handleDestAirportEnter = (e: mapboxgl.MapMouseEvent) => {
      if (!map.current || !hoverPopup.current || !e.features || e.features.length === 0) return;
      
      const feature = e.features[0];
      const props = feature.properties as any;
      const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
      
      map.current.getCanvas().style.cursor = 'pointer';
      
      // Get top carrier color if available
      const topCarrierCode = props?.topCarrierCode || '';
      const carrierColor = topCarrierCode && AIRLINE_COLORS[topCarrierCode] 
        ? AIRLINE_COLORS[topCarrierCode] 
        : '';
      const colorStyle = carrierColor ? `color: ${carrierColor};` : '';
      
      const airportName = props?.name || props?.airportName || 'Airport';
      const iata = props?.iata || '';
      const city = props?.city || '';
      const state = props?.state || '';
      const totalPassengers = props?.totalPassengers || 0;
      const totalFlights = props?.totalFlights || 0;
      const topCarrier = props?.topCarrier || '';
      
      const html = `
        <div style="font-family: 'Inter', system-ui, sans-serif;">
          <div style="font-weight: 600; font-size: 15px; color: #e5e7eb; margin-bottom: 4px; line-height: 1.3;">
            ${airportName}${iata ? ` (${iata})` : ''}
          </div>
          <div style="font-size: 12px; color: #94a3b8; margin-bottom: 10px;">
            ${city}${city && state ? ', ' : ''}${state}
          </div>
          <div style="border-top: 1px solid rgba(148, 163, 184, 0.18); padding-top: 8px; margin-top: 8px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 12px;">
              <span style="color: #94a3b8;">Passengers:</span>
              <span style="color: #e5e7eb; font-weight: 500;">${formatTooltipNumber(totalPassengers)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 12px;">
              <span style="color: #94a3b8;">Flights:</span>
              <span style="color: #e5e7eb; font-weight: 500;">${formatTooltipNumber(totalFlights)}</span>
            </div>
            ${topCarrier ? `
              <div style="display: flex; justify-content: space-between; font-size: 12px;">
                <span style="color: #94a3b8;">Top airline:</span>
                <span style="color: #e5e7eb; font-weight: 500; ${colorStyle}">
                  ${topCarrier}${topCarrierCode ? ` (${topCarrierCode})` : ''}
                </span>
              </div>
            ` : ''}
          </div>
        </div>
      `;
      
      hoverPopup.current
        .setLngLat(coords)
        .setHTML(html)
        .addTo(map.current);
    };

    const handleDestAirportLeave = () => {
      if (!map.current || !hoverPopup.current) return;
      map.current.getCanvas().style.cursor = '';
      hoverPopup.current.remove();
    };

    // Handle JFK hover (anchored tooltip)
    const handleJFKEnter = (e: mapboxgl.MapMouseEvent) => {
      if (!map.current || !hoverPopup.current || !e.features || e.features.length === 0) return;
      
      const feature = e.features[0];
      const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
      
      map.current.getCanvas().style.cursor = 'pointer';
      
      const html = `
        <div style="font-family: 'Inter', system-ui, sans-serif;">
          <div style="font-weight: 600; font-size: 15px; color: #e5e7eb; margin-bottom: 4px; line-height: 1.3;">
            JFK (Origin)
          </div>
          <div style="font-size: 12px; color: #94a3b8; margin-bottom: 10px;">
            New York, NY
          </div>
          <div style="border-top: 1px solid rgba(148, 163, 184, 0.18); padding-top: 8px; margin-top: 8px;">
            <div style="font-size: 12px; color: #94a3b8;">
              Origin hub for all domestic routes
            </div>
          </div>
        </div>
      `;
      
      hoverPopup.current
        .setLngLat(coords)
        .setHTML(html)
        .addTo(map.current);
    };

    const handleJFKLeave = () => {
      if (!map.current || !hoverPopup.current) return;
      map.current.getCanvas().style.cursor = '';
      hoverPopup.current.remove();
    };

    // Handle destination airport click (keep existing behavior)
    const handleAirportClick = (e: mapboxgl.MapMouseEvent) => {
      if (!map.current || !onStateClick) return;
      
      const features = map.current.queryRenderedFeatures(e.point, {
        layers: ['dest-airports-icon', 'dest-airports-label'],
      });

      if (features.length > 0) {
        const props = features[0].properties as any;
        if (props?.stateCode || props?.state) {
          onStateClick(props.stateCode || props.state);
        }
      }
    };

    // Handle JFK click
    const handleJFKClick = (e: mapboxgl.MapMouseEvent) => {
      if (!map.current || !popup.current) return;
      
      const html = `
        <div class="text-sm min-w-[200px]">
          <div class="font-bold text-white mb-1 text-base">
            JFK International Airport
          </div>
          <div class="text-gray-300 mb-2 text-xs">
            JFK • New York, NY
          </div>
          <hr class="border-gray-600 my-2" />
          <div class="text-xs text-gray-400">
            <div class="mb-1">Origin hub for all domestic routes</div>
            <div class="text-gray-500 mt-2">Click to reset view</div>
          </div>
        </div>
      `;
      
      popup.current.setLngLat(e.lngLat).setHTML(html).addTo(map.current);
      
      // Optional: Reset map view to show all routes
      if (map.current) {
        map.current.flyTo({
          center: MAP_CONFIG.initialCenter,
          zoom: MAP_CONFIG.initialZoom,
          duration: 1000,
        });
      }
    };

    // Destination airport events (anchored hover tooltips)
    map.current.on('mouseenter', 'dest-airports-icon', handleDestAirportEnter);
    map.current.on('mouseleave', 'dest-airports-icon', handleDestAirportLeave);
    map.current.on('mouseenter', 'dest-airports-label', handleDestAirportEnter);
    map.current.on('mouseleave', 'dest-airports-label', handleDestAirportLeave);
    map.current.on('click', 'dest-airports-icon', handleAirportClick);
    map.current.on('click', 'dest-airports-label', handleAirportClick);
    
    // JFK events (anchored hover tooltip)
    map.current.on('mouseenter', 'jfk-marker', handleJFKEnter);
    map.current.on('mouseleave', 'jfk-marker', handleJFKLeave);
    map.current.on('click', 'jfk-marker', handleJFKClick);

    return () => {
      if (map.current) {
        map.current.off('mouseenter', 'dest-airports-icon', handleDestAirportEnter);
        map.current.off('mouseleave', 'dest-airports-icon', handleDestAirportLeave);
        map.current.off('mouseenter', 'dest-airports-label', handleDestAirportEnter);
        map.current.off('mouseleave', 'dest-airports-label', handleDestAirportLeave);
        map.current.off('click', 'dest-airports-icon', handleAirportClick);
        map.current.off('click', 'dest-airports-label', handleAirportClick);
        map.current.off('mouseenter', 'jfk-marker', handleJFKEnter);
        map.current.off('mouseleave', 'jfk-marker', handleJFKLeave);
        map.current.off('click', 'jfk-marker', handleJFKClick);
      }
      if (hoverPopup.current) {
        hoverPopup.current.remove();
      }
    };
  }, [mapLoaded, onStateClick]);

  // Handle state click
  const handleStateClick = useCallback((e: mapboxgl.MapMouseEvent) => {
    if (!map.current || !onStateClick) return;
    
    const features = map.current.queryRenderedFeatures(e.point, {
      layers: ['states-fill'],
    });

    if (features.length > 0) {
      const stateName = features[0].properties?.name;
      if (stateName) {
        onStateClick(stateName);
      }
    }
  }, [onStateClick]);

  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    map.current.on('click', 'states-fill', handleStateClick);

    return () => {
      if (map.current) {
        map.current.off('click', 'states-fill', handleStateClick);
      }
    };
  }, [mapLoaded, handleStateClick]);

  // Handle state highlighting
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Reset all states
    const features = map.current.querySourceFeatures('states');
    features.forEach(feature => {
      if (feature.id !== undefined) {
        map.current?.setFeatureState(
          { source: 'states', id: feature.id },
          { highlighted: false }
        );
      }
    });

    // Highlight the selected state
    if (highlightedState) {
      const stateFeature = features.find(
        f => f.properties?.name === highlightedState
      );
      if (stateFeature && stateFeature.id !== undefined) {
        map.current.setFeatureState(
          { source: 'states', id: stateFeature.id },
          { highlighted: true }
        );
      }
    }
  }, [highlightedState, mapLoaded]);

  return (
    <div className="relative flex-1 h-full">
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Map Controls */}
      <MapControls
        routeMode={routeMode}
        topNRoutes={topNRoutes}
        totalRoutes={routeRankings.length}
        onRouteModeChange={onRouteModeChange}
        onTopNChange={onTopNChange}
        colorByAirline={colorByAirline}
        animateFlights={animateFlights}
        onColorByAirlineChange={setColorByAirline}
        onAnimateFlightsChange={setAnimateFlights}
      />
      

      {/* Airline Color Legend (only show when coloring by airline) - Moved to top-left to avoid blocking zoom */}
      {colorByAirline && (
        <div className="absolute top-4 left-4 bg-panel-light/95 backdrop-blur-sm rounded-lg p-3 shadow-xl border border-gray-700 z-10 max-w-[200px] max-h-[400px] flex flex-col">
          <h4 className="text-xs font-semibold text-white mb-2 uppercase tracking-wide">
            Airlines (Click to highlight)
          </h4>
          <div className="space-y-1 overflow-y-auto flex-1">
            {Object.entries(AIRLINE_COLORS).map(([code, color]) => {
              // Check if this airline code appears in any route
              const hasRoute = displayRoutes.some(r => {
                const routeFlights = flightRoutes?.filter(
                  fr => fr.destinationCode === r.destinationCode && fr.carrierCode === code
                );
                return routeFlights && routeFlights.length > 0;
              });
              if (!hasRoute) return null;
              
              const isHighlighted = highlightedAirline === code;
              
              return (
                <button
                  key={code}
                  onClick={() => onAirlineClick?.(code)}
                  className={`w-full flex items-center gap-2 text-xs p-1.5 rounded transition-all ${
                    isHighlighted
                      ? 'bg-accent/20 border border-accent'
                      : 'hover:bg-gray-800/50 border border-transparent'
                  }`}
                  title={`Click to ${isHighlighted ? 'clear' : 'highlight'} ${code} routes`}
                >
                  <div
                    className="w-4 h-4 rounded flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className={`text-gray-300 ${isHighlighted ? 'font-semibold text-white' : ''}`}>
                    {code}
                  </span>
                  {isHighlighted && (
                    <span className="ml-auto text-accent text-xs">●</span>
                  )}
                </button>
              );
            })}
          </div>
          {highlightedAirline && (
            <button
              onClick={() => onAirlineClick?.('')}
              className="mt-2 text-xs text-gray-400 hover:text-white transition-colors text-center w-full py-1"
            >
              Clear highlight
            </button>
          )}
        </div>
      )}

      {/* Loading overlay */}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-panel flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  );
}
