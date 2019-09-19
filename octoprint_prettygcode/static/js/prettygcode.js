$(function () {
    console.log("Create PrettyGCode View Model");
    function PrettyGCodeViewModel(parameters) {
        var self = this;
        console.log("PrettyGCode View Model");




        // self.fromHistoryData= function (data) {
        //     console.log("fromHistoryData")
        // };

        var printHeadPosition=new THREE.Vector3(0,0,0);
        var newPrintHeadPosition=new THREE.Vector3(0,0,0);
        self.fromCurrentData= function (data) {
            //console.log(["fromCurrentData",data])
            if(data.logs.length){
                data.logs.forEach(function(e,i)
                {
                    if(e.startsWith("Send:"))
                    {
                        if(e.indexOf(" G")>-1)
                        {
                            var x= parseFloat(e.split("X")[1])
                            if(!Number.isNaN(x))
                                newPrintHeadPosition.x=x;
                            var y= parseFloat(e.split("Y")[1])
                            if(!Number.isNaN(y))
                                newPrintHeadPosition.y=y;
                            var z= parseFloat(e.split("Z")[1])
                            if(!Number.isNaN(z))
                            {
                                newPrintHeadPosition.z=z;
                                if(layerDisplay.sync){
                                    scene.traverse(function (child) {
                                        if (child.name.startsWith("layer#")) {
                                            if (child.userData.layerZ <= newPrintHeadPosition.z) {
                                                layerDisplay.end=child.userData.layerNumber;
                    
                                            }
                                        }
                                    });
                                }
                            }

                            nozzleModel.position.copy(newPrintHeadPosition);

                        }
                            //console.log(["GCmd:",e]);
                        //e.indexOf("G0")
                    }
                })
            }
        };

        self.onAfterBinding = function () {
            console.log("onAfterBinding")
            //var tab = $("#tab_plugin_webcamtab");
            //var webcam = $("#webcam_container");
            //if (webcam) {
            //    var hint = webcam.next();
            //    tab.append(webcam.detach());
            //    if (hint && hint.attr("data-bind") === "visible: keycontrolPossible") {
            //        tab.append(hint.detach());
            //    }
            //}
        };

        var gcodeUpdateWatcher = 0;

        var viewInitialized = false;
        self.onTabChange = function (current, previous) {
            // replaced #control with #tab_plugin_webcamtab
            if (current == "#tab_plugin_prettygcode") {


                if (!viewInitialized) {
                    viewInitialized = true;
                    //var origStateView = $("#state_wrapper").clone()
                    //$(".accordion").append(origStateView)



/*                    


                    var stateView = $("#state_wrapper").first().clone()
                    //stateView.attr("id","state_wrapper");

                    //var stateView = $("<iframe id='state_wrapper' style='height:900px' src='/?focus=.accordion'></iframe>").clone()


                    $(".gwin").append(stateView)

                    if ($('.gwin #state_wrapper').draggable) {//todo Why is draggable not defined in some browsers.
                        $('.gwin #state_wrapper').draggable({
                            //    handle: "#handle",
                            //    appendTo: 'body',
                            //    stack: 'div',
                            containment: "#gwin",
                        });
                    }

                        var camView = $("#webcam_rotator").clone();
                        $(".gwin").append(camView)
                    if ($('.gwin #state_wrapper').draggable) {//todo Why is draggable not defined in some browsers.
                        $('.gwin #webcam_rotator').draggable({
                            //    handle: "#handle",
                            //    appendTo: 'body',
                            //    stack: 'div',
                            containment: "parent",
                            start: function (event, ui) {
                                $(this).css({
                                    right: "auto",
                                    bottom: "auto"
                                });
                            }
                        });
                    }
*/
                    var camView = $("#webcam_rotator").clone();
                    $(".gwin").append(camView)

                    //check url for fullscreen mode
                    if (urlParam("fullscreen"))
                        $(".page-container").addClass("pgfullscreen");

                    $(".fstoggle").on("click", function () {
                        $(".page-container").toggleClass("pgfullscreen");
                    });
                }

                $(".gwin #webcam_image").attr("src", "/webcam/?action=stream&" + Math.random())

                updateStatus();//Do at once.
                //and then to every second.
                gcodeUpdateWatcher = setInterval(function () {
                    updateStatus();//
                }, 1000);

                //self.control._enableWebcam();
            } else if (previous == "#tab_plugin_prettygcode") {
                clearInterval(gcodeUpdateWatcher);
                $(".gwin #webcam_image").attr("src", "")
                //self.control._disableWebcam();
            }
        };

        String.prototype.hashCode = function () {
            var hash = 0, i, chr;
            if (this.length === 0) return hash;
            for (i = 0; i < this.length; i++) {
                chr = this.charCodeAt(i);
                hash = ((hash << 5) - hash) + chr;
                hash |= 0; // Convert to 32bit integer
            }
            return hash;
        };


        urlParam = function (name) {
            var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
            if (results == null) {
                return null;
            }
            return decodeURI(results[1]) || 0;
        }

        var focus = urlParam("focus");
        if (focus != null) {
            console.log("Focusing on:" + focus);
            $("body").children().hide();
            $("#webcam_container").hide();
            if (!focus.startsWith("."))
                focus = "#" + focus;
            var el = $(focus)[0];
            $("body").prepend(el);
        }

        //todo. parser rewrite. build per "extrude" or travel. Change when extrude or type or layer changes.

        //self.settings = parameters[0];

        function GCodeParser(data) {

            var state = { x: 0, y: 0, z: 0, e: 0, f: 0, extruding: false, relative: false };
            var layers = [];
            
            var currentLayer = undefined;

            var defaultColor = new THREE.Color('black');
            var curColor = defaultColor;
            var curMaterial = new THREE.LineMaterial({
                linewidth: 6, // in pixels
                //color: new THREE.Color(curColorHex),// rainbow.getColor(layers.length % 64).getHex()
                vertexColors: THREE.VertexColors,
                //transparent: true,
                //opacity:0.35,
            });

            var curLineBasicMaterial = new THREE.LineBasicMaterial( {
                color: 0xffffff,
                vertexColors: THREE.VertexColors
            } );
            

            //var shadowMaterial = new THREE.LineMaterial({
            //    linewidth: 6, // in pixels
            //    color: new THREE.Color("blue"),// rainbow.getColor(layers.length % 64).getHex()
            //    //vertexColors: THREE.VertexColors,
            //    transparent: false,
            //    opacity: 0.1,
            //});
            //todo. handle window resize
            curMaterial.resolution.set(gcodeWid, gcodeHei);
            //shadowMaterial.resolution.set(gcodeWid, gcodeHei);

            function addObject(layer, extruding) {

                //var geometry = new THREE.BufferGeometry();
                //geometry.addAttribute('position', new THREE.Float32BufferAttribute(vertex, 3));

                //var segments = new THREE.LineSegments(geometry, extruding ? extrudingMaterial : pathMaterial);
                //segments.name = 'layer' + layers.length;
                //object.add(segments);

                if (layer.vertex.length > 2) {


                    if(layerDisplay.fatLines){
                        var geo = new THREE.LineGeometry();
                        geo.setPositions(layer.vertex);
                        geo.setColors(layer.colors)
                        var line = new THREE.Line2(geo, curMaterial);
                        line.name = 'layer#' + layers.length;
                        line.userData={layerZ:layer.z,layerNumber:layers.length+1};
                        object.add(line);
                        //line.renderOrder = 2;
                    }else{
                        var geo = new THREE.BufferGeometry();
                        geo.addAttribute( 'position', new THREE.BufferAttribute( new Float32Array(layer.vertex), 3 ) );
                        geo.addAttribute( 'color', new THREE.BufferAttribute( new Float32Array(layer.colors), 3 ) );
                        var line = new THREE.LineSegments( geo, curLineBasicMaterial );
                        line.name = 'layer#' + layers.length;
                        line.userData={layerZ:layer.z,layerNumber:layers.length+1};
                        object.add(line);

                    }



                    // geo = new THREE.LineGeometry();
                    // geo.setPositions(layer.vertex.slice(0));
                    // //geo.setColors(layer.colors.slice(0))

                    // var line = new THREE.Line2(geo, shadowMaterial);
                    // line.name = 'shadow-layer#' + layers.length;
                    // line.renderOrder = 1;
                    // object.add(line);

                }
               

            }


            function newLayer(line) {

                if (currentLayer !== undefined) {
                    addObject(currentLayer, true);
                }

                currentLayer = { vertex: [], pathVertex: [], z: line.z, colors: [] };
                layers.push(currentLayer);
                //console.log("layer #" + layers.length + " z:" + line.z);

                //update ui.
                if ($("#myslider-vertical").length) {
                    $("#myslider-vertical").slider("setMax", layers.length)
                    $("#myslider-vertical").slider("setValue", layers.length)
                    layerDisplay.end = layers.length;
                }
            }

            function addSegment(p1, p2) {
                if (currentLayer === undefined) {
                    newLayer(p1);
                }
                currentLayer.vertex.push(p1.x, p1.y, p1.z);
                currentLayer.vertex.push(p2.x, p2.y, p2.z);

                if (curColor != defaultColor) {
                    sceneBounds.expandByPoint(p1);
                    sceneBounds.expandByPoint(p2);
                }

                if(layerDisplay.showMirror){
                        //add mirror version
                    currentLayer.vertex.push(p1.x, p1.y, -p1.z);
                    currentLayer.vertex.push(p2.x, p2.y, -p2.z);
                }

                if (true)//faux shading. Darken line color based on angle
                {
                    var deltaX = p2.x - p1.x;
                    var deltaY = p2.y - p1.y;
                    var rad = Math.atan2(deltaY, deltaX);

                    rad = Math.abs(rad)
                    var per = (rad) / (2.0 * 3.1415);
                    //console.log(rad + " " + per);

                    var drawColor = new THREE.Color(curColor)
                    var hsl = {}
                    drawColor.getHSL(hsl);
                    hsl.l = per+0.25;
                    drawColor.setHSL(hsl.h,hsl.s,hsl.l);
                    //console.log(drawColor.r + " " + drawColor.g + " " + drawColor.b )
                    currentLayer.colors.push(drawColor.r, drawColor.g, drawColor.b);
                    currentLayer.colors.push(drawColor.r, drawColor.g, drawColor.b);

                    if(layerDisplay.showMirror){
                        //add mirror version
                        drawColor.setHSL(hsl.h, hsl.s, hsl.l/2);
                        currentLayer.colors.push(drawColor.r, drawColor.g, drawColor.b);
                        currentLayer.colors.push(drawColor.r, drawColor.g, drawColor.b);
                    }
                }
                else {

                    currentLayer.colors.push(curColor.r, curColor.g, curColor.b);
                    currentLayer.colors.push(curColor.r, curColor.g, curColor.b);
                }
            }

            function delta(v1, v2) {
                return state.relative ? v2 : v2 - v1;
            }

            function absolute(v1, v2) {
                return state.relative ? v1 + v2 : v2;
            }

            var previousPiece = "";
            this.parse = function (chunk) {

                //remove comments from chunk.
                //var lines = chunk.replace(/;.+/g, '').split('\n');
                //or not
                var lines = chunk.split('\n');

                //handle partial lines from previous chunk.
                lines[0] = previousPiece + lines[0];
                previousPiece = lines[lines.length - 1];

                //note -1 so we dont process last line in case it is a partial.
                //Todo process the last line. Probably not needed since last line is usually gcode cleanup and not extruded lines.
                for (var i = 0; i < lines.length - 1; i++) {

                    var tokens = lines[i].split(' ');
                    var cmd = tokens[0].toUpperCase();

                    //Argumments
                    var args = {};
                    tokens.splice(1).forEach(function (token) {

                        if (token[0] !== undefined) {

                            var key = token[0].toLowerCase();
                            var value = parseFloat(token.substring(1));
                            args[key] = value;

                        }

                    });

                    //Process commands
                    //G0/G1 - Linear Movement
                    if (cmd.startsWith(";TYPE")) {
                        if (cmd.indexOf("INNER") > -1) {
                            curColor = new THREE.Color(0x00ff00);//green
                        }
                        else if (cmd.indexOf("OUTER") > -1) {
                            curColor = new THREE.Color('red');
                        }
                        else if (cmd.indexOf("FILL") > -1) {
                            curColor = new THREE.Color('orange');
                        }
                        else if (cmd.indexOf("SKIN") > -1) {
                            curColor = new THREE.Color('yellow');
                        }
                        else if (cmd.indexOf("SUPPORT") > -1) {
                            curColor = new THREE.Color('skyblue');
                        }
                        else
                        {
                            var curColorHex = (Math.abs(cmd.hashCode()) & 0xffffff);
                            curColor = new THREE.Color(curColorHex);
                            console.log(cmd + ' ' + curColorHex.toString(16))
                        }
                        //console.log(lines[i])
                    }
                    if (cmd === 'G0' || cmd === 'G1') {
                        var line = {
                            x: args.x !== undefined ? absolute(state.x, args.x) : state.x,
                            y: args.y !== undefined ? absolute(state.y, args.y) : state.y,
                            z: args.z !== undefined ? absolute(state.z, args.z) : state.z,
                            e: args.e !== undefined ? absolute(state.e, args.e) : state.e,
                            f: args.f !== undefined ? absolute(state.f, args.f) : state.f,
                        };
                        //Layer change detection is or made by watching Z, it's made by watching when we extrude at a new Z position
                        if (delta(state.e, line.e) > 0) {
                            var diff = delta(state.e, line.e);
                            line.extruding = delta(state.e, line.e) > 0;
                            if (currentLayer == undefined || line.z != currentLayer.z) {
                                newLayer(line);
                            }
                        }

                        //make sure extruding is updated. might not be needed.
                        line.extruding = delta(state.e, line.e) > 0;
                        if (line.extruding)
                            addSegment(state, line);//only if extruding right now.
                        state = line;
                    } else if (cmd === 'G2' || cmd === 'G3') {
                        //G2/G3 - Arc Movement ( G2 clock wise and G3 counter clock wise )
                        console.warn('THREE.GCodeLoader: Arc command not supported');
                    } else if (cmd === 'G90') {
                        //G90: Set to Absolute Positioning
                        state.relative = false;
                    } else if (cmd === 'G91') {
                        //G91: Set to state.relative Positioning
                        state.relative = true;
                    } else if (cmd === 'G92') {
                        //G92: Set Position
                        var line = state;
                        line.x = args.x !== undefined ? args.x : line.x;
                        line.y = args.y !== undefined ? args.y : line.y;
                        line.z = args.z !== undefined ? args.z : line.z;
                        line.e = args.e !== undefined ? args.e : line.e;
                        state = line;
                    } else {
                        //console.warn( 'THREE.GCodeLoader: Command not supported:' + cmd );
                    }
                }

                var bsize=sceneBounds.getSize();


                if(dimensionsGroup===undefined)
                {
                    dimensionsGroup = new THREE.Group();
                    dimensionsGroup.name = 'dimensions';
                    scene.add(dimensionsGroup);
                }

                var loader = new THREE.FontLoader();
				loader.load( '/plugin/prettygcode/static/js/helvetiker_bold.typeface.json', function ( font ) {
					var xMid, text;
					var color = 0x006699;
					var matDark = new THREE.LineBasicMaterial( {
						color: color,
						side: THREE.DoubleSide
					} );
					var matLite = new THREE.MeshBasicMaterial( {
						color: color,
						transparent: true,
						opacity: 0.8,
						side: THREE.DoubleSide
                    } );
                    var center =new THREE.Vector3(0,0,0);
                    sceneBounds.getCenter(center);
                    //console.log(["center",center]);

                    //clear out any old lines
                    for (var i = dimensionsGroup.children.length - 1; i >= 0; i--) {
                        dimensionsGroup.remove(dimensionsGroup.children[i]);
                    }

                    var textHeight=3;
                    var textZ=0.2;
					var message = bsize.x.toFixed(2)+ " MM";
					var shapes = font.generateShapes( message, textHeight );
					var geometry = new THREE.ShapeBufferGeometry( shapes );
					geometry.computeBoundingBox();
					xMid = - 0.5 * ( geometry.boundingBox.max.x - geometry.boundingBox.min.x );
					geometry.translate( xMid, 0, 0 );
					// make shape ( N.B. edge view not visible )
					text = new THREE.Mesh( geometry, matLite );
					text.position.set(center.x,sceneBounds.min.y-(textHeight*2),textZ);
                    dimensionsGroup.add( text );

                    var lineMat = new THREE.LineMaterial({
                        linewidth: 6, // in pixels
                        color: color
                    });
                    lineMat.resolution.set(gcodeWid, gcodeHei);

                    var lineGeo = new THREE.LineGeometry();
                    var lineVerts=[
                        sceneBounds.min.x,sceneBounds.min.y-(textHeight*0.8),textZ,
                        sceneBounds.max.x,sceneBounds.min.y-(textHeight*0.8),textZ,

                        sceneBounds.min.x,sceneBounds.min.y-1,textZ,
                        sceneBounds.min.x,sceneBounds.min.y-(textHeight*1.2),textZ,

                        sceneBounds.max.x,sceneBounds.min.y-1,textZ,
                        sceneBounds.max.x,sceneBounds.min.y-(textHeight*1.2),textZ,
                    ];
                    lineGeo.setPositions(lineVerts);
                    var line = new THREE.Line2(lineGeo, lineMat);
                    dimensionsGroup.add(line);

                    var textHeight=3;
					var message = bsize.y.toFixed(2)+ " MM";
					var shapes = font.generateShapes( message, textHeight );
					var geometry = new THREE.ShapeBufferGeometry( shapes );
					geometry.computeBoundingBox();
                    xMid = - 0.5 * ( geometry.boundingBox.max.x - geometry.boundingBox.min.x );
					geometry.translate( xMid, 0, 0 );
                    geometry.rotateZ(Math.PI / 2);
					// make shape ( N.B. edge view not visible )
					text = new THREE.Mesh( geometry, matLite );
					text.position.set(sceneBounds.max.x+(textHeight*2),center.y,textZ);
                    dimensionsGroup.add( text );

                    var lineGeo = new THREE.LineGeometry();
                    var lineVerts=[
                        sceneBounds.max.x+(textHeight*0.8),sceneBounds.min.y,textZ,
                        sceneBounds.max.x+(textHeight*0.8),sceneBounds.max.y,textZ,

                        sceneBounds.max.x+1,sceneBounds.min.y,               textZ,
                        sceneBounds.max.x+(textHeight*1.2),sceneBounds.min.y,textZ,

                        sceneBounds.max.x+1,sceneBounds.max.y,               textZ,
                        sceneBounds.max.x+(textHeight*1.2),sceneBounds.max.y,textZ,
                    ];
                    lineGeo.setPositions(lineVerts);
                    var line = new THREE.Line2(lineGeo, lineMat);
                    dimensionsGroup.add(line);


                    var textHeight=3;
					var message = bsize.z.toFixed(2)+ " MM";
					var shapes = font.generateShapes( message, textHeight );
					var geometry = new THREE.ShapeBufferGeometry( shapes );
					geometry.computeBoundingBox();
                    xMid =0;// - 0.5 * ( geometry.boundingBox.max.x - geometry.boundingBox.min.x );
					geometry.translate( xMid, 0, 0 );
                    geometry.rotateX(Math.PI / 2);
					// make shape ( N.B. edge view not visible )
					text = new THREE.Mesh( geometry, matLite );
					text.position.set(sceneBounds.max.x+(textHeight*1),sceneBounds.max.y,center.z);
                    dimensionsGroup.add( text );

                    var lineGeo = new THREE.LineGeometry();
                    var lineVerts=[
                        sceneBounds.max.x+(textHeight*0.8),sceneBounds.max.y+(textHeight*0.8),0,
                        sceneBounds.max.x+(textHeight*0.8),sceneBounds.max.y+(textHeight*0.8),bsize.z,

                        // sceneBounds.max.x+1,sceneBounds.min.y,               textZ,
                        // sceneBounds.max.x+(textHeight*1.2),sceneBounds.min.y,textZ,

                        // sceneBounds.max.x+1,sceneBounds.max.y,               textZ,
                        // sceneBounds.max.x+(textHeight*1.2),sceneBounds.max.y,textZ,
                    ];
                    lineGeo.setPositions(lineVerts);
                    var line = new THREE.Line2(lineGeo, lineMat);
                    dimensionsGroup.add(line);

				} ); 
                 
                var dist = Math.max(Math.abs(bsize.x), Math.abs(bsize.y)) / 2;
                console.log(dist)
                cameraControls.dollyTo(dist * 2.0 ,true);


            }

            var object = new THREE.Group();
            object.name = 'gcode';
            //object.quaternion.setFromEuler(new THREE.Euler(- Math.PI / 2, 0, 0));



            this.getObject = function () {
                return object;
            }

        };

        //var container;
        var camera, cameraControls, scene, renderer, loader,light;
        var nozzleModel;
        var clock;
        var dimensionsGroup;
        var sceneBounds = new THREE.Box3();
        //var gcodeWid = 1280 ;
        //var gcodeHei = 960;
        var gcodeWid = 580;
        var gcodeHei = 580;
        var visLayer = 1;
        var gui;

        function resizeCanvasToDisplaySize() {
            const canvas = renderer.domElement;
            // look up the size the canvas is being displayed
            const width = canvas.clientWidth;
            const height = canvas.clientHeight;

            // adjust displayBuffer size to match
            if (canvas.width !== width || canvas.height !== height) {
 //console.log([width, height]);

                // you must pass false here or three.js sadly fights the browser
                renderer.setSize(width, height, false);
                camera.aspect = width / height;
                camera.updateProjectionMatrix();
                gcodeWid = width;
                gcodeHei = height;
                cameraControls.setViewport(0, 0, width, height);

            }
        }

        var LayerDisplay = function () {
            this.start = 0;
            this.end = 100;
            this.showMirror=false;
            this.fatLines=false;
            this.transparency=false;
            this.sync=false;
            //this.displayOutline = false;
            this.reload = function () { loadGcode('/downloads/files/local/' + curJobName); };
        };
        var layerDisplay = new LayerDisplay();

        if(true){
            //simple gui
            dat.GUI.TEXT_OPEN="View Options"
            dat.GUI.TEXT_CLOSED="View Options"
            gui = new dat.GUI({ autoPlace: false,name:"View Options",closed:true,closeOnTop:true });

            var guielem = $("<div id='mygui' style='position:absolute;right:95px;top:20px;opacity:0.8;z-index:5;'></div>");

            $('.gwin').prepend(guielem)

            $('#mygui').prepend(gui.domElement);

            //gui.add(layerDisplay, 'start', 0, 100);
            //gui.add(layerDisplay, 'end', 0, 100);
            gui.remember(layerDisplay);
            gui.add(layerDisplay, 'showMirror');
            gui.add(layerDisplay, 'fatLines');
            gui.add(layerDisplay, 'transparency');
            gui.add(layerDisplay, 'reload');
            gui.add(layerDisplay, 'sync');
        }

        function loadGcode(url) {
            function animate() {

                //set visible layers
                scene.traverse(function (child) {
                    if (child.name.startsWith("layer#")) {
                        var num = child.name.split("#")[1]
                        if (num < layerDisplay.end) {
                            child.visible = true;

                        }
                        else {
                            child.visible = false;
                        }
                    }
                });

                const delta = clock.getDelta();
                const elapsed = clock.getElapsedTime();
                const updated = cameraControls.update(delta);
                cameraControls.dollyToCursor = true;

                resizeCanvasToDisplaySize();

                renderer.render(scene, camera);
                requestAnimationFrame(animate);
            }

            //add gcode window to page.
            if (true||$(".gwin").length < 1) {
                if (false) {
                    //$('.gwin').resizable({
                    //    resize: function (event, ui) {
                    //        camera.aspect = ui.size.width / ui.size.height;
                    //        camera.updateProjectionMatrix();
                    //        renderer.setSize(ui.size.width, ui.size.height);
                    //        cameraControls.setViewport(0, 0, ui.size.width, ui.size.height);

                    //    }
                    //});
                    //$('.gwin').draggable({
                    //    handle: "#handle",
                    //    appendTo: 'body',
                    //    stack: 'div',
                    //});
                    //$('.gwin').css({ 'top': 10, 'left': 20})


                    $("#state_wrapper,#files_wrapper").draggable({
                        appendTo: 'body',
                        stack: 'div',
                    });


                } else {

                    //var gwin = $(".gwin");

                    //var canvas = $("<canvas  id='mycanvas' style='width:100%;height:100%'></canvas>");
                    //gwin.append(canvas);


                }

                //todo allow save/pos camera at start.
                camera = new THREE.PerspectiveCamera(70, 2, 0.1, 10000);
                //camera = new THREE.PerspectiveCamera(60, gcodeWid / gcodeHei, 0.1, 10000);
                camera.up.set(0,0,1);
                camera.position.set(310, 0, 50);


                CameraControls.install({ THREE: THREE });
                clock = new THREE.Clock();

                var canvas = $("#mycanvas");
                cameraControls = new CameraControls(camera, canvas[0]);
                cameraControls.setTarget(150, 150, 0, false);;


                //for debugging
                window.myCameraControls = cameraControls;

                // Mouse buttons
                //!!are now set in camera-controls.js 
                //cameraControls.mouseButtons = { ORBIT: THREE.MOUSE.RIGHT, /*ZOOM: THREE.MOUSE.MIDDLE,*/ PAN: THREE.MOUSE.MIDDLE };

                renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("mycanvas") });

                //renderer = new THREE.WebGLRenderer();
                //todo. is this right?
                renderer.setPixelRatio(window.devicePixelRatio);

                //renderer.setSize(gcodeWid, gcodeHei);
                //container.append(renderer.domElement);




            }

            scene = new THREE.Scene();
            scene.background = new THREE.Color(0xd0d0d0);

            //for debugging
            window.myScene = scene;

            var planeGeometry = new THREE.PlaneGeometry( 300, 300 );
            var planeMaterial = new THREE.MeshBasicMaterial( {color: 0x909090, 
                side: THREE.DoubleSide,
                transparent: layerDisplay.transparency,
                opacity:0.2,
            });
            var plane = new THREE.Mesh( planeGeometry, planeMaterial );
            plane.position.set(150,150,-0.1);
            //plane.quaternion.setFromEuler(new THREE.Euler(- Math.PI / 2, 0, 0));
            scene.add( plane );


            //todo. make bed sized. 
            var grid = new THREE.GridHelper(300, 30, 0x000000, 0x888888);
            grid.position.set(150,150,0);
            if(layerDisplay.transparency){
                grid.material.opacity = 0.6;
                grid.material.transparent = true;
            }
            grid.quaternion.setFromEuler(new THREE.Euler(- Math.PI / 2, 0, 0));
            scene.add(grid);



            loader = new GCodeParser();

            var gcodeObject = loader.getObject();
            gcodeObject.position.set(- 0, - 0, 0);
            scene.add(gcodeObject);

            //add a light. might not be needed.
            light = new THREE.PointLight(0xffffff);
            light.position.set(160,160,10);
            scene.add(light);

            light = new THREE.PointLight(0xffffff);
            light.position.copy(camera.position);
            scene.add(light);

            //light = new THREE.AmbientLight( 0x808080 ); // soft white light
            //scene.add( light );

            var objloader = new THREE.OBJLoader();

                var nozzleMaterial = new THREE.MeshStandardMaterial( {
                    metalness: 1,   // between 0 and 1
                    roughness: 0.5, // between 0 and 1
                    //envMap: envMap,
                    color: new THREE.Color(0xba971b),
                } );


                objloader.load( '/plugin/prettygcode/static/js/models/ExtruderNozzle.obj', function ( obj ) {
                obj.quaternion.setFromEuler(new THREE.Euler( Math.PI / 2, 0, 0));
                obj.scale.setScalar(0.1)
                obj.position.set(0, 0, 10);
                obj.name="nozzle";
                obj.children.forEach(function(e,i){
                    if ( e instanceof THREE.Mesh ) {
                        e.material = nozzleMaterial;
                    }
                })
                nozzleModel=obj;
                scene.add( obj );
                } );




            //$('.gwin').append($('<p><label for="amount">Volume:</label><input type="text" id="amount" readonly style="border:0; color:#f6931f; font-weight:bold;"></p>'));
            if (true) {
                $('.gwin').append($('<div id="myslider-vertical" style=""></div>'));

                //note this is an octoprint version of a bootstrap slider. not a jquery ui slider. 
                $("#myslider-vertical").slider({
                    id: "myslider",
                    orientation: "vertical",
                    reversed: true,
                    range: "min",
                    min: 0,
                    max: 100,
                    value: 100,
                }).on("slide", function (event, ui) {
                    layerDisplay.end = event.value;
                });;
                $("#myslider").attr("style", "height:90%;position:absolute;top:5%;right:20px")
            }


            animate();

            var file_url = url;//'http://192.168.1.5/downloads/files/local/CCR10_Raised_Deck_Cabin.gcode';
            var myRequest = new Request(file_url);
            fetch(myRequest)
                .then(function (response) {
                    var contentLength = response.headers.get('Content-Length');
                    if (!response.body || (!TextDecoder)) {
                        response.text().then(function (text) {
                            loader.parse(text);
                        });;
                    } else {
                        var myReader = response.body.getReader();
                        var decoder = new TextDecoder();
                        var buffer = '';
                        var received = 0;
                        myReader.read().then(function processResult(result) {
                            if (result.done) {
                                return;
                            }
                            received += result.value.length;
                            //                buffer += decoder.decode(result.value, {stream: true});
                            /* process the buffer string */
                            loader.parse(decoder.decode(result.value, { stream: true }));

                            // read the next piece of the stream and process the result
                            return myReader.read().then(processResult);
                        })
                    }
                })


        }

        var curJobName = "";
        function updateStatus() {
            $.ajax({
                url: '/api/job',
                type: 'GET',
                dataType: 'json',
                success: function (d) {
                    if (curJobName != d.job.file.path) {
                        curJobName = d.job.file.path;
                        loadGcode('/downloads/files/local/' + curJobName);
                    }

                    //var div = $("#status");
                    //div.empty();
                    //div.append("<span>" + d.state + ":</span>");
                    //div.append("<span>" + d.job.file.display + "</span><br>");

                    //div.append("<span style='width:200px'>Done:" + Math.round(d.progress.completion) + "%</span>");


                    //div.append("<br><span>Left:" + secondsTimeSpanToHMS(d.progress.printTimeLeft) + "</span>");

                    //var currentdate = new Date();

                    //currentdate.setSeconds(currentdate.getSeconds() + d.progress.printTimeLeft);
                    //var datetime = currentdate.getHours() + ":"
                    //    + currentdate.getMinutes() + ":"
                    //    + currentdate.getSeconds();

                    //div.append("<br><span>ETA:" + datetime + "</span>");


                },
                error: function () { /*alert('boo!');*/ },
                beforeSend: function (xhr) { xhr.setRequestHeader('X-Api-Key', '74FB5A87481A4D048F0F723D7D9B7CC3'); }
            });
            //    });
        }




        //////////old drawing experiments.

                            //add tube geom.
                    //console.log(currentLayer.paths)
/*                    for (i = 0; i < currentLayer.paths.length; i++) {
                        var curve = new THREE.CatmullRomCurve3(currentLayer.paths[i]); 
                        var extrudedGeometry = new THREE.TubeBufferGeometry(curve, 1, 0.2, 2, false);

                        var extrudedMesh = new THREE.Mesh(extrudedGeometry, new THREE.MeshPhongMaterial({ color: 0xff0000 }));
                        object.add(extrudedMesh);
                        //scene.add(extrudedMesh);
                    }
*/


            //geo = new THREE.LineGeometry();
            //geo.setPositions([0, 0, 0, 100, 100, 100]);
            //var line = new THREE.Line2(geo, xmatLine);
            //scene.add(line);


            //var circle = new THREE.Shape();
            //var radius = 0.2;
            //var segments = 16;
            //var theta, x, y;
            //for (var i = 0; i < segments; i++) {
            //    theta = ((i + 1) / segments) * Math.PI * 2.0;
            //    x = radius * Math.cos(theta);
            //    y = radius * Math.sin(theta);
            //    if (i == 0) {
            //        circle.moveTo(x, y);
            //    } else {
            //        circle.lineTo(x, y);
            //    }
            //}

//            var closedSpline = new THREE.CatmullRomCurve3([
//                new THREE.Vector3(- 60, - 100, 60),
//                new THREE.Vector3(- 60, 20, 60),
//                new THREE.Vector3(- 60, 120, 60),
//                new THREE.Vector3(60, 20, - 60),
//                new THREE.Vector3(60, - 100, - 60)
//            ]);
//            closedSpline.curveType = 'catmullrom';
//            closedSpline.closed = true;
//            var extrudeSettings = {
//                steps: 1,
////                amount: 50,
//                bevelEnabled: false,
//                extrudePath: closedSpline
//            };

//            //var extrudedGeometry = new THREE.ExtrudeGeometry(circle, extrudeSettings);

//            var extrudedGeometry = new THREE.TubeBufferGeometry(closedSpline, 20, 2, 8, false);

//            // Geometry doesn't do much on its own, we need to create a Mesh from it
//            var extrudedMesh = new THREE.Mesh(extrudedGeometry, new THREE.MeshPhongMaterial({ color: 0xff0000 }));
//            scene.add(extrudedMesh);




        //var gwin_width = 1280;
        //var gwin_height = 720;
        //console.log("Start of three.js setup")
        //$("body").append($("<div id='demo' style='width:500px;height:500px'></div>"))
        //var createFatLineGeometry = function (opt) {

        //    opt = opt || {};
        //    opt.forPoint = opt.forPoint || function (i, per) {
        //        return {
        //            x: i * 5,
        //            y: 0,
        //            z: 0
        //        }
        //    };
        //    opt.ptCount = opt.ptCount === undefined ? 20 : opt.ptCount;
        //    opt.colorSolid = opt.colorSolid === undefined ? false : opt.colorSolid;
        //    opt.color = opt.color === undefined ? new THREE.Color(0xffffff) : opt.color;

        //    // Position and Color Data
        //    var positions = [],
        //        colors = [],
        //        i = 0,
        //        point,
        //        geo;

        //    // for each point
        //    while (i < opt.ptCount) {

        //        // push point
        //        point = opt.forPoint(i, i / opt.ptCount);
        //        positions.push(point.x, point.y, point.z);

        //        // push color
        //        if (!opt.colorSolid) {
        //            opt.color.setHSL(i / opt.ptCount, 1.0, 0.5);
        //        }
        //        colors.push(opt.color.r, opt.color.g, opt.color.b);

        //        i += 1;
        //    }

        //    // return geo
        //    geo = new THREE.LineGeometry();
        //    geo.setPositions(positions);
        //    geo.setColors(colors);
        //    return geo;

        //};

        //var createFatLine = function (opt) {

        //    opt = opt || {};
        //    opt.width = opt.width || 5;

        //    // LINE MATERIAL
        //    var matLine = new THREE.LineMaterial({
        //        linewidth: opt.width, // in pixels
        //        vertexColors: THREE.VertexColors
        //    });
        //    matLine.resolution.set(gwin_width, gwin_height);

        //    var line = new THREE.Line2(opt.geo, matLine);

        //    return line;

        //};

        //(function () {

        //    // RENDER
        //    var renderer = new THREE.WebGLRenderer({
        //        antialias: true
        //    });
        //    renderer.setPixelRatio(window.devicePixelRatio);
        //    renderer.setClearColor(0x000000, 0.0);
        //    renderer.setSize(gwin_width, gwin_height);
        //    document.getElementById('demo').appendChild(renderer.domElement);

        //    // SCENE
        //    var scene = new THREE.Scene();

        //    // CAMERA
        //    var camera = new THREE.PerspectiveCamera(40, gwin_width / gwin_height, 1, 1000);
        //    camera.position.set(-40, 0, 60);

        //    // CONTROLS
        //    var controls = new THREE.OrbitControls(camera, renderer.domElement);

        //    // CREATE FAT LINE
        //    var line = createFatLine({
        //        width: 8,
        //        geo: createFatLineGeometry({
        //            ptCount: 80,
        //            colorSolid: true,
        //            color: new THREE.Color(0x00ff00),
        //            forPoint: function (i, per) {
        //                return {
        //                    x: i * 1.5,
        //                    y: Math.cos(Math.PI * 4 * (per)) * 10,
        //                    z: Math.sin(Math.PI * 4 * (per)) * 10
        //                }
        //            }
        //        })
        //    });

        //    scene.add(line);

        //    // CREATE ANOTHER FAT LINE
        //    line = createFatLine({
        //        width: 10,
        //        geo: createFatLineGeometry()
        //    });
        //    scene.add(line);

        //    // LOOP
        //    var loop = function () {

        //        requestAnimationFrame(loop);

        //        // main scene
        //        renderer.setClearColor(0x000000, 0);
        //        renderer.setViewport(0, 0, gwin_width, gwin_height);

        //        // renderer will set this eventually
        //        renderer.render(scene, camera);
        //        renderer.setClearColor(0x222222, 1);
        //        renderer.clearDepth();

        //    };

        //    loop();

        //}
        //    ());

        console.log("End of three.js setup")

        //// this will hold the URL currently displayed by the iframe
        //self.currentUrl = ko.observable();

        //// this will hold the URL entered in the text field
        //self.newUrl = ko.observable();

        //// this will be called when the user clicks the "Go" button and set the iframe's URL to
        //// the entered URL
        //self.goToUrl = function () {
        //    self.currentUrl(self.newUrl());
        //};

        //// This will get called before the HelloWorldViewModel gets bound to the DOM, but after its
        //// dependencies have already been initialized. It is especially guaranteed that this method
        //// gets called _after_ the settings have been retrieved from the OctoPrint backend and thus
        //// the SettingsViewModel been properly populated.
        //self.onBeforeBinding = function () {
        //    self.newUrl(self.settings.settings.plugins.helloworld.url());
        //    self.goToUrl();
        //}
    }

    // This is how our plugin registers itself with the application, by adding some configuration
    // information to the global variable OCTOPRINT_VIEWMODELS
    OCTOPRINT_VIEWMODELS.push([
        // This is the constructor to call for instantiating the plugin
        PrettyGCodeViewModel,

        // This is a list of dependencies to inject into the plugin, the order which you request
        // here is the order in which the dependencies will be injected into your view model upon
        // instantiation via the parameters argument
        ["settingsViewModel"],

        // Finally, this is the list of selectors for all elements we want this view model to be bound to.
        ["#injector_link"]
    ]);


});