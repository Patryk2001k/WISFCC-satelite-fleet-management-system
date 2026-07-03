// Plik: src/features/map/CesiumMap.tsx
import React, { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import * as satellite from 'satellite.js';
// ZMIANA: Importujemy useSpaceObjectsCache (pobierający całą przestrzeń /api/space-objects) zamiast floty [1]
import { useSpaceObjectsCache, type SpaceObjectDTO } from '../../services/spaceObjectsRequest';
import { useCasAlertsCache, type CasAlertDTO } from '../../services/casRequest';
import { useUserPreferences, type UserPreferencesDTO } from '../../services/settingsRequest';

Cesium.Ion.defaultAccessToken = '';

const CesiumMap: React.FC = () => {
  const cesiumContainer = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);

  // ZMIANA: Zamiast useSpaceObjectsFleetCache używamy useSpaceObjectsCache [1]
  const { data: spaceObjects } = useSpaceObjectsCache();
  const { data: cas } = useCasAlertsCache();
  const { data: preferences } = useUserPreferences();

  // 1. Inicjalizacja samej mapy Cesium (tylko raz przy montowaniu)
  useEffect(() => {
    if (cesiumContainer.current && !viewerRef.current) {
      const viewer = new Cesium.Viewer(cesiumContainer.current, {
        animation: true, 
        timeline: true,  
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        infoBox: true,
        sceneModePicker: false,
        navigationHelpButton: false,
        baseLayer: Cesium.ImageryLayer.fromProviderAsync(
          Cesium.TileMapServiceImageryProvider.fromUrl(
            Cesium.buildModuleUrl('Assets/Textures/NaturalEarthII')
          )
        ),
      });

      viewer.screenSpaceEventHandler.setInputAction(() => {
        viewer.trackedEntity = undefined;
      }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

      // Kamera nad Europą
      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(19.94, 50.06, 20000000)
      });

      const creditDisplay = viewer.cesiumWidget.creditContainer as HTMLElement;
      if (creditDisplay) creditDisplay.style.display = 'none';
      
      viewerRef.current = viewer;
    }

    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, []);

  // 2. Reakcja na zmianę danych przestrzeni kosmicznej, alertów lub preferencji [1]
  useEffect(() => {
    if (viewerRef.current && spaceObjects) {
      // Rysujemy całą przestrzeń kosmiczną /api/space-objects [1]
      drawTrajectories(spaceObjects, cas?.alerts || [], preferences); 
    }
  }, [spaceObjects, cas, preferences]);

  const drawTrajectories = (objects: SpaceObjectDTO[], alerts: CasAlertDTO[], prefs?: UserPreferencesDTO) => {
    if (!viewerRef.current) return;
    const viewer = viewerRef.current;

    viewer.entities.removeAll();

    const startTime = viewer.clock.currentTime;
    const stopTime = Cesium.JulianDate.addMinutes(startTime, 100, new Cesium.JulianDate());

    viewer.clock.startTime = startTime;
    viewer.clock.stopTime = stopTime;
    viewer.clock.currentTime = startTime;
    viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;
    viewer.clock.multiplier = 10; 

    const simulationAvailability = new Cesium.TimeIntervalCollection([
      new Cesium.TimeInterval({ start: startTime, stop: stopTime })
    ]);

    let validSatellitesDrawn = 0;

    objects.forEach(sat => {
      if (!sat.tleLine1 || !sat.tleLine2 || sat.tleLine1.length < 50) return;

      try {
        // --- SPRAWDZANIE ALERTRU KOLIZJI DLA TEGO OBIEKTU ---
        const activeCollisionAlert = alerts.find(alert => 
          (alert.ourSatelliteId === sat.id || alert.threatCatalogId === sat.catalogId)
        );

        // --- WARUNKOWE UKRYWANIE DEBRIS (Działa bezbłędnie na pełnej bazie obiektów) [1] ---
        const isDebris = sat.type === 'DEBRIS';
        if (isDebris && !activeCollisionAlert && prefs && !prefs.showDebrisEnabled) {
          return; // Pomijamy rysowanie niekolidującego śmiecia kosmicznego [1]
        }

        const satrec = satellite.twoline2satrec(sat.tleLine1, sat.tleLine2);
        const positionProperty = new Cesium.SampledPositionProperty();
        
        positionProperty.forwardExtrapolationType = Cesium.ExtrapolationType.HOLD;
        positionProperty.backwardExtrapolationType = Cesium.ExtrapolationType.HOLD;
        
        positionProperty.setInterpolationOptions({
          interpolationDegree: 5,
          interpolationAlgorithm: Cesium.LagrangePolynomialApproximation
        });

        for (let i = 0; i <= 100; i += 1) {
          const time = Cesium.JulianDate.addMinutes(startTime, i, new Cesium.JulianDate());
          const jsDate = Cesium.JulianDate.toDate(time);
          const positionAndVelocity = satellite.propagate(satrec, jsDate);
          
          if (positionAndVelocity.position && typeof positionAndVelocity.position !== 'boolean') {
            const pos = positionAndVelocity.position as satellite.EciVec3<number>;
            const gmst = satellite.gstime(jsDate);
            const positionGd = satellite.eciToGeodetic(pos, gmst);
            
            const cartesianPosition = Cesium.Cartesian3.fromRadians(
              positionGd.longitude, 
              positionGd.latitude, 
              positionGd.height * 1000 
            );
            positionProperty.addSample(time, cartesianPosition);
          }
        }

        let entityColor = Cesium.Color.CYAN;
        let entityAvailability = simulationAvailability;

        if (activeCollisionAlert) {
          const risk = activeCollisionAlert.riskLevel;
          if (risk === 'CRITICAL' || risk === 'HIGH') {
            entityColor = Cesium.Color.RED;
          } else if (risk === 'MEDIUM') {
            entityColor = Cesium.Color.ORANGE;
          } else if (risk === 'LOW') {
            entityColor = Cesium.Color.YELLOW;
          }

          const tcaJulian = Cesium.JulianDate.fromIso8601(activeCollisionAlert.timeOfClosestApproach);

          entityAvailability = new Cesium.TimeIntervalCollection([
            new Cesium.TimeInterval({
              start: startTime,
              stop: tcaJulian,
              isStartIncluded: true,
              isStopIncluded: false
            })
          ]);
        }

        viewer.entities.add({
          id: `sat-${sat.id}`,
          name: sat.name,
          availability: entityAvailability,
          description: `Catalog ID: ${sat.catalogId}<br/>Type: ${sat.type}`,
          position: positionProperty,
          point: { 
            pixelSize: 8, 
            color: entityColor, 
            outlineColor: Cesium.Color.WHITE, 
            outlineWidth: 2 
          },
          label: {
            text: sat.name, font: '12px Roboto Mono', fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK, outlineWidth: 2, style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, -20),
          },
          path: {
            resolution: 60,
            material: new Cesium.PolylineGlowMaterialProperty({ glowPower: 0.1, color: entityColor }), 
            width: 2,
            leadTime: 0,           
            trailTime: 60 * 100,   
          },
        });
        
        validSatellitesDrawn++;
      } catch (e) {
        console.error(`❌ Error calculating orbit for ${sat.name}`, e);
      }
    });

    console.log(`✅ Drawn ${validSatellitesDrawn} trajectories. All space objects mapped.`);
  };

  return (
    <div ref={cesiumContainer} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
  );
};

export default CesiumMap;