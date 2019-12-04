(function(global, factory){

    if (typeof define === 'function' && define.amd) {
        // AMD
        define(['exports','d3'], factory); 
    } else if (typeof exports === 'object') {
        // Node, CommonJS-like
        factory(exports, require('d3')); 
    } else {    
        // Browser globals
        (factory((global.ggen = global.ggen || {}), global.d3));
    }   
    
}(this, (function(exports, d3){	'use strict';

// GGEN is a library in development, code is still to be cleaned and optimized.
var version = "1.0.0";

// Obtain basic information about document and window
var docEl = document.documentElement,
    bodyEl = document.getElementsByTagName('body')[0];

var canvaswidth = window.innerWidth || docEl.clientWidth || bodyEl.clientWidth,
    canvasheight =  window.innerHeight || docEl.clientHeight|| bodyEl.clientHeight;

// list of nodes and list of connection between nodes
var nodes = [];
var edges = [];

//paths and blocks group to be appended to the "graphClass" group
var paths;
var blocks;

// Define some useful constants
var constants =  {
    graphClass: "graph",
    nodeClass: "node-group",
    arcClass: "arc-group",
    clickableClass: "clickable",
    wellsClass:"wells",
    circleNodeClass:"circlenode",
    binaryGraph:false,
    draggableGraph: true,
    zoomableGraph: false,
    zoomScale: [0.7,3],
    start: { class:"strt-nd", width:50, height:50, deletable:false, draggable:false,
            clickable:true, customFunction1Enabled: true },
    end: { class:"strt-nd", width:50, height:50, deletable:true, draggable:false,
            clickable:true,singleInput:false, customFunction1Enabled: true, 
            nodeSingleParent:false},
    block: { class:"block", width:180, height:50, marginl:5, marginr:5, //width:240, height:160
            titleMaxChars:14,
            iconsize:25, icon1:"fas fa-cog", icon2:"fas fa-times-circle",
            deletable:true, draggable:false, clickable:true, singleInput:true,
            customFunction1Enabled:true, customFunction2Enabled:true,
            customFunction3Enabled:true, nodeSingleChild:false },
    offsety: 90, // 130, //180,
    duration: 750   //of transactions
};

// state of the graph
var state = {
    selectedNode: null,
    //pointer to end node to avoid searching the nodes array
    endNode: null,
    currentID: 0,
    graphVersion:0,
    debug:false 
};

var settings = null;

//Define some settings to configure the library
function defineSettings(cwidth, cheight){
    if(state.debug) console.log(" setting redefinition for w: ",cwidth," h: ",cheight);
    canvaswidth = cwidth;
    canvasheight = cheight;
    settings = {
        start: {
            shape: "circle",
            xLoc: cwidth/2-constants.start.width/2,
            yLoc: constants.start.width,
            x0Loc: cwidth/2-constants.start.width/2,
            y0Loc: 0
        },
        end: {
            shape: "circle",
            xLoc: cwidth/2-constants.end.width/2,
            yLoc: canvasheight-100,
            x0Loc: cwidth/2-constants.end.width/2,
            y0Loc: cheight-100
        },
        edge: {
            shape:"curve" //"curve" or "line" //can be added the support to the arrows
        },
        block: { shape: "rect" }, //"rect" or "circle"
        noStartNode: false,
        noEndNode: false,
        noIndexedDB: true,
        useAlternativeAlgorithm:false,
        algorithm:''
    };

}

// ---  setter
function setBinary(binary=true){
    if(binary!=false &&binary!=true)
        return;
    if(binary)
        constants.block.nodeSingleChild = false;
    constants.binaryGraph=binary;
    //if true: no more than 2 children per node
}

function setLinearEdges(linear=true){
    if(linear!=false &&linear!=true)
        return;
    settings.edge.shape= linear==true ? "line" : "curve";
}

function setCircleBlocks(circle=true){
    if(circle!=false &&circle!=true)
        return;
    constants.offsety = 110;
    settings.block.shape= circle==true ? "circle" : "rect";
}

function setDragAndZoom(draggable, zoomable){
    //if(draggable==true || draggable==false)
    constants.draggableGraph = draggable==true ? true : draggable==false ? false : constants.draggableGraph;
    //if(zoomable==true || zoomable==false)
    constants.zoomableGraph = zoomable==true ? true : zoomable==false ? false : constants.zoomableGraph;
}

function setNodeSpacing(offsetX, offsetY){
    if(offsetY>0 && offsetY<500 && offsetX>0 && offsetX < 500)
    constants.offsety = offsetY;
    constants.block.marginl = offsetX/2;
    constants.block.marginr = offsetX/2;
}

function currentSelectedNode(node=null){
    if(node!=null && nodes.includes(node))
        state.selectedNode=node;
    return state.selectedNode;
}

function initCanvas(container="default"){

    if(state.debug) console.log("initCanvas: "+ canvaswidth)

    if (!window.d3){    //check if d3.js is loaded or not
        if(state.debug) console.log("\nIn order to use ggen library 'd3.js' must be included");
        return;
    }

   var svg;
   if(container=="default"){
        svg = d3.select("body").append("svg")
            .attr("width", canvaswidth)
            .attr("height", canvasheight);
            //.attr("id", constants.canvasID);
        defineSettings(canvaswidth, canvasheight);
   }else{
        var svg = d3.select(container).append("svg")
                .attr("width", "100%")
                .attr("height", "100%");
        var elwidth = d3.select(container).node().offsetWidth;
        //document.getElementById(container).offsetWidth;
        var elheight = d3.select(container).node().offsetHeight;
        //document.getElementById(container).offsetHeight;
        if(state.debug) console.log(" SVG appended at ", container, "with dimension w: ",elwidth," h: ",elheight);
        defineSettings(elwidth, elheight);        
   }

	//append a group g element to the svg giving to each members of the group a class
    var svgG = svg.append("g").classed(constants.graphClass, true);

    //panning and zoom
    var scaleExt =[1,1];
    if(constants.zoomableGraph) scaleExt =constants.zoomScale;
    if( constants.draggableGraph){
        svg.call(d3.zoom().scaleExtent(scaleExt)
            .on('start.mousedown', function(){
                //svg.classed("dragging",true);
            }).on('zoom', function () {
                svgG.attr("transform", d3.event.transform);
            }).on('end', function(){
                //svg.classed("dragging",false);
            }));
    }

    // svg nodes and edges groups
    paths = svgG.append("g")
                        .attr('id','paths');
    blocks = svgG.append("g")
                        .attr('id','blocks');

    if(!window.indexedDB){
        if(state.debug) 
            console.log("Your browser doesn't support a stable version of IndexedDB. Such feature will not be available.");
        settings.noIndexedDB = true;
    }

    if(!settings.noIndexedDB){
        // if in indexed DB there is already a graph
        // load that graph
        //if(state.debug) console.log("init from indexed db ");
    }

    updateGraph();
}


function moveNodesRecursive(node, offset){
   
    if( (node.type=='operator'
            && node.parent.length>1)
        || (node.type=='block' && node.input.length==4  && node.parent.length>1)
    ){  
        
        if(node.parent.lenght==2
            ||!(node.type=='block' && node.input.length==4)){
            if(node.parent[1].x>node.parent[0].x)
                offset=offset-(node.parent[1].x-node.parent[0].x)/2;
            else
                offset=offset-(node.parent[0].x-node.parent[1].x)/2;
        }
     
        //search the lowest parent y  and the leftmost and rightmost(for 4input case)      
       let posy=0;
       let leftmostparentx=canvaswidth;
       let rightmostparentx=0;
       node.parent.forEach(function(d){
            if(d.y+d.size.height>posy)
               posy=d.y+d.size.height;
            if(d.x<leftmostparentx)
               leftmostparentx=d.x;  
            if(d.x>rightmostparentx)
               rightmostparentx=d.x;        
       });
       node.y = posy + constants.offsety; 
       if(node.type=='block' && node.input.length==4){
            offset=offset-(rightmostparentx-leftmostparentx)/2;
            console.log("leftmostparent ",leftmostparentx," position ",node.x," offset ",offset);
       }

    }
   
    for(var i=0; i<node.children.length; i++){
        if( (node.children[i].type=='operator'
                && node.children[i].parent.length>1
                && node.children[i].parent[1]==node)
            ||( node.children[i].type=='block'
                && node.children[i].input.length==4  
                && node.children[i].parent.length>1 
                && node.children[i].parent[0]!=node)
            )
            continue;
        moveNodesRecursive(node.children[i],offset);
    }
    node.x += offset;
}

// ------ compute node positions and----------- 
// -------use D3 JOIN UPDATE PATTERN-----------
function updateGraph(){
	
    if(nodes!=null && nodes.length!=0){
		
        if(!settings.useAlternativeAlgorithm)
            VDPtreeLayout(nodes[0]);
        
		//center the tree (in a time consuming way)
        //it would be better to do this in secondWalk!
		var rootX = nodes[0].x;
		var rootWidth = nodes[0].size.width;
        var a = canvaswidth/2 + rootWidth/2;
        var b = rootX + rootWidth;
        moveNodesRecursive(nodes[0],(a-b));

        if(state.endNode!=null && state.endNode.parent.length>1){
            //search the lowest parent y,
            //the further-from-the-origin parent x
            //and the closest-to-origin parent x
            var posy=0;
            var xnear=canvaswidth;
            var xfar=0;
            state.endNode.parent.forEach(function(d){
                if(d.y+d.size.height>posy)
                    posy=d.y+d.size.height;
                if(d.x<xnear)
                    xnear = d.x+d.size.width;
                if(d.x>xfar)
                    xfar = d.x;
            });
            state.endNode.y = posy + constants.offsety;
            state.endNode.x = xnear + (xfar-xnear)/2 - state.endNode.size.width/2;
        }

	}

    // node update selection: existing nodes
    var el_up = blocks.selectAll("g."+constants.nodeClass)
                    .data(nodes, function(d){ return d.id; });
    // node enter selection: new nodes
    var el_en = el_up.enter().append("g")
                    .classed(constants.nodeClass, true);

    //give each new element a personalized class
    el_en.each(function(d) {
        if(d.class!=undefined)
            this.classList.add(d.class);
      });
    
    // Transition update selection: old nodes to their new position.
    var el_up_tr = el_up
        .transition()
        .duration(constants.duration)
        .attr("transform", function(d) {
            //translate to current position x, y
            return "translate(" + d.x + "," + d.y + ")";
        });

/*  // ---- DEBUG ----
if(state.debug){
        console.log("update: ");
    el_up.each( function(i){
        console.log(i);
    });
}*/

    //start and end enter selection
    var strt_nd_en = el_en.filter( function(d){
            return d.type == 'start' || d.type == 'end';
        }).classed(constants.start.class, true);
    var blks_en = el_en.filter( function(d){
        return d.type  == 'block' || d.type == 'operator';
    }).classed(constants.block.class, true);

    // if start-end insert a circle
    strt_nd_en.append("circle")
        .attr("r", 1e-6)
        .attr("cx", function(d){return (d.size.width/2);})
        .attr("cy", function(d){return (d.size.width/2);});
    // append to the start-end enter group a new text
    strt_nd_en.append('text')
        .attr("class", "node-title")
        .attr("x", function(d){return (d.size.width/2);})
        .attr("y", function(d){return (d.size.width/2);})
        .attr("font-family","sans-serif")
        .attr("font-size","0px")
        .attr("fill","steelblue")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline","central")
        .classed(constants.clickableClass, function(d){
            if(d.type=="start" && constants.start.clickable==true ||
                d.type=="end" && constants.end.clickable==true) return true;
            else return false;
        }).on('click', function(d){
            if(d.type=="start")
                return customStartFunction1(d);
            else if(d.type=="end")
                return customEndFunction1(d);
        });
    // move strt-end group to initial position
    strt_nd_en.attr("transform", function(d){
            return "translate(" + d.x0+ ", "+ d.y0 +" )";
        });

    //consider entering node blocks  
    if(settings.block.shape!="rect"){
        blks_en.append('circle')
            .attr("r", 1e-6)
            .attr("cx", function(d){return (d.size.width/2);})
            .attr("cy", function(d){return (d.size.width/2);})
            .classed(constants.circleNodeClass,true);
        blks_en.append('text')
            .attr("class", "node-title")
            .attr("x", function(d){return (d.size.width/2);})
            .attr("y", function(d){return (d.size.width/2);})
            .attr("font-family","sans-serif")
            .attr("font-size","0px")
            .attr("fill","steelblue")
            .attr("text-anchor", "middle")
            .attr("dominant-baseline","central")
            .classed(constants.clickableClass, function(d){
                if(d.type=="start" && constants.start.clickable==true ||
                    d.type=="end" && constants.end.clickable==true) return true;
                else return false;
            }).on('click', function(d){ return customBlockFunction3(d); });
        blks_en.attr("transform", function(d){
                return "translate(" + d.x0+ ", "+ d.y0 +" )";
            });
    }else{
        // append main rect to entering node block
        blks_en.append('rect')
            .attr('width',0)
            .attr('height',0)
            .attr("rx", "5")
            .attr("ry", "5");
        //append title text and two circle to the node block
        blks_en.append("circle")
                .attr("r", 1e-6)
                .classed(constants.wellsClass,true);
        blks_en.append("circle")
                .attr("r", 1e-6)
                .classed(constants.wellsClass,true)
                .classed(constants.clickableClass, function(){
                    if(constants.block.clickable==true) return true;
                    else return false;
                }).on("click", function(d){ return customBlockFunction3(d);});

        blks_en.append("text")
            .attr("class", "node-title")
            .attr("font-family","sans-serif")
            .attr("font-size","0px")
            .attr("fill","steelblue")
            .attr("text-anchor", "middle")
            .attr("dominant-baseline","central");

        //append icon1 to node block and give it custom functions
        blks_en.append("text")        // Append a text element
            .attr("class", function(){ return constants.block.icon1; })  // Give it the font-awesome class
            .text("\uf013")       // Specify your icon in unicode (https://fontawesome.com/cheatsheet)
            .attr("font-size","0px")
            .attr("fill","steelblue")
            .attr("text-anchor", "middle")
            .attr("dominant-baseline","central")
            .classed(constants.clickableClass, function(){
                if(constants.block.clickable==true) return true;
                else return false;
            }).on('click', function(d){ return customBlockFunction1(d);});
        //append icon1 to node block
        blks_en.append("text")        // Append a text element
            .attr("class", function(){ return constants.block.icon2; }) // Give it the font-awesome class
            .text("\uf057")       // Specify your icon in unicode (https://fontawesome.com/cheatsheet)
            .attr("font-size","0px")
            .attr("fill","steelblue")
            .attr("text-anchor", "middle")
            .attr("dominant-baseline","central")
            .classed(constants.clickableClass, function(){
                if(constants.block.clickable==true) return true;
                else return false;
            }).on('click', function(d){return customBlockFunction2(d);});
        blks_en.attr("transform", function(d){
            return "translate(" +d.x0+ ", "+d.y0+" )";
        });

        //just for operators
        blks_en.filter( function(d){
                return d.type  == 'operator';
            }).append("circle")
            .attr("r", 1e-6)
            .classed(constants.wellsClass,true);   

        //In the exceptional case in which input are 4
        blks_en.filter( function(d){
            return d.input.length==4;
        }).append("circle").attr("r", 1e-6).classed(constants.wellsClass,true);
        blks_en.filter( function(d){
            return d.input.length==4;
        }).append("circle").attr("r", 1e-6).classed(constants.wellsClass,true);
        blks_en.filter( function(d){
            return d.input.length==4;
        }).append("circle").attr("r", 1e-6).classed(constants.wellsClass,true);          
    
    
    }  


/*  // ---- DEBUG ------
if(state.debug){
    console.log("enter blks: ");
    blks_en.each( function(i){
        console.log(i);
    });
    console.log("enter strt: ");
    strt_nd_en.each( function(i){
        console.log(i);
    });
} */

    //transition enter selection: move new nodes to their new position
    var strt_nd_tr = strt_nd_en.transition()
        .duration(constants.duration);

    var blks_tr = blks_en.transition()
        .duration(constants.duration);

    //start-end selection entering transition (applied to the group)
    strt_nd_tr.attr("transform", function(d) {
         //translate to current position x, y
         return "translate("+d.x+"," + d.y + ")";
        }).select("circle") // add to the transition the change in radius to 10
        .attr("r", function(d){
			return (d.size.width/2);
		});
    strt_nd_tr.select('text')
        .attr("font-size","20px")
        .text(function(d){ return d.title});

    //considering block entering transition
    if(settings.block.shape!="rect"){
        blks_tr.attr("transform", function(d) {//translate to current position x, y
            return "translate("+d.x+"," + d.y + ")";
           }).select("circle") // add to the transition the change in radius to 10
           .attr("r", function(d){
               return (d.size.width/2);
           });
        blks_tr.select('text')
           .attr("font-size","20px")
           .text(function(d){ 
                return d.title;
            });        
    }else{
        //blocks selection entering transition (applied to the group)
        blks_tr.attr("transform", function(d) {
            //translate to current position x, y
            return "translate("+d.x+"," + d.y + ")";
        }).selectAll('rect')
            .attr('width', function(d){ return d.size.width;} )
            .attr('height', function(d){ return d.size.height;} );
        blks_tr.select('text')
            .attr("font-size","20px")
            .attr("x", function(d){ return d.size.width/2; })
            .attr("y", function(d){ return d.size.height/2; })
            .text(function(d){
                return trimText(d.title,constants.block.titleMaxChars); 
                //return d.title;
            });
        blks_tr.select('text.fa-cog')
            .attr("font-size", function(d){ var v=d.size.iconsize; return v.toString(); })
            .attr("x", function(d){ return d.size.iconsize; })
            .attr("y", function(d){ return d.size.iconsize; });
        blks_tr.select('text.fa-times-circle')
            .attr("font-size", function(d){ var v=d.size.iconsize; return v.toString(); })
            .attr("x", function(d){ return d.size.width-(d.size.iconsize); })
            .attr("y", function(d){ return d.size.iconsize; });
        blks_tr.selectAll('circle')
            .attr("r", 6)
            .filter(function (d, i) { return i === 0 ;})
            .attr("cx", function(d){ return d.input[0].x ; })
            .attr("cy", function(d){ return d.input[0].y; })
        blks_tr.selectAll('circle')
            .filter(function (d, i) { return i === 1 ;})
            .attr("cx", function(d){ return d.output[0].x; })
            .attr("cy", function(d){ return d.output[0].y; });
        blks_tr.selectAll('circle')
            .filter(function (d, i) { return i === 2 ;}) //in case they are operators
            .attr("cx", function(d){ return d.input[1].x; })
            .attr("cy", function(d){ return d.input[1].y; });
        blks_tr.selectAll('circle')
            .filter(function (d, i) { return i === 3 ;}) //in case exception with 4 inputs
            .attr("cx", function(d){ return d.input[2].x; })
            .attr("cy", function(d){ return d.input[2].y; });
        blks_tr.selectAll('circle')
            .filter(function (d, i) { return i === 4 ;}) //in case exception with 4 inputs
            .attr("cx", function(d){ return d.input[3].x; })
            .attr("cy", function(d){ return d.input[3].y; });
    }   
    

    // ----------- update PATHS -----------

    var path_up = paths.selectAll("g.arc-group")
    .data(edges, function(d){
        return String(d.src.id) + "+" + String(d.dst.id);
    });

    // update existing paths: make the curve follow the node when moved
    if(settings.edge.shape!="curve"){
        path_up.selectAll("path").transition()
            .duration(constants.duration)
            .attr('d', function(d){
                var output = "M " + (d.src.x+d.src.output[0].x) +" "+ (d.src.y+d.src.output[0].y);
                if(d.dst.type=='operator'&& d.dst.parent.length>1
                    && d.src.x>=d.dst.parent[0].x && d.src.x>=d.dst.parent[1].x)
                    output = output+"L" + (d.dst.x+d.dst.input[1].x)+" "+ (d.dst.y+d.dst.input[1].y);
                else
                    output = output+"L" + (d.dst.x+d.dst.input[0].x)+" "+(d.dst.y+d.dst.input[0].y);
                return output;                
            });        
    }else{
        path_up.selectAll("path").transition()
            .duration(constants.duration)
            .attr('d', d3.linkVertical()
                .source(function (d) {return [d.src.x+d.src.output[0].x, d.src.y+d.src.output[0].y]})
                .target(function (d) {

                    if(d.dst.input.length==4 && d.dst.parent.length>1){
                        var i = d.dst.parent.indexOf(d.src);
                        return [d.dst.x+d.dst.input[i].x, d.dst.y+d.dst.input[i].y];
                    }else

                    if(d.dst.type=='operator'&& d.dst.parent.length>1 //right parent linked to the right well (input[1])
                    && d.src.x>=d.dst.parent[0].x && d.src.x>=d.dst.parent[1].x) //left parent linked to the left well (input[0])
                        return [d.dst.x+d.dst.input[1].x, d.dst.y+d.dst.input[1].y];
                    else
                        return [d.dst.x+d.dst.input[0].x, d.dst.y+d.dst.input[0].y];
                }));     
    }

    // add new paths
    // draw the new line/edges
    var path_en = path_up.enter().append("g")
        .attr("class", "arc-group");

    //give each new path a personalized class
    path_en.each(function(d) {
        if(d.class!=undefined)
            this.classList.add(d.class);
      });

    // add new paths
    // draw the new line/edges
    if(settings.edge.shape!="curve"){
        path_en.append('path')
            .attr("d", function(d){ return "M " + (d.src.x+d.src.size.width/2) +" "+ (d.src.y)+ //cursor to current position
                        "L" + (d.src.x+d.src.size.width/2)+" "+ (d.src.y)}); //draw a line to other position
    }else{
        path_en.append('path')
        .attr("d", d3.linkVertical()
             .source( function(d){ return [d.src.x+d.src.size.width/2, d.src.y]} )
             .target( function(d){ return [d.src.x+d.src.size.width/2, d.src.y]} )
             //.source( function(d){ return [d.src.output[0].x, d.src.output[0].y]} )
             //.target( function(d){ return [d.dst.input[0].x, d.dst.input[0].y]} )
         );
    }

    /*  // ---- DEBUG ------
    if(state.debug){
        console.log("update paths: ");
        path_up.each( function(i){
            console.log(i);
        });
        console.log("enter path: ");
        path_en.each( function(i){
            console.log(i);
        });
    } */

    //path transition
    if(settings.edge.shape!="curve"){
        path_en.selectAll('path').transition()
            .duration(constants.duration)
            .attr('d', function(d){
                var output = "M " + (d.src.x+d.src.output[0].x) +" "+ (d.src.y+d.src.output[0].y);
                if(d.dst.type=='operator'&& d.dst.parent.length>1
                    && d.src.x>=d.dst.parent[0].x && d.src.x>=d.dst.parent[1].x)
                        output = output+ "L" + (d.dst.x+d.dst.input[1].x)+" "+ (d.dst.y+d.dst.input[1].y);
                else
                    output = output+ "L" + (d.dst.x+d.dst.input[0].x)+" "+ (d.dst.y+d.dst.input[0].y);
                return output;
            });
    }else{
        path_en.selectAll('path').transition()
            .duration(constants.duration)
            .attr('d', d3.linkVertical()
                .source(function (d) {return [d.src.x+d.src.output[0].x, d.src.y+d.src.output[0].y]})
                .target(function (d) {

                    if(d.dst.input.length==4 && d.dst.parent.length>1){
                        var i = d.dst.parent.indexOf(d.src);
                        return [d.dst.x+d.dst.input[i].x, d.dst.y+d.dst.input[i].y];
                    }else

                    if(d.dst.type=='operator'&& d.dst.parent.length>1 //right parent linked to the right well (input[1])
                    && d.src.x>=d.dst.parent[0].x && d.src.x>=d.dst.parent[1].x) //left parent linked to the left well (input[0])
                        return [d.dst.x+d.dst.input[1].x, d.dst.y+d.dst.input[1].y];
                    else
                        return [d.dst.x+d.dst.input[0].x, d.dst.y+d.dst.input[0].y];
                    }));
    }



    // remove eliminated/old paths
    path_up.exit().remove()

    // remove old/eliminated nodes
    el_up.exit().remove();

    state.graphVersion++;
}

// functions to add nodes
function addNode(
    type= "block",
    title= "node title",
    parent = null,
    nodeclass = null,
    numInputs = null,
    x = null,
    y = null,
    x0= null,
    y0= null
    ){

    //integrity and constraints checks 
    if(  (type == "start" && settings.noStartNode)
        || (type!="start" && ( parent==null || parent.id==null || parent.id<0))
    ){

        if(state.debug) console.log( parent!=null && parent.id==null ? " -- ERR start" : " -- ERR parent node deleted");

    }else if(type!='start' && parent.children.length!=0 &&
                (parent.children[0].type=='end' || parent.children[0].type=='operator')
            ){

        if(state.debug) console.log(" -- ERR cannot add a child to a node connected to end or an operator");

    }else if(type!='start' && parent.type=="operator" && parent.children.length > 0){
        if(state.debug) console.log(" -- ERR an operator can have just one child");

    }else if(type == "end" && settings.noEndNode){

        if(state.debug) console.log(" -- ERR end");

    }else if( constants.binaryGraph==true && parent!=null && parent.children.length>1){
        if(state.debug) console.log(" -- ERR binary graph!");
    }else if( constants.block.nodeSingleChild == true 
            && parent!=null && parent.type!="start"
            && parent.children.length>0 ){
                if(state.debug) console.log(" -- ERR Node can only have one child!");
    }else{
        var newNode = {
                id: type=="start" ? 0 : ++state.currentID,
                type: type,
                title: title,
                parent: type=="start" ? null : [parent],
                children: [],
                class: nodeclass!=null ? nodeclass : constants.nodeClass,
                size: { width: type=="start" ? constants.start.width :
                               type=="end" ? constants.end.width :
                               settings.block.shape=="circle" ? constants.start.width :
							   constants.block.width,
                        height: type=="start" ? constants.start.width :
                               type=="end" ? constants.end.width :
                               settings.block.shape=="circle" ? constants.start.width :
							   constants.block.height,
                        marginl: type=="block"||type=="operator" ? constants.block.marginl : 0,
                        iconsize: type=="block"||type=="operator" ? constants.block.iconsize : 0
                    },
                //position
                x: x ? x :
                    type=="start" ? settings.start.xLoc :
                    type=="end" ? settings.end.xLoc :
                    parent!=null && type=='block'  ? //&& settings.block.shape=="rect"
                    parent.x-constants.block.height-constants.block.width :
                    parent!=null ? parent.x : 250,
                y: y ? y :
                    type=="start" ? settings.start.yLoc :
                    type=="end" ? parent.y+parent.size.height+constants.offsety :
                    //parent.type=="start" ? parent.y+constants.offsety :
                    parent!=null && type=='block' || type=='operator' ?
                    parent.y+parent.size.height+constants.offsety :
                    parent!=null ? (parent.y + constants.offsety)  : 250,
                x0: x0 ? x0 :
						type=="start" ? settings.start.x0Loc :
                        type=="end" ?  settings.end.x0Loc :
                    	parent!=null ? (parent.x+parent.size.width/2) : x,
                y0: y0 ? y0 :
                    type=="start" ? settings.start.y0Loc :
                    type=="end" ?  settings.end.y0Loc :
                    parent!=null ? (parent.y +parent.size.height) : y,
                input: type=="start" ? null :
                        type=="end" ? [{ x: constants.end.width/2, y: constants.end.width/2 }] :
                        type=="block"&&settings.block.shape=="circle" ? [{ x: constants.end.width/2, y: constants.end.width/2 }] :
                        type=="block"&&numInputs==4 ? [{x: constants.block.width/5, y: 0},
                            {x: (constants.block.width*2)/5, y: 0}, //workaround to handle this exception of 4 inputs node
                            {x: (constants.block.width*3)/5, y: 0},
                            {x: (constants.block.width*4)/5, y: 0}] :
                        type=="block" ? [ { x: constants.block.width/2, y: 0 }] :
                        type=="operator" ? [{x: constants.block.width/3, y: 0},
                                            {x: (constants.block.width*2)/3, y: 0}]
                        : null,
                output: type=="start" ? [{ x: (constants.start.width/2), y:(constants.start.width/2) }] :
                        type=="end" ? null :
                        type=="block"&&settings.block.shape=="circle" ? [{ x: (constants.start.width/2), y:(constants.start.width/2) }] :
                        type=="block"||type=="operator" ? [ { x: constants.block.width/2,
                                            y: constants.block.height}]
                        : null,
                //subtree is needed for the positioning algorithm to work
                subtree: {
                    w: type=="start" ? constants.start.width :
                           type=="end" ? constants.end.width :
                           type=="block" && settings.block.shape=="circle" ? constants.start.width 
                           + constants.block.marginl+constants.block.marginr :
                           constants.block.width + constants.block.marginl+constants.block.marginr,
                    prelim: 0,   //stores preliminar horizontal coordinate
                    mod:0,   //modifier: how much each node of the subtree should be moved horizontally
                    shift:0, //to update the mod
                    change:0,    //to update the mod
                    tl:null,    //thread left: reference to next node in the left contour
                    tr:null,    //thread right: reference to next node in right contour
                    el: null,   // extreme left node: lowest node in the subtree that can be seen from left
                    er: null,   //extreme right: lowest node visible from right
                    msel:0,  //modifier sum for extreme left
                    mser:0   //modifier sum for extreme right
                },           //contour: list of nodes that can be seen from left/right
                data: {
                    height: type=="start" ? 0 : parent.data.height +1,
                    status: 0
                },
                config: {}
        };
        

		if(parent!=null){
			//update the parent
			newNode.parent[0].children.push(newNode);
		}
        nodes.push(newNode);
        if(type!="start" && parent!=null){
            addArc(parent,newNode);
        }else{
            updateGraph();
        }
        return newNode;
    }

}


function addArc(
    source= undefined,
    destination=undefined,
    arcclass = null){

        if( !(source && destination)||
            (destination.type=='block' && constants.block.singleInput &&
                destination.input.length!=4 && //this case is an exception (node with 4 input)
                destination.parent.length>0 && destination.parent[0]!=source)||
            (destination.type=='operator' && destination.parent.length==2)
        ){
            if(state.debug) console.log(" -- ERR ARC");
        }else{

            if( (destination.type=='operator' 
                    && destination.parent.length>0
                    && destination.parent[0]!=source)
            ){
                //check if operator is under the rightmost parent
                //if it is swap the parents, so it will be under the leftmost
                if(destination.parent[0].x>source.x){
                    var tmpconfig = destination.config;
                    var tmpdata = destination.data;
                    var tmpclass = destination.class;
                    removeNode(destination);
                    var op = addNode(type="operator", title=tmpdata.name, parent = source, tmpclass);
                    op.data=tmpdata;
                    op.config=tmpconfig;
                    
                    addArc(destination.parent[0],op);
                    return;
                }else
                    destination.parent.push(source);
                source.children.push(destination);

                // move all intermediate node in parent of source so that the
                // two element attached to operator are close to each other.
                //go up the tree until parent has more child (in las case this will be root)
                var curr = source;
                var parent = null;
                var nodeB = null;
                var nodeA = null;
                var i=0;

                while(!(curr.children.legth>1)){
                    if(curr.parent[0].children.length>1){
                        //curr is the node i need to insert before
                        parent = curr.parent[0];
                        nodeB = curr;
                        break;
                    }
                    if(curr.parent.length>1 && i>0)
                        curr = curr.parent[1]
                    else
                        curr = curr.parent[0];
                    i++;
                }

                curr = destination;
                i=0;
                while(!(curr.children.legth>1)){
                    if(curr.parent[0].children.length>1){
                        //curr is the node near which
                        //i wanna move nodeB 
                        nodeA = curr;
                        break;
                    }
                    if(curr.parent.length>1 && i>0)
                        curr = curr.parent[1]
                    else
                        curr = curr.parent[0];
                    i++;
                }

                if(nodeA!=nodeB){
                    //i need to mode nodeA and nodeB close together to the left
                    //so the all the in-between subtrees will be move to the right
                    if(nodeA.x > nodeB.x ){
                        curr = nodeA;
                        nodeA = nodeB;
                        nodeB = curr;
                    }

                    //pop nodeB from parent children
                    var iB = parent.children.indexOf(nodeB);
                    if(iB>0)
                        parent.children.splice(iB,1)

                    //find index of nodeA
                    var iA = parent.children.indexOf(nodeA);

                    //push nodeB to the index next to nodeA
                    if(iA>-1)
                        parent.children.splice(iA+1,0,nodeB);

                }

            }else if(destination.input.length==4
                && destination.parent.length>0
                && destination.parent[0]!=source ){
                    //exception => do not care of edge overlapping
                    destination.parent.push(source);
                    source.children.push(destination);

            }

            var newArc = {
                src: source,
                dst: destination,
                class: arcclass
            };
            edges.push(newArc);
            updateGraph();
        }

}

//remove subtree first passage
// marks node to remove with id = -1
function removeSubtree(t){
    if(t.children!=null&&t.children.length!=0){
        t.children.forEach( function(e){
            removeSubtree(e);
        });    
    }
    t.id = -1;
    return;
}

//remove subtree second passage
//filter children/parent arrays to remove marked node
function removeParentChildren(t){
    if(t.children!=null && t.children.length!=0){
        t.children.forEach( function(e){
            removeParentChildren(e);
        });
    }
    t.children = t.children.filter( function(e){ return e.id!=-1; });
    if(t.parent!=null && t.parent.length>0){

        for(let i=0; i<t.parent.length; i++){
            t.parent[i].children = t.parent[i].children.filter( function(e){ return e.id!=-1; });
        }
        /*
        t.parent[0].children = t.parent[0].children.filter( function(e){ return e.id!=-1; });
        if(t.parent.length>1)
            t.parent[1].children = t.parent[1].children.filter( function(e){ return e.id!=-1; });
        */
    } 
    return;
}

function removeNode(t){
    if(t==null){
        if(state.debug) console.log(" -- - ERR removenode -- -");
        return;
    }

    //visit recursively all children of node deleting them 
    //(setting them to -1 and then filtering them out from arrays referincing them)
    removeSubtree(t);
    removeParentChildren(t);

    if(state.endNode!=null && state.endNode.id==-1)    state.endNode=null;

    //filter nodes
    nodes = nodes.filter( function(e){ return e.id!=-1; });
    edges = edges.filter(function(e){ return e.src.id!=-1 && e.dst.id!=-1});

    updateGraph();
}

function connectNodeToEnd(n){

    if(state.debug) console.log("-- connect to end ",n);

    if(n==null || n.type=='end' || n.children.length>0)
        return false;

    if(state.endNode!=null && state.endNode.type=='end'){
        //if end already exists
        if(state.debug) console.log("-- end already exists ");

        if( constants.end.nodeSingleParent==false){
            //add an arc to end node
            //cannoat add child to node n
            n.children.push(state.endNode);

            //add parent to node end
            state.endNode.parent.push(n);

            //add arc between them
            addArc(n, state.endNode);
        }else{
            return false; //one node already connected to end   
        }
            
    }else{
        //if end does not exists add it
        if(state.debug) console.log("-- end does not exists ");
        state.endNode = addNode(type="end", title="0", parent = n);
    }

    return state.endNode;
}

/* --- Functions from  A.J. van der Ploeg algorithm --- */

function VDPtreeLayout(t){
    if(state.debug) console.log("\t ---- VDP alg -----");
    VDPfirstWalk(t);

    if(state.debug) console.log("\t ---- second walk -----");
    VDPsecondWalk(t,0);
}

function VDPfirstWalk(t){
    if(t.subtree.el!=null && t.subtree.el.id==-1) t.subtree.el.id=null; //support to removeNode
    if(t.subtree.er!=null && t.subtree.er.id==-1) t.subtree.er.id=null;
    if(t.subtree.tl!=null && t.subtree.tl.id==-1) t.subtree.tl.id=null;
    if(t.subtree.tr!=null && t.subtree.tr.id==-1) t.subtree.tr.id=null;
    t.subtree.mod=0;
    t.subtree.prelim=0;
    if(t.children==null || t.children.length==0 ){ //leaf
        VDPsetExtremes(t);
        return;
    }
    VDPfirstWalk(t.children[0]);
    //create sibling in contour minimal vertical coordinate and index list
    let ih = VDPupdateIYL(VDPbottom(t.children[0].subtree.el), 0, null);

    for(var i=1; i< t.children.length; i++){
        VDPfirstWalk(t.children[i]);
        //stores lowest vertical coordinate while extreme nodes still point in current subtree
        var minY =  VDPbottom(t.children[i].subtree.er);
        VDPseparate(t, i, ih);
        ih = VDPupdateIYL(minY, i, ih);
    }
    VDPpositionRoot(t);
    VDPsetExtremes(t);
}

function VDPsetExtremes(t){
    if(t.children==null || t.children.length == 0){ 
        t.subtree.el  = t;
        t.subtree.er = t;
        t.subtree.msel = t.subtree.mser = 0;
    }else{
        t.subtree.el = t.children[0].subtree.el;
        t.subtree.msel = t.children[0].subtree.msel;
        t.subtree.er = t.children[t.children.length-1].subtree.er;
        t.subtree.mser = t.children[t.children.length-1].subtree.mser;
    }
}

function VDPseparate(t, i, ih){

    //if(ih == null){
       //console.log("wait i "+i+ " node "+t);
    //}

    //right contour node of left sibling and its sum of modifier.
    var sr = t.children[i-1];
    var mssr = sr.subtree.mod;
    //left contour node of current subtree and its modifier.
    var cl = t.children[i];
    var mscl = cl.subtree.mod;

    while(sr!=null && cl!= null){
        if(ih==null){ 
            if(state.debug) console.log("VDP ERR 1");
        }else
        //if(ih.low==undefined || VDPbottom(sr) > ih.lowY){
        if(VDPbottom(sr) > ih.lowY){
            if(ih.nxt == null){
                console.log("ih.nxt is null; i "+i+" lvl "+t.data.height+" node ",t);
            }
            ih = ih.nxt;
            //ih = ih.low==undefined ? null : ih.nxt;
        }

        //how far to the left of the right side of r is the left side of cl?
        var dist = (mssr + sr.subtree.prelim + sr.subtree.w)-(mscl+cl.subtree.prelim);
        if(dist > 0){
            mscl += dist;
            if(ih==null){   
                //if(state.debug) console.log("VDP ERR 2 - i "+i+"lvl "+t.data.height+" t ",t);
               // VDPmoveSubtree(t, i, i-1, dist);
            }else
                VDPmoveSubtree(t, i, ih.index, dist);
        }
        var sy = VDPbottom(sr), cy = VDPbottom(cl);
        //advance highest nodes and sums of modifiers (coord syst increases downward)
        if(sy <= cy){
            sr = VDPnextRightContour(sr);
            if(sr!=null) mssr += sr.subtree.mod;
        }
        if(sy >= cy){
            cl = VDPnextLeftContour(cl);
            if(cl!=null) mscl += cl.subtree.mod;
        }
    }
    //set threads and update extreme nodes
    //in the first case the current subtree must be taller than the left siblings
    if(sr==null && cl!=null) VDPsetLeftThread(t,i,cl,mscl);
    //in the second the left siblings must be taller than the current subtree.
    else if(sr!=null && cl==null) VDPsetRightThread(t,i,sr,mssr);
}

function VDPmoveSubtree(t, i, si, dist){
    //Move subtree by changing mod.
    t.children[i].subtree.mod += dist;
    t.children[i].subtree.msel += dist;
    t.children[i].subtree.mser += dist;
    VDPdistributeExtra(t,i,si,dist);
}

function VDPnextLeftContour(t){
    return t.children.length == 0 ? t.subtree.tl : t.children[0];
}

function VDPnextRightContour(t){
    return t.children.length == 0 ? t.subtree.tr : t.children[t.children.length-1];
}

function VDPbottom(t){
    return t.y + t.size.height;
}

function VDPsetLeftThread(t, i, cl, modsumcl){
    var li = t.children[0].subtree.el;
    li.subtree.tl = cl;
    //change mod so that the sum of modifier after following thread is correct
    var diff = (modsumcl - cl.subtree.mod)-t.children[0].subtree.msel;
    li.subtree.mod += diff;
    //change preliminary x coordinate so that the node does not move
    li.subtree.prelim -= diff;
    //update extreme node and its sum of modifiers
    t.children[0].subtree.el = t.children[i].subtree.el;
    t.children[0].subtree.msel = t.children[i].subtree.msel;
}

function VDPsetRightThread(t, i, sr, modsumsr){
    var ri = t.children[i].subtree.er;
    ri.subtree.tr = sr;
    var diff = (modsumsr - sr.subtree.mod)-t.children[i].subtree.mser;
    ri.subtree.mod += diff;
    ri.subtree.prelim -= diff;
    t.children[i].subtree.er = t.children[i-1].subtree.er;
    t.children[i].subtree.mser = t.children[i-1].subtree.mser;
}

function VDPpositionRoot(t){
    //position root between children, taking into account their mod
    t.subtree.prelim = (t.children[0].subtree.prelim +
                        t.children[0].subtree.mod +
                        t.children[t.children.length-1].subtree.mod +
                        t.children[t.children.length-1].subtree.prelim +
                        t.children[t.children.length-1].subtree.w
                    )/2 - t.subtree.w/2;
}

function VDPsecondWalk(t, modsum){
    modsum += t.subtree.mod; 
    // set absolute (non-relative) horizontal coordinate
    t.x = t.subtree.prelim + modsum + t.size.marginl;
    VDPaddChildSpacing(t);
    for(var i=0; i<t.children.length; i++)
        VDPsecondWalk(t.children[i], modsum);
}


function VDPdistributeExtra(t, i, si, dist){
    //are there intermediate children?
    // distribute distances to children to be good looking
    if( si!= i-1 ){
        var nr = i - si;
        t.children[si+1].subtree.shift+=dist/nr;
        t.children[i].subtree.shift-=dist/nr;
        t.children[i].subtree.change-=dist - dist/nr;
    }
}

function VDPaddChildSpacing(t){
    //process change and shift to add intermediate spacing to mod
    var d = 0, modsumdelta = 0;
    for(var i=0; i<t.children.length; i++){
        d += t.children[i].subtree.shift;
        modsumdelta += d + t.children[i].subtree.change;
        t.children[i].subtree.mod += modsumdelta;
    }

}

class IYL{
    constructor(lowY, index, nxt){
        this.lowY = lowY;
        this.index = index;
        this.nxt = nxt;
      }
}

function VDPupdateIYL(minY, i, ih){
    //remove siblings that are hidden by the new subtree
    while(ih != null && minY >= ih.lowY)
        ih = ih.nxt;
    //prepend the new subtree
    return new IYL(minY, i, ih);
}

/* --- END  A.J. van der Ploeg algorithm functions --- */

function setCustomFunction(f, type=null, i=1, arg=null){

    if(type=="start" && constants.start.customFunction1Enabled)
        customStartFunction1 = f;
    else if (type=="end" && constants.end.customFunction1Enabled)
        customEndFunction1 = f;
    else if ( (type=="block"||type=="operator") && i==1 && constants.block.customFunction1Enabled )
        customBlockFunction1 = f;
    else if ( (type=="block"||type=="operator") && i==2 && constants.block.customFunction2Enabled )
        customBlockFunction2 = f;
    else if ( (type=="block"||type=="operator" )&& i==3 && constants.block.customFunction3Enabled )
        customBlockFunction3 = f;
    else if(state.debug) console.log("customizable function disabled");
}

function customStartFunction1(d){
    alert('start function '+d.id);
    
}

//function triggered by icon2
function customEndFunction1(d){
    alert('end function '+d.id);
}

function customBlockFunction1(d){
    alert('open setting menu for node '+d.id);
}

//function triggered by icon2
function customBlockFunction2(d){
    //alert('delete node '+d.id);
    removeNode(d);
}

function customBlockFunction3(d){
    alert('function 3 '+d.id);
    
}


/* Made a JSON obj from the Graph nodes and edges */
function stringifyGraphJSON(){
    
    var nodes_decycled = nodes.map( function(f, i){
            var d = Object.assign({}, f);
            d.children = d.children!=null ? d.children.map(function(c){
                return c.id;
            }) : [];

            d.parent = d.parent!=null ? d.parent.map(function(p){
                    return p.id;
            }) : [];
            d.subtree = Object.assign({}, d.subtree);
            d.subtree.el = d.subtree.el!=null ? d.subtree.el.id : null;
            d.subtree.er = d.subtree.er!=null ? d.subtree.er.id : null;
            d.subtree.tl = d.subtree.tl!=null ? d.subtree.tl.id : null;
            d.subtree.tr = d.subtree.tr!=null ? d.subtree.tr.id : null;
            return d;
        });
   
    var edges_decycled = edges.map( function(f){
            var d = Object.assign({}, f);
            d.src = d.src.id;
            d.dst = d.dst.id;
            return d;
        });

    var jsobj = window.JSON.stringify({"nodes": nodes_decycled,
                                "edges": edges_decycled});
    return jsobj;
}

/* retrieve the graph parsing a JSON */
function parseGraphJSON(jsobj){
    try{

        var jsonObj = JSON.parse(jsobj);
        
        nodes = jsonObj.nodes.map( function(d){

                if(d.type=='end')
                    state.endNode =d;
                
                d.children = d.children!=null ? d.children.map(function(c){
                    return jsonObj.nodes[c];
                }) : [];
                d.parent = d.parent!=null ? d.parent.map(function(p){
                    return jsonObj.nodes[p];
                }) : [];
                d.subtree.el = d.subtree.el!=null ?  jsonObj.nodes[d.subtree.el] : null;
                d.subtree.er = d.subtree.er!=null ? jsonObj.nodes[d.subtree.er]: null;
                d.subtree.tl = d.subtree.tl!=null ? jsonObj.nodes[d.subtree.tl] : null;
                d.subtree.tr = d.subtree.tr!=null ? jsonObj.nodes[d.subtree.tr] : null;
                return d;
            });
        
        edges = jsonObj.edges.map( function(d){
                d.src = nodes[d.src];
                d.dst = nodes[d.dst];
                return d;
            });
        
        if(!settings.useAlternativeAlgorithm)
            updateGraph();
    }catch(err){
        window.alert("Error parsing uploaded file: " + err.message);
        return;
    }
}

function getAvailableOperators(){
    return nodes.filter(n => {
        return ( n.type=='operator' && n.parent.length==1)
                || ( n.type=='block' && n.input.length==4 && n.parent.length<4); //exception
    });
}

function storeGraphJSON(){
    var jsonObj = stringifyGraphJSON();
    
    //create a Blob of the json obj
    var blob = new Blob([jsonObj], {type: 'text/json'});

    //create a link element end a mouse event to trigger it
    var e = document.createEvent('MouseEvents');
    var a = document.createElement('a');

    //set attributes to the link
    a.download = 'gen-graph.json';
    a.href = window.URL.createObjectURL(blob);
    a.dataset.downloadurl =  ['text/json', a.download, a.href].join(':');

    //trigger the event
    e.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
    a.dispatchEvent(e);
}

function readFileContent(file) {
	const reader = new FileReader()
  return new Promise((resolve, reject) => {
    reader.onload = event => resolve(event.target.result)
    reader.onerror = error => reject(error)
    reader.readAsText(file)
  })
}

function loadGraphJSON(){

    //add an input to upload the file and the event to trigger it
    var e = document.createEvent('MouseEvents');
    var i = document.createElement('input');
    
    i.type = 'file';
    i.name  = 'ggen-graph.json';
    i.onchange = function(e){
        var input = e.target;
        if ('files' in input && input.files.length > 0) {
            
            var file = input.files[0];
            readFileContent(file).then(content => {
                parseGraphJSON(content);
            });
        }
    };
    
    e.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
    i.dispatchEvent(e);
    
}

function getJsonStrGraph(){
    //build and return a jsonStrGraph, following las query module template
    var strGraph = {};
    
    nodes.forEach(n => {

        if(n.type=="end"){
            n.config.id="end";
            //n.config.translators = n.config.translat;
            //n.config.query_path_id = [null];
        }

        else if(n.type=="start")
            n.config.id="start";
        else
            n.config.id = n.id;
        
        if(n.type!="end"){
            n.config.w_out = [];
            n.children.forEach( c =>{
                if(c.type=="end")
                    n.config.w_out.push("end");
                else
                    n.config.w_out.push(""+c.id+".0");
            });
        }

        if(n.type!="start"){
            n.config.w_in = [];
            n.parent.forEach( p =>{
                if(p.type=="start")
                    n.config.w_in.push("start");
                else
                    n.config.w_in.push(""+p.id);
            });
        }
             
        strGraph[n.config.id] = n.config;
    });

    return strGraph;
}


function setAlternativeAlgorithm(alg){
    if(alg=='WS' || alg=='W' || alg=='RT'){

        //set alternative algorithm
        settings.useAlternativeAlgorithm = true;
        settings.algorithm = alg;

        ggen.setBinary();
        ggen.setLinearEdges();
        ggen.setCircleBlocks();
        
        return true;
    }else
        return false;
}

function triggerAlternativeAlgorithm(){
        //substitute for each node data with data: {status:null,height:0,}
        var maxheight= 0;
        nodes.forEach(n =>{
            if(n.data.height>maxheight) maxheight=n.data.height;
        });

        //compute the x, y position with the algorithm
        if(settings.algorithm=='WS')
            WStreeLayout(nodes[0],maxheight);
        if(settings.algorithm=='RT')
            var minx = RTtreeLayout(nodes[0],0);
       
        nodes = nodes.map( d =>{
            //multiply for the x
            if(settings.algorithm=='WS'){
                d.x = d.x * (constants.start.width + 10);
                d.y = d.y * constants.start.width;
            }
            if(settings.algorithm=='RT'){
                d.x = d.x + Math.abs(minx);
                d.x = d.x * (constants.start.width + 10);
                d.y = (d.y+1) * constants.start.width;
            }

            return d;
        });

        //updateGraph
        updateGraph();   
}

function clearGraph(){
    removeNode(nodes[0]);
}

function getNextNodeId(){
    return state.currentID+1;
}

// manage text ellipses
function trimText(text, threshold) {
    if (text.length <= threshold) return text;
    return text.substr(0, threshold).concat("...");
}

//variables and method that shouldn't be exposed
//they are exposed just for debugging purpose
//exports.settings = settings;
//exports.constants = constants;
//exports.state = state;
exports.updateGraph = updateGraph;
exports.nodes = function(){
    return nodes;
};
exports.edges = function(){
    return edges;
};
exports.endNode = function(){
    return state.endNode;
};
exports.stringifyGraphJSON = stringifyGraphJSON;
exports.parseGraphJSON = parseGraphJSON;
exports.graphVersion = state.graphVersion;

// variables and method that should be exposed
exports.version = version;
exports.initCanvas = initCanvas;
exports.addNode = addNode;
exports.addArc = addArc;
exports.removeNode = removeNode;
exports.connectNodeToEnd = connectNodeToEnd;
exports.setCustomFunction = setCustomFunction;
exports.setBinary = setBinary;
exports.setLinearEdges = setLinearEdges;
exports.setCircleBlocks = setCircleBlocks;
exports.setDragAndZoom = setDragAndZoom;
exports.setNodeSpacing = setNodeSpacing;
exports.currentSelectedNode = currentSelectedNode;
exports.getAvailableOperators = getAvailableOperators;
exports.storeGraphJSON = storeGraphJSON; 
exports.loadGraphJSON = loadGraphJSON; 
exports.getJsonStrGraph = getJsonStrGraph;
exports.setAlternativeAlgorithm = setAlternativeAlgorithm;
exports.triggerAlternativeAlgorithm = triggerAlternativeAlgorithm;
exports.clearGraph = clearGraph;
exports.getNextNodeId = getNextNodeId;

// from d3.js
//Object.defineProperty(exports, '__esModule', { value: true });

})));
