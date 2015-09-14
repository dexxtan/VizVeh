var svg, path, projection, zoom,
		feature = {},
		mapWidth = 960,
		mapHeight = 600,
		size = (mapHeight / 2) - 10,
		scale = 450000,
		centerX = -26.45,
		centerY = 37.78;

svg = d3.select("body").append("svg")
			.attr("width", mapWidth)
			.attr("height", mapHeight);

zoom = d3.behavior.zoom()
		.translate([mapWidth/2, mapHeight/2])
		.on("zoom", rescale);
svg.call(zoom);

projection = d3.geo.albers()
		.center([centerX, centerY])
    .scale(scale)
    .translate(zoom.translate());

path = d3.geo.path()
		.projection(projection);

// rescaling function to update paths based on current zoom and pan
function rescale() {
	// update scale and translation for projection
	projection.scale(scale * zoom.scale())
			.translate(zoom.translate());

	// refresh paths
	feature.roads.data(roads)
			.attr("d", path);
	feature.neighborhoods.data(neighborhoods)
			.attr("d", path);
}

var neighborhoods, streets, arteries, freeways, interval,
		roads = [];

// async calls to get json data
d3.json("data/sfmaps/neighborhoods.json", function(collection) {
  neighborhoods = collection.features;
});

d3.json("data/sfmaps/streets.json", function(collection) {
  roads = roads.concat(collection.features);
	streets = true;
});

d3.json("data/sfmaps/arteries.json", function(collection) {
  roads = roads.concat(collection.features);
	arteries = true;
});

d3.json("data/sfmaps/freeways.json", function(collection) {
  roads = roads.concat(collection.features);
	freeways = true;
});

// simple use of interval and "flags", neighborhoods, streets, arteries, freeways
// to append paths to svg only when all async json calls are done, can be replaced more elegantly with async.js
interval = setInterval(function() {
	if (neighborhoods && streets && arteries && freeways) {
	  feature.neighborhoods = svg.selectAll("path")
	      .data(neighborhoods)
	    .enter().append("svg:path")
	      .attr("class", "neighborhood")
	      .attr("d", path);
	  feature.roads = svg.selectAll("path")
	      .data(roads)
	    .enter().append("svg:path")
	      .attr("class", "road")
	      .attr("d", path);
		clearInterval(interval);
	}
}, 50);