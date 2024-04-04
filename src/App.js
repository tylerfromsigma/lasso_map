import React, { useEffect, useState } from 'react';
import Plotly from 'plotly.js-dist';
import { 
  client, 
  useConfig, 
  useElementData, 
  useVariable,
} from "@sigmacomputing/plugin";

client.config.configureEditorPanel([
  { type: "element", name: "source" },
  { type: "column", name: "latitude",  source: "source", allowMultiple: false },
  { type: "column", name: "longitude",  source: "source", allowMultiple: false },
  { type: "column", name: "legend",  source: "source", allowMultiple: false },
  { type: "variable", name: "filterLatitude" },
  { type: "variable", name: "filterLongitude" },
  { name: "Variables", type: 'group' },  
  
  { name: 'ShowLegend', source: "Variables", type: "toggle", defaultValue: true },
  { name: 'MapStyle', source: "Variables", type: 'text', defaultValue: "light" },
  { name: 'MapboxAccessToken', type: 'text', secure: true },

]);

function App() {
  // pk.eyJ1IjoidGFzcGVuY2VyIiwiYSI6ImNsdWlwMW90YzAxMXEycG1pcndmMzFoM3QifQ.uEwYbkTtZDQ7CoulhbDdpQ
  const config = useConfig();
  const mapboxAccessToken = config.MapboxAccessToken;
  const showLegend = true;
  const sigmaData = useElementData(config.source);
  const [filterLatitude, setFilterLatitude] = useVariable(config.filterLatitude);
  const [filterLongitude, setFilterLongitude] = useVariable(config.filterLongitude);
  const [prevSigmaData, setPrevSigmaData] = useState(null);

  console.log(config.ShowLegend)

  const updatePlotSize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    Plotly.relayout('myDiv', { width: width, height: height });
  };

  useEffect(() => {
    window.addEventListener('resize', updatePlotSize);

    return () => {
      window.removeEventListener('resize', updatePlotSize);
    };
  }, []);

  useEffect(() => {
    if (sigmaData && JSON.stringify(sigmaData) !== JSON.stringify(prevSigmaData)) {
      setPrevSigmaData(sigmaData);

      const graphDiv = document.getElementById('myDiv');
      
      const names = sigmaData[config.legend];

      // Check if names is undefined
      if (!names) {
        console.error("Names data is undefined");
        return;
      }

      const lat = sigmaData[config.latitude];
      const lon = sigmaData[config.longitude];

      const uniqueNames = Array.from(new Set(names));

      const plotData = uniqueNames.map(uniqueName => {
        const indices = names.reduce((acc, val, index) => {
          if (val === uniqueName) {
            acc.push(index);
          }
          return acc;
        }, []);

        const latitudesForName = indices.map(i => lat[i]);
        const longitudesForName = indices.map(i => lon[i]);

        return {
          type: 'scattermapbox',
          name: uniqueName,
          lat: latitudesForName,
          lon: longitudesForName
        };
      });

      const centerLat = lat.reduce((a, b) => a + b, 0) / lat.length;
      const centerLon = lon.reduce((a, b) => a + b, 0) / lon.length;

      const maxLatDiff = Math.max(...lat) - Math.min(...lat);
      const maxLonDiff = Math.max(...lon) - Math.min(...lon);

      const latZoom = Math.log2(360 / maxLatDiff);
      const lonZoom = Math.log2(180 / maxLonDiff);

      const zoom = Math.min(latZoom, lonZoom);

      const layout = {
        dragmode: 'zoom',
        mapbox: {
          center: {
            lat: centerLat,
            lon: centerLon
          },
          domain: {
            x: [0, 1],
            y: [0, 1]
          },
          style: config.MapStyle,
          zoom: zoom
        },
        margin: { 
          r: 0, 
          t: 0, 
          b: 0, 
          l: 0, 
          pad: 0 
        },
        paper_bgcolor: '#191A1A',
        plot_bgcolor: '#191A1A',
        autosize: true,
        legend: { 
          x: 0.01, 
          y: 0.98, 
          bgcolor: 'rgba(0,0,0,0.5)', 
          font: { color: 'white' }, 
          visible: showLegend 
        },
        hoverlabel: {
          bgcolor: 'white',
          bordercolor: 'black'
        },
      };

      Plotly.setPlotConfig({ mapboxAccessToken: mapboxAccessToken });

      Plotly.newPlot('myDiv', plotData, layout, { displayModeBar: true });

      window.addEventListener('resize', updatePlotSize);

      graphDiv.on('plotly_selected', function(eventData) {
        // const selectedPoints = eventData.points.map(pt => ({
        //   lat: pt.lon,
        //   lon: pt.lon
        // }));
        // console.log(selectedPoints);

        const selectedLatitude = eventData.points.map(pt => pt.lat);
        if (selectedLatitude.length) {
          setFilterLatitude(selectedLatitude.join(","));
        } else {
          setFilterLatitude(null);
        }

        const selectedLongitude = eventData.points.map(pt => pt.lon);
        if (selectedLongitude.length) {
          setFilterLongitude(selectedLongitude.join(","));
        } else {
          setFilterLongitude(null);
        }
      });

      graphDiv.on('plotly_deselect', function(eventData) {
        setFilterLatitude();
        setFilterLongitude();
      });

      return () => {
        window.removeEventListener('resize', updatePlotSize);
      };
    }
  }, [sigmaData, config, filterLatitude, filterLongitude, prevSigmaData, mapboxAccessToken, showLegend]); // Add prevSigmaData to the dependency array


  if (sigmaData) {
    return (
      <div id='myDiv'></div>
    );
  }
}

export default App;
