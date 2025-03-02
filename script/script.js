document.addEventListener('DOMContentLoaded', () => {
    // Center the map on Oregon
    const map = L.map('map1').setView([43.8041, -120.5542], 6);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    Promise.all([
        fetch('https://cdn.glitch.global/e21649a5-f914-4bd4-9bf5-854ca69d41da/Fire_Stations.geojson?v=1740945557392').then(response => response.json()),
        fetch('https://cdn.glitch.global/e21649a5-f914-4bd4-9bf5-854ca69d41da/OR_Counties_Shapefile.geojson?v=1740945567646').then(response => response.json()),
        fetch('https://cdn.glitch.global/e17011c7-f706-4438-a49e-a94a2f1ef3c3/pop.geojson?v=1740949341202').then(response => response.json())
    ]).then(([pointsData, countiesData, popData]) => {
        console.log('GeoJSON data loaded:', pointsData, countiesData, popData);

        // Join population data to counties
        const popDict = {};
        popData.features.forEach(feature => {
            const name = feature.properties.instName;
            popDict[name] = feature.properties.population;
        });

        // Calculate the counts and normalized counts
        const counts = countiesData.features.map(county => {
            const count = turf.pointsWithinPolygon(turf.featureCollection(pointsData.features), county).features.length;
            const population = popDict[county.properties.instName] || 0;
            county.properties.point_count = count;
            county.properties.population = population;
            county.properties.normalized_count = population ? population / count : 0;
            return county;
        });

        // Original Choropleth Map
        const geojsonLayer = L.geoJSON(countiesData, {
            style: feature => {
                const count = feature.properties.point_count;
                return {
                    fillColor: getColor(count),
                    weight: 2,
                    opacity: 1,
                    color: 'black',
                    dashArray: '3',
                    fillOpacity: 0.7
                };
            },
            onEachFeature: (feature, layer) => {
                layer.bindPopup(`County: ${feature.properties.instName}<br>Count: ${feature.properties.point_count}`);
            }
        }).addTo(map);

        const pointsLayer = L.geoJSON(pointsData, {
            pointToLayer: (feature, latlng) => {
                return L.circleMarker(latlng, {
                    radius: 1,
                    fillColor: '#000000',
                    color: '#000000',
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 1
                });
            }
        }).addTo(map);

        addLegend(map);

        // New Choropleth Map for Normalized Data
        const map2 = L.map('map2').setView([43.8041, -120.5542], 6);

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map2);

        const normalizedGeojsonLayer = L.geoJSON(countiesData, {
            style: feature => {
                const normalizedCount = feature.properties.normalized_count;
                return {
                    fillColor: getColorNormalized(normalizedCount),
                    weight: 2,
                    opacity: 1,
                    color: 'black',
                    dashArray: '3',
                    fillOpacity: 0.7
                };
            },
            onEachFeature: (feature, layer) => {
                layer.bindPopup(`County: ${feature.properties.instName}<br>Normalized Count: ${feature.properties.normalized_count.toFixed(2)}`);
            }
        }).addTo(map2);

        const pointsLayer2 = L.geoJSON(pointsData, {
            pointToLayer: (feature, latlng) => {
                return L.circleMarker(latlng, {
                    radius: 1,
                    fillColor: '#000000',
                    color: '#000000',
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 1
                });
            }
        }).addTo(map2);

        addNormalizedLegend(map2);
    });

    function getColor(d) {
        return d > 100 ? '#800026' :
               d > 50  ? '#BD0026' :
               d > 20  ? '#E31A1C' :
               d > 10  ? '#FC4E2A' :
               d > 5   ? '#FD8D3C' :
               d > 2   ? '#FEB24C' :
               d > 0   ? '#FED976' :
                          '#FFEDA0';
    }

    function getColorNormalized(d) {
        return d > 10000 ? '#800026' :
               d > 5000 ? '#BD0026' :
               d > 2500  ? '#E31A1C' :
               d > 2000  ? '#FC4E2A' :
               d > 1000   ? '#FD8D3C' :
               d > 500   ? '#FEB24C' :
               d > 100    ? '#FED976' :
                           '#FFEDA0';
    }

    function addLegend(map) {
        const legend = L.control({ position: 'bottomright' });

        legend.onAdd = function (map) {
            const div = L.DomUtil.create('div', 'info legend'),
                grades = [0, 2, 5, 10, 20, 50, 100],
                labels = [];

            div.innerHTML += '<h4>Fire Stations</h4>';
            for (let i = 0; i < grades.length; i++) {
                div.innerHTML +=
                    '<i style="background:' + getColor(grades[i] + 1) + '"></i> ' +
                    grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+');
            }

            return div;
        };

        legend.addTo(map);
    }

    function addNormalizedLegend(map) {
        const legend = L.control({ position: 'bottomright' });

        legend.onAdd = function (map) {
            const div = L.DomUtil.create('div', 'info legend'),
                grades = [0, 100, 500, 1000, 2000, 2500, 10000],
                labels = [];

            div.innerHTML += '<h4>Normalized Population per Fire Station</h4>';
            for (let i = 0; i < grades.length; i++) {
                div.innerHTML +=
                    '<i style="background:' + getColorNormalized(grades[i] + 1) + '"></i> ' +
                    grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+');
            }

            return div;
        };

        legend.addTo(map);
    }
});

// Microsoft Copilot was used for code debugging and architecture.