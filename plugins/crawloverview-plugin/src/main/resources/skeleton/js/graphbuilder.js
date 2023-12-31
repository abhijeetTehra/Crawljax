var graph = Viva.Graph.graph();

var layout = Viva.Graph.Layout.forceDirected(graph, {
	springLength : 600,
	springCoeff : 0.0005,
	dragCoeff : 0.06,
	gravity : -200.2
});

var graphics = Viva.Graph.View.svgGraphics(),
		nodeSize = 200;
fontSize = 3;

var graphics = Viva.Graph.View.svgGraphics();

var renderer = Viva.Graph.View.renderer(graph, {
	graphics : graphics,
	layout : layout,
	container : document.getElementById('container-graph')
});

renderer.run();

highlightRelatedNodes = function(nodeId, isOn) {
	// just enumerate all realted nodes and update link color:
	graph.forEachLinkedNode(nodeId, function(node, link){
		linkUI = graphics.getLinkUI(link.id)
		if (link && linkUI) {
			// link.ui is a special property of each link
			// points to the link presentation object.
			linkUI.attr('stroke', isOn ? 'green' : linkUI.attr('stroke-orig'));
			linkUI.attr('stroke-width', isOn ? 12 : 6);
		}
	});
};

magnifyCluster = function(nodeId, zoom){
	toZoom = Object.values(states).filter(function(state){return state.cluster==states[nodeId].cluster}).map(function(state){return state.name;}).map(function(nodeId){return graphics.getNodeUI(nodeId);});
	for(elem of toZoom){
		if(zoom){
			zoomElement(elem);
		}
		else{
			unzoomElement(elem);
		}
	}
}

zoomElement=function(elem){
	$(elem).children("image").width(nodeSize*2);
	$(elem).children("image").height(nodeSize*2);
	$(elem).children("rect").width(nodeSize*2);
	$(elem).children("rect").height(nodeSize*2);
	$(elem).children("text").css("fontSize", fontSize*2 + "rem");
};

unzoomElement = function(elem){
	$(elem).children("image").width(nodeSize);
	$(elem).children("image").height(nodeSize);
	$(elem).children("rect").width(nodeSize);
	$(elem).children("rect").height(nodeSize);
	$(elem).children("text").css("fontSize", fontSize + "rem");

};

graphics.node(function(node) {
	// This time it's a group of elements: http://www.w3.org/TR/SVG/struct.html#Groups
	var ui = Viva.Graph.svg('g');
	// Create SVG text element with user id as content
	var svgText = Viva.Graph.svg('text').attr('y', '-4px').attr('style', "font-size:" + fontSize+"rem").text(node.id);
	var img = Viva.Graph.svg('image')
	.attr('width', nodeSize)
	.attr('height', nodeSize)
	.link(node.data.img);
	$(img).dblclick(function() { window.open(node.data.url, '_blank');});
	ui.append(svgText);
	ui.append(img);
	stroke = Viva.Graph.svg('rect')
	.attr("style", "fill:none;stroke-width:1;stroke:black;")
	.attr('width', nodeSize+1)
	.attr('height', nodeSize+1)
	ui.append(stroke);
	$(ui).hover(function() { // mouse over
		highlightRelatedNodes(node.id, true);
	}, function() { // mouse out
		highlightRelatedNodes(node.id, false);
		magnifyCluster(node.id, false);
	});
	$(ui).click(function(){
		magnifyCluster(node.id, true);
	});
	return ui;
}).placeNode(function(nodeUI, pos) {
	nodeUI.attr('transform',
			'translate(' +
			(pos.x - nodeSize/2) + ',' + (pos.y - nodeSize/2) +
			')');
});


// To render an arrow we have to address two problems:
//  1. Links should start/stop at node's bounding box, not at the node center.
//  2. Render an arrow shape at the end of the link.

// Rendering arrow shape is achieved by using SVG markers, part of the SVG
// standard: http://www.w3.org/TR/SVG/painting.html#Markers
var createMarker = function(id) {
			return Viva.Graph.svg('marker')
			.attr('id', id)
			.attr('viewBox', "0 0 10 10")
			.attr('refX', "10")
			.attr('refY', "5")
			.attr('markerUnits', "strokeWidth")
			.attr('markerWidth', "10")
			.attr('markerHeight', "5")
			.attr('orient', "auto");
		},

		marker = createMarker('Triangle');
marker.append('path').attr('d', 'M 0 0 L 10 5 L 0 10 z').attr('stroke', 'grey');

// Marker should be defined only once in <defs> child element of root <svg> element:
var defs = graphics.getSvgRoot().append('defs');
defs.append(marker);

var geom = Viva.Graph.geom();

graphics.link(function(link){
	// Notice the Triangle marker-end attribe:
	var color = 'gray';
	if(link.data.eventType == "reload"){
		color = 'blue';
	}
	var path = Viva.Graph.svg('path')
	.attr('stroke', color)
	.attr('stroke-orig', color)
	.attr('stroke-width', 6)
	.attr('marker-end', 'url(#Triangle)');

	if(link.data.eventType == "reload"){
		path.attr('stroke-dasharray', "5,5");
	}
	$(path).click(function(){
		showInfo(link);
		$('path[stroke="red"]').attr("stroke", $('path[stroke="red"]').attr('stroke-orig'));
		path.attr('stroke', 'red')
	});
	return path;
}).placeLink(function(linkUI, fromPos, toPos) {
	// Here we should take care about
	//  "Links should start/stop at node's bounding box, not at the node center."

	// For rectangular nodes Viva.Graph.geom() provides efficient way to find
	// an intersection point between segment and rectangle
	var toNodeSize = nodeSize,
			fromNodeSize = nodeSize;

	var from = geom.intersectRect(
					// rectangle:
					fromPos.x - fromNodeSize / 2, // left
					fromPos.y - fromNodeSize / 2, // top
					fromPos.x + fromNodeSize / 2, // right
					fromPos.y + fromNodeSize / 2, // bottom
					// segment:
					fromPos.x, fromPos.y, toPos.x, toPos.y)
			|| fromPos; // if no intersection found - return center of the node

	var to = geom.intersectRect(
					// rectangle:
					toPos.x - toNodeSize / 2, // left
					toPos.y - toNodeSize / 2, // top
					toPos.x + toNodeSize / 2, // right
					toPos.y + toNodeSize / 2, // bottom
					// segment:
					toPos.x, toPos.y, fromPos.x, fromPos.y)
			|| toPos; // if no intersection found - return center of the node

	var data = 'M' + from.x + ',' + from.y +
			'L' + to.x + ',' + to.y;

	linkUI.attr("d", data);
});