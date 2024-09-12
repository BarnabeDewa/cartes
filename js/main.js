let map;
let drawingManager;
let drawnShapes = [];
let selectedShape = null;
let deleteButton;

function startNavigation() {
    document.getElementById('welcome-screen').style.display = 'none';
    document.getElementById('map-container').style.display = 'block';
    initMap();
}

function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: -4.331, lng: 15.306 },
        zoom: 22,
        mapTypeId: "hybrid",
        gestureHandling: 'greedy',
        maxZoom: 22,  // Définit le zoom maximal à 22
        minZoom: 1
    });

    // Configuration du DrawingManager
    drawingManager = new google.maps.drawing.DrawingManager({
        drawingMode: google.maps.drawing.OverlayType.POLYLINE,
        drawingControl: true,
        drawingControlOptions: {
            position: google.maps.ControlPosition.TOP_CENTER,
            drawingModes: ["polyline", "polygon"]
        },
        polylineOptions: {
            strokeWeight: 2,
            strokeColor: "#FF0000",
            clickable: true,
            editable: true
        },
        polygonOptions: {
            strokeWeight: 2,
            strokeColor: "#FF0000",
            fillColor: "#FF0000",
            fillOpacity: 0.1,
            clickable: true,
            editable: true
        }
    });

    drawingManager.setMap(map);

    google.maps.event.addListener(drawingManager, "overlaycomplete", function(event) {
        // Add the new shape to the array
        drawnShapes.push(event.overlay);
        google.maps.event.addListener(event.overlay, 'click', function() {
            setSelection(event.overlay);
        });
        setSelection(event.overlay);
    });

    google.maps.event.addListener(map, 'click', function() {
        clearSelection();
    });
}

function exportToKML() {
    if (drawnShapes.length === 0) {
        alert("Veuillez tracer un chemin sur la carte d'abord.");
        return;
    }

    let kmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<kml xmlns="http://www.opengis.net/kml/2.2">\n' +
        '<Document>\n' +
        '<name>SeedBot Path</name>\n';

    drawnShapes.forEach(function(shape) {
        kmlContent += '<Placemark>\n' +
            '<LineString>\n' +
            '<coordinates>\n';

        shape.getPath().forEach(function(latlng) {
            kmlContent += latlng.lng() + ',' + latlng.lat() + ',0\n';
        });

        kmlContent += '</coordinates>\n' +
            '</LineString>\n' +
            '</Placemark>\n';
    });

    kmlContent += '</Document>\n' +
        '</kml>';

    const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'seedbot_fichier.kml';
    link.click();
    URL.revokeObjectURL(url);
}

function uploadFile() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    if (!file) {
        alert('Veuillez sélectionner un fichier KML.');
        return;
    }

    const formData = new FormData();
    formData.append('kmlFile', file);

    fetch('/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        console.log('Coordonnées reçues :', data);
        displayPathOnMap(data);
    })
    .catch((error) => {
        console.error('Erreur lors du téléchargement du fichier:', error);
    });
}

function displayPathOnMap(coordinates) {
    if (coordinates.length === 0) {
        alert('Aucune coordonnée à afficher.');
        return;
    }

    const path = coordinates.map(coord => new google.maps.LatLng(coord.lat, coord.lng));
    new google.maps.Polyline({
        path: path,
        geodesic: true,
        strokeColor: '#FF0000',
        strokeOpacity: 1.0,
        strokeWeight: 2,
        map: map
    });
}

function searchLocation() {
    const searchInput = document.getElementById('search-input').value;
    const geocoder = new google.maps.Geocoder();

    geocoder.geocode({ address: searchInput }, function(results, status) {
        if (status === 'OK') {
            if (results[0] && results[0].geometry && results[0].geometry.location) {
                map.setCenter(results[0].geometry.location);
                map.setZoom(20);
                
                new google.maps.Marker({
                    map: map,
                    position: location,
                    title: results[0].formatted_address
                });

            } else {
                alert('Aucune localisation trouvée.');
            }
        } else {
            alert('Lieu non trouvé : ' + status);
        }
    });
}

function zoomIn() {
    const currentZoom = map.getZoom();
    map.setZoom(currentZoom + 1);
}

function zoomOut() {
    const currentZoom = map.getZoom();
    map.setZoom(currentZoom - 1);
}

function measureDistance() {
    if (!selectedShape) {
        alert("Veuillez tracer un chemin ou une forme sur la carte d'abord.");
        return;
    }

    const path = selectedShape.getPath();
    let totalDistance = 0;

    for (let i = 0; i < path.getLength() - 1; i++) {
        const point1 = path.getAt(i);
        const point2 = path.getAt(i + 1);
        totalDistance += google.maps.geometry.spherical.computeDistanceBetween(point1, point2);
    }

    alert('Distance totale : ' + (totalDistance / 1000).toFixed(2) + ' km');
}

function setSelection(shape) {
    clearSelection();
    selectedShape = shape;
    shape.setOptions({
        fillColor: "#FF0000",
        strokeColor: "#FF0000"
    });

    if (!document.getElementById('delete-button')) {
        deleteButton = document.createElement('button');
        deleteButton.id = 'delete-button';
        deleteButton.textContent = 'Supprimer la forme';
        deleteButton.onclick = deleteShape;
        document.getElementById('controls').appendChild(deleteButton);
    }
}

function clearSelection() {
    if (selectedShape) {
        selectedShape.setOptions({
            fillColor: "#FF0000",
            strokeColor: "#FF0000"
        });
        selectedShape = null;

        if (deleteButton) {
            deleteButton.remove();
            deleteButton = null;
        }
    }
}

function deleteShape() {
    if (selectedShape) {
        selectedShape.setMap(null);
        drawnShapes = drawnShapes.filter(shape => shape !== selectedShape);
        selectedShape = null;

        if (deleteButton) {
            deleteButton.remove();
            deleteButton = null;
        }
    }
}

$(document).ready(function(){
    $(".owl-carousel").owlCarousel({
        items: 1, // Affiche une image à la fois
        loop: true,
        autoplay: true,
        autoplayTimeout: 5000, // Durée d'affichage de chaque image
        autoplayHoverPause: true
    });
});












































































(function ($) {
    "use strict";

    // Spinner
    var spinner = function () {
        setTimeout(function () {
            if ($('#spinner').length > 0) {
                $('#spinner').removeClass('show');
            }
        }, 1);
    };
    spinner();
    
    
    // Initiate the wowjs
    new WOW().init();


    // Sticky Navbar
    $(window).scroll(function () {
        if ($(this).scrollTop() > 300) {
            $('.sticky-top').css('top', '0px');
        } else {
            $('.sticky-top').css('top', '-100px');
        }
    });
    
    
    // Dropdown on mouse hover
    const $dropdown = $(".dropdown");
    const $dropdownToggle = $(".dropdown-toggle");
    const $dropdownMenu = $(".dropdown-menu");
    const showClass = "show";
    
    $(window).on("load resize", function() {
        if (this.matchMedia("(min-width: 992px)").matches) {
            $dropdown.hover(
            function() {
                const $this = $(this);
                $this.addClass(showClass);
                $this.find($dropdownToggle).attr("aria-expanded", "true");
                $this.find($dropdownMenu).addClass(showClass);
            },
            function() {
                const $this = $(this);
                $this.removeClass(showClass);
                $this.find($dropdownToggle).attr("aria-expanded", "false");
                $this.find($dropdownMenu).removeClass(showClass);
            }
            );
        } else {
            $dropdown.off("mouseenter mouseleave");
        }
    });
    
    
    // Back to top button
    $(window).scroll(function () {
        if ($(this).scrollTop() > 300) {
            $('.back-to-top').fadeIn('slow');
        } else {
            $('.back-to-top').fadeOut('slow');
        }
    });
    $('.back-to-top').click(function () {
        $('html, body').animate({scrollTop: 0}, 1500, 'easeInOutExpo');
        return false;
    });


    // Header carousel
    $(".header-carousel").owlCarousel({
        autoplay: true,
        smartSpeed: 1500,
        items: 1,
        dots: false,
        loop: true,
        nav : true,
        navText : [
            '<i class="bi bi-chevron-left"></i>',
            '<i class="bi bi-chevron-right"></i>'
        ]
    });


    // Testimonials carousel
    $(".testimonial-carousel").owlCarousel({
        autoplay: true,
        smartSpeed: 1000,
        center: true,
        margin: 24,
        dots: true,
        loop: true,
        nav : false,
        responsive: {
            0:{
                items:1
            },
            768:{
                items:2
            },
            992:{
                items:3
            }
        }
    });
    
})(jQuery);

