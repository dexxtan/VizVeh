var svg, path, projection, zoom, selectControl,
		feature = {},
		mapWidth = 960,
		mapHeight = 600,
		size = (mapHeight / 2) - 10,
		scale = 450000,
		centerX = 122.4383,
		centerY = 37.7800;

svg = d3.select("body").append("svg")
			.attr("width", mapWidth)
			.attr("height", mapHeight);

zoom = d3.behavior.zoom()
		.translate([mapWidth/2, mapHeight/2])
		.on("zoom", rescale);
svg.call(zoom);

projection = d3.geo.albers()
    .scale(scale)
    .rotate([centerX, 0]) 
    .center([0, centerY]) 
    .translate(zoom.translate());

path = d3.geo.path()
		.projection(projection);

// rescaling function to update paths based on current zoom and pan
function rescale() {
	// update scale and translation for projection
	projection.scale(scale * zoom.scale())
			.translate(zoom.translate());

	// refresh paths
	if (feature.roads) feature.roads.data(roads)
			.attr("d", path);
	if (feature.neighborhoods) feature.neighborhoods.data(neighborhoods)
			.attr("d", path);
	if (feature.vehicles) feature.vehicles.data(vehicleFeatures)
			.attr("d", path);
}

selectControl = d3.select("#routeSelect")
		.on("change", filterByRoute)
		.node();

// filter function to display only vehicles on selected routes
function filterByRoute() {
	var currentOption,
			selectedRoutes = {};

	// check selected options
	for (var i = 0; i < selectControl.options.length; i++) {
		currentOption = selectControl.options[i];
		if (currentOption.selected) {
			selectedRoutes[currentOption.text] = true;
		}
	}

	// display or hide vehicles with invis class
	if (feature.vehicles && selectControl.options.length > 0) {
		feature.vehicles.each(function(vehicle) {
			if ( selectedRoutes[vehicle.properties.routeTag] ) {
				d3.select(this).attr("class", "vehicle");
			} else {
				d3.select(this).attr("class", "vehicle invis");
			}
		});
	}
}



var neighborhoods, streets, arteries, freeways, jsonDataPoller,
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
jsonDataPoller = setInterval(function() {
	if (neighborhoods && streets && arteries && freeways) {
		clearInterval(jsonDataPoller);

	  feature.neighborhoods = svg.append("g")
	  		.attr("class", "neighborhoods")
	  		.selectAll("path")
	      .data(neighborhoods)
	    .enter().append("path")
	      .attr("class", "neighborhood")
	      .attr("d", path);
	  feature.roads = svg.append("g")
	  		.attr("class", "roads")
	  		.selectAll("path")
	      .data(roads)
	    .enter().append("path")
	      .attr("class", "road")
	      .attr("d", path);
	}
}, 50);



var routeListFlag,
		routeListPoller,
		routes = [],
		vehicleFeatures = [],
		vehicleLocationUpdater;

// async call to get route data
d3.xml("http://webservices.nextbus.com/service/publicXMLFeed?command=routeList&a=sf-muni", function(xml) {
	var option,
			select = document.getElementById("routeSelect"),
			routeList = xml.getElementsByTagName("route");
	for (var i = 0; i < routeList.length; i++) {
		// store route tags and title to get vehicle locations
		routes.push(objectify(routeList[i]));

		// populate select options
		option = document.createElement("option");
		option.text = routeList[i].getAttribute("tag");
		select.add(option);
	}
	routeListFlag = true;
});

routeListPoller = setInterval(function() {
	if (routeListFlag) {
		clearInterval(routeListPoller);
		
		updateVehicleLocations();
		// set interval to regularly update vehicle locations every 15 seconds
		vehicleLocationUpdater = setInterval(function() {
			updateVehicleLocations();
		}, 15000);
	}
}, 50);

function updateVehicleLocations() {
	var vehicleListPoller,
			vehicleQueryCounter = 0;

	// get current Pacific Time in milliseconds
	var offset = -7;
	var epochTime = new Date( new Date().getTime() + offset * 3600 * 1000).getTime();

	// reset Vehicle Features Array
	vehicleFeatures = [];

	for (var i = 0; i < routes.length; i++) (function(i) {
		d3.xml("http://webservices.nextbus.com/service/publicXMLFeed?command=vehicleLocations&a=sf-muni&r="+routes[i].tag+"&t="+epochTime, function(xml) {
			var currentVehicle, feature,
					vehicleList = xml.getElementsByTagName("vehicle");
			for (var j = 0; j < vehicleList.length; j++) {
				currentVehicle = objectify(vehicleList[j]);

				// create feature to store in features array
				feature = {
          "type": "Feature", 
          "geometry": {
            "type": "Point",
            "coordinates": [currentVehicle.lon, currentVehicle.lat]
          },
          "properties": currentVehicle
				};
				vehicleFeatures.push(feature);
			}
			vehicleQueryCounter++;
		});
	})(i);

	vehicleListPoller = setInterval(function() {
		if (vehicleQueryCounter == routes.length) {
			clearInterval(vehicleListPoller);

			// clear vehicles g simply
			svg.select("g.vehicles").remove();

			feature.vehicles = svg.append("g")
					.attr("class", "vehicles")
				.selectAll("path")
		      .data(vehicleFeatures)
		    .enter().append("path")
		      .attr("class", "vehicle")
		      .attr("d", path);
		  filterByRoute();

		  console.log("Vehicle Locations Updated");
		}
	}, 50);
}

// helper function to convert xml document elements into objects
function objectify(element) {
	var object = {}
	for (var i = 0; i < element.attributes.length; i++) {
		object[element.attributes[i].name] = element.attributes[i].value;
	}
	return object;
}