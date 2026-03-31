# who-you-gonna-call
Project code for CS5124 - Project 2: Who you gonna call? 3-1-1!

## Motivation 

 

## Data 

This project uses 2025 Cincinnati 311 non-emergency service request data. 

- Official dataset: [Cincinnati 311 Non-Emergency Service Requests](https://data.cincinnati-oh.gov/Thriving-Healthy-Neighborhoods/Cincinnati-311-Non-Emergency-Service-Requests/4cjh-bm8b) 

- Repository CSV used by the app: [data/Cincinnati_311_(Non-Emergency)_Service_Requests_20260227.csv](https://github.com/mattheeter/who-you-gonna-call/blob/dev/data/Cincinnati_311_(Non-Emergency)_Service_Requests_20260227.csv) 

- Base Cincinnati neighborhood GeoJSON source: [blackmad/neighborhoods repository search for Cincinnati](https://github.com/search?q=repo%3Ablackmad%2Fneighborhoods%20cincinnati&type=code) 

- Neighborhood boundary file used on the map: [data/cincinnati.geojson](https://github.com/mattheeter/who-you-gonna-call/blob/dev/data/cincinnati.geojson), which is a customized version of that base source with East Walnut Hills added 

Our site filters the raw Cincinnati 311 Non-Emergency Service Requests CSV down to 14 service types that are mappable and comparable in a single interface. Important fields used in the visualization include request type, neighborhood, public agency, priority, method received, creation date, last update date, latitude, and longitude. In the app, `DATE_CREATED` drives the timeline, `DATE_LAST_UPDATE` is used to derive response-time measure in days, and latitude/longitude put each request on the map. 

One important design decision is that the app does not attempt to visualize every possible field from the dataset at once. It focuses on fields that can be compared across multiple views such as geography, time, service category, agency, priority, and request intake method. 

## Sketches 

JP  

## Vis components 

### CMV Dashboard: 311 Calls Visualization
The app is a coordinated multiple-views (CMV) dashboard with six linked views:

#### Views

Map (Leaflet): plots calls by lattitude/longitude with a heat layer and boundary overlay. Supports service type filtering, legend-based color encoding, and rectangle brushing by SR_NUMBER.

Timeline: weekly bar chart of call volume. Supports hover tooltips, x-axis brush (filters all views), and a Play/Pause animation that sweeps through all calls in the year in ~30 seconds.

4 Attribute Charts (horizontal bar charts): Neighborhood, Method Received, Agency, and Priority. Each supports hover tooltips and y-axis brushing to filter all other views.

Interactions are fully linked — brushing any view (map, timeline, or attribute chart) filters all others. Reset clears all selections.

## Discovery 

Spatial hotspots shift by service type — toggling categories moves density clusters across the city.
Seasonal patterns — some categories (e.g., snow/ice/trash pickups) spike in winter; others are uniform.
High-priority late-year requests cluster in specific areas/agencies when Priority + timeline brushes are combined.
Agency and submission method composition varies noticeably between brushed spatial regions (e.g., downtown vs. residential).

## Process 

Matt 

## Challenges/Future Work 

Matt  

## AI and Collaboration 

Soham -  

Matt -  

Austin -  

JP -  

## Attribution 

Austin worked on the base map and getting the data plotted onto the map of Cincinnati and implementing both street and aerial way. He also helped with UI decisions for the overall view of the page.  

Matt developed the heatmap functionalities and attribute views for the four different attributes Neighbordhood, Public Agency, Priority and Method of Call  

Soham implemented the timeline viewer for calls throughout the year as well as the animation that shows changes in call volume over the year. He also implemented the linking for brushing between the map and attribute/timeline graphs.  

JP implemented the various Service Types for the 311 calls and the ability to select them on the map and update the other charts based on the selection.  