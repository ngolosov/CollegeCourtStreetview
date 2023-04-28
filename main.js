require([
    "esri/Map",
    "esri/views/MapView",
    "esri/layers/FeatureLayer",
    "esri/widgets/Legend",
    "esri/rest/support/Query",
    "esri/widgets/ScaleBar",
    "esri/widgets/LayerList",
    "esri/layers/GraphicsLayer",
    "dijit/Dialog",
    "dojo/domReady!"
], (Map, MapView, FeatureLayer, Legend, Query, ScaleBar, LayerList, GraphicsLayer, Dialog) => {


    const listNode = document.getElementById("list_counties");

    const defaultSym = {
        type: "simple-fill", // autocasts as new SimpleFillSymbol()
        outline: {
            // autocasts as new SimpleLineSymbol()
            color: [128, 128, 128, 0.2],
            width: "1px"
        }
    };


    // configuring the streetview renderer to apply simple blue fill 
    const streetviewRenderer = {
        type: "simple",
        symbol: {
            type: "simple-fill",
            style: "solid",
            color: "#0080ff",
            outline: {
                style: "none"
            }
        }
    };

    // style for the buildings
    const bldgRenderer = {
        type: "simple",
        symbol: {
            type: "simple-fill",
            style: "solid",
            color: "#f5d742"
        }
    };

    // style for the panoramic picture locations
    const picturesRenderer = {
        "type": "simple",
        "symbol": {
            "type": "picture-marker",
            "url": "https://static.arcgis.com/images/Symbols/NPS/Photography_1.png",
            "width": "18px",
            "height": "18px"
        }
    }

    // style for the buldging labels
    const bldgLabels = {
        symbol: {
            type: "text",
            color: "#000105",
            haloColor: "#fafafc",
            haloSize: "2px",
            font: {
                size: "12px",
                family: "Noto Sans",
                style: "italic",
                weight: "normal"
            }
        },

        labelPlacement: "above-center",
        labelExpressionInfo: {
            expression: "$feature.Name"
        }
    };



    // configuring the streetview layer 
    const streetviewLayer = new FeatureLayer({
        url: "https://services9.arcgis.com/6EuFgO4fLTqfNOhu/arcgis/rest/services/college_court/FeatureServer/2",
        outFields: ["*"],
        renderer: streetviewRenderer,
        title: "StreetView coverage"
    });



    // configuring the buildings layer 
    const buildingsLayer = new FeatureLayer({
        url: "https://services9.arcgis.com/6EuFgO4fLTqfNOhu/arcgis/rest/services/college_court/FeatureServer/1",
        outFields: ["*"],
        labelingInfo: [bldgLabels],
        renderer: bldgRenderer,



        popupTemplate: {
            // autocasts as new PopupTemplate()
            title: "Building {name} ",
            content: "The building {name} contains {type} appartments. It has {HVAC} cooling. There are {parking} parking slots around the building."
        },

        title: "Buildings"




    });



    // configuring the pictures layer 
    const picturesLayer = new FeatureLayer({
        url: "https://services9.arcgis.com/6EuFgO4fLTqfNOhu/arcgis/rest/services/college_court/FeatureServer/0",
        outFields: ["*"],
        renderer: picturesRenderer,

        popupTemplate: {
            // autocasts as new PopupTemplate()
            title: "Panoramic picture {Name} ",
            content: "The panoramic picture {Name} is ajacent to the building {closest_bl}. </br> <b>Click the preview to open:</b> </br> <a href='https://www.personal.psu.edu/nvg5370/geog863/term_project/view.html?s={Name}'><img src='https://www.personal.psu.edu/nvg5370/geog863/term_project/panos/{Name}.tiles/thumb.jpg'></img></a>"
        },

        title: "Panoramic pictures"
    });



    const map = new Map({
        basemap: "gray-vector",
        layers: [streetviewLayer, buildingsLayer, picturesLayer]
    });

    const view = new MapView({
        container: "viewDiv",
        map: map,
        center: [-77.8843662, 40.8017117],
        zoom: 18
    });


    /* This code handles clicks by the panoramic layer and opens the panorama viewer */

    // Listen for SceneView click events
    view.on("click", function(evt) {
        // Search for symbols on click's position
        view.hitTest(evt.screenPoint)
            .then(function(response) {
                // Retrieve the first symbol
                var graphic = response.results[0].graphic;
                /* Here's a check to open the panorama viewer only if user clicks by the panoramic layer.
                This layer has the "name" attribute, while the other layers do not. This is case sensitive.
                In the future I'll need to figure out how to check the layer name in a more appropriate way */
                if (graphic.attributes['name']) {
                    // Open the new window
                    url = "https://www.personal.psu.edu/nvg5370/geog863/term_project/view.html?s=" + graphic.attributes['name']
                    window.open(url, '_blank').focus();
                }
            });
    });




    // this function is invoked when the user interacts with the controls under "select from buildings" group
    function filterBldgs(event) {

        // reading the input parameters from the HTML form

        bldg_type = document.getElementById("bldg_type").value;
        hvac_type = document.getElementById("hvac_type").value;
        parking = document.getElementById("parking").value;
        filter_streetview = Number(document.getElementById("filter_streetview").checked); // I use Number() to convert the boolean value to 0/1
        streetview_bldg = document.getElementById("streetview_bldg").value;




        // concatenating a definition query to filter the buildings according to the parameters in the form (Building type, Heating/Cooling type, Parking places)

        const whereBldgClause = "parking > " + parking + " and hvac like '" + hvac_type + "' and type like '" + bldg_type + "'";
        buildingsLayer.definitionExpression = whereBldgClause;

        // this one resets filter on the "panoramic" layer if the user resets the checkbox "filter StreetView layer"
        streetviewLayer.definitionExpression = "1=1";



        // this code executes when the "Filter StreetView layer" checkbox is enabled. If enabled, show only streetview pieces around the displayed buildgings.
        if (filter_streetview) {
            var query = buildingsLayer.createQuery();


            function getValues(response) {
                var features = response.features;

                var values = features.map(function(feature) {
                    return feature.attributes.Name;
                });
                return values;
            }

            // getting the currently displayed buildings
            buildingsLayer.queryFeatures(query).then(getValues).then(function(values) {

                    // wrapping the elements of the array in quotes to concatenate definition expression	
                    values = values.map(value => `'${value}'`);

                    // selecting the streetview polygons that associated with the displayed buildings
                    streetviewLayer.definitionExpression = "closest_bl in (" + values + ")"


                }

            )
        }

    }


    // this function invokes when the user change the "Filter StreetView" drop-down.
    function filterPanos(event) {
        pano_bldg = document.getElementById("streetview_bldg").value

        streetviewLayer.definitionExpression = "closest_bl like '" + pano_bldg + "'"


    }

    // assingining responding functions to the controls
    document.getElementById("bldg_type").addEventListener("change", filterBldgs);
    document.getElementById("hvac_type").addEventListener("change", filterBldgs);
    document.getElementById("parking").addEventListener("change", filterBldgs);
    document.getElementById("filter_streetview").addEventListener("change", filterBldgs);
    document.getElementById("streetview_bldg").addEventListener("change", filterPanos);


    view.ui.add("queryDiv", "top-left");

    let layerList = new LayerList({
        view: view,
        container: "queryDiv"
    });
    // Adds widget below other elements in the top left corner of the view
    view.ui.add(layerList, {
        position: "top-left"
    });

    picturesLayer.visible = false;


    // add scale bar	
    const sBar = new ScaleBar({
        view: view,
        style: "line",
        unit: "non-metric"
    });

    view.ui.add(sBar, {
        position: "bottom-left"
    });

    // moving the zoom buttons
    view.ui.move("zoom", "bottom-right");

    // open the Dojo dialog window with the information about the application
    helpDialog = new Dialog({
        title: "GEOG863 Term project help",
        content: "<iframe src='https://www.personal.psu.edu/nvg5370/geog863/term_project/help.html' width='100%' height='600' style='border:1px solid black;'></iframe>",
        style: "width: 600px"
    });
    
	helpDialog.show();

});