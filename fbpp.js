/* FB Wiki's Facebook Editor Helper
 *
 * This modifies the fb places editor to add new capabilities which will
 * hopefully boost the productivity of people using the editor
 *
 * Description of patterns in the fb places editor DOM:
 *
 * Containing Element
 * ------------------
 * #workarea_box              the container for the main editor box on the left side of the screen
 * ._5w0h                     the div that contains the main editor box
 * .fbAggregatedMapContainer  the div that contains the map
 * ._5w0d                     the parent div of .fbAggregatedMapContainer - this has sizing and positioning
 * .fbMapsButtonStack         map zoom in/out buttons
 * #u_0_6                     the div that holds the map
 * ._4ph-                     the main div that holds both the editor and map
 * ._54ni                     holds the "edit" and "report" links.
 * input[name=page_id]        the graph node id
 * input[name=seed]           the city id (although it's called a seed in one place, a cityId elsewhere)
 * .fwn.fcw                   the address and city in text
 *
 * See https://github.com/fbwiki/editor-helper-chrome-extension
 */

var fbpp = function(){
  var initialized, editBox, container, map, mapButtons, fbppContentRect, pageId,
  cityId, pageName, pageAddress, previousPageName, latitude, longitude, address,
  language; // define private variables

  var uiStrings = {
    'en-US': {
      map: 'Map',
      bing: 'Bing',
      similar: 'Similar Nearby',
      address: 'Address',
      report: 'Report',
      reverses: 'The map coordinates reverse geocode to the following address:',
      gpsLimits: 'Due to GPS limitations, please do not depend on the exact street address!',
      noNearby: 'No similar nearby entries!',
    },
    fr: {
      map: 'Carte',
      bing: 'Bing',
      similar: 'Similaires',
      address: 'Adresse',
      report: 'Informer',
      reverses: "Les coordonées GPS correspondent à l'adresse suivante",
      gpsLimits: "En raison de limitations de GPS, svp ne dépendez pas de l'adresse exacte!",
      noNearby: "Pas d'endroits similaires proches",
    }
  };

  return {

    init: function(){
      if ( typeof initialized == 'undefined'){
        initialized = true;
        language = pickLanguage();
        editBox = $("._5w0h");
        container= $("._4ph-");
        pageId = null;
        fbpp.newPlace();
        map =  $(".fbAggregatedMapContainer");
        mapButtons = $(".fbMapsButtonStack");
        fbpp.modifyDOM();
        fbpp.attachHandlers();
        fbpp.resize();
        console.log("fbpp document ready!");
      }
    },

    attachHandlers: function(){
      $("fbpp_reverseGeocode").click(function(){ fbpp.reverseGeocode(); });
      $("#fbpp_showBing").click(function(){ fbpp.search(); });
      $("#fbpp_showMap").click(function(){ fbpp.showMap(); });
      $("#fbpp_showSimilarNearby").click(function(){ fbpp.showSimilarNearby(); });
      $("#places_editor_save").click(function(){ fbpp.next(); });
      $("#fbpp_geocode").click(function(){ fbpp.geocode(); });
      $("#fbpp_reportButton").click(function(){ fbpp.report(); });
    },

    geocode: function(){ // display the reverse geocoded address info
      fbpp.hideParts();
      $('#fbpp_geocode').css('border-bottom','2px solid white');
      var html = "<p style='margin-top:20px'>" + uiStrings[language].reverses + "</p>";
      html += "<div style='margin-left:40px'>";
      html += "<h2>"+address.addressLine+"</h2>";
      html += "<h2>"+address.locality+"</h2>";
      html += "<h2>"+address.adminDistrict+"</h2>";
      html += "<h2>"+address.postalCode+"</h2>";
      html += "<h2>"+address.countryRegion+"</h2>";
      html += "</div>";
      html += "<p style='margin-top:20px'>" + uiStrings[language].gpsLimits + "</p>";
      html += "<p><a href='https://www.google.com/maps/@"+latitude+","+longitude+",16z' target='new'>Explore in Google Maps</a></p>";
      $('#fbppGeocode').html(html);
      $('#fbppGeocode').show();
    },

    get: function(){
      return { pageName: pageName, pageId: pageId, cityId: cityId, latitude: latitude, longitude: longitude, rect: fbppContentRect, address: address };
    },

    hideParts: function(){
      map.hide();
      mapButtons.hide();
      $('.fbpp').css('border-bottom','none');
      $('.fbppDiv').hide();
   },

    modifyDOM: function(){
      var fbppMenuBar = $("#fbpp");
      if (fbppMenuBar[0]) return;

      map.wrap("<div id='fbppContent'></div>"); // the content area for our new UI widget
      $("#fbppContent").wrap("<div id='fbppBox'></div>");

      $("#fbppContent").append("<iframe id='fbpp_iFrame' class='fbppDiv' frameborder='0'></iframe>");
      $('#fbpp_iFrame').hide();

      $('#fbppContent').append("<div id='fbppSimilar' class='fbppDiv'></div>");
      $('#fbppSimilar').hide();

      $('#fbppContent').append("<div id='fbppGeocode' class='fbppDiv' style='margin: 10px'></div>");
      $('#fbppGeocode').hide();

      var fbppDivStyle = "'background-color: rgb(55, 62, 77); color:#fff; width:100%; height:40px;'";
      var fbppButtonStyle ="'font-size: 14px; background-color: rgb(55,62,77); color: #fff; border:0; padding-top: 12px; margin-left: 20px; outline: none;'";
      var fbppHTML = "<div id='fbpp' style="+fbppDivStyle+"></div>";

      $("#fbppBox").prepend(fbppHTML); // the overall box

      $("#fbpp").append("<button id='fbpp_showMap' class='fbpp' style=" + 
        fbppButtonStyle + ">" + uiStrings[language].map + "</button>");

      $("#fbpp").append("<button id='fbpp_showBing' class='fbpp' style=" +
        fbppButtonStyle + ">" + uiStrings[language].bing + "</button>");

      $("#fbpp").append("<button id='fbpp_showSimilarNearby' class='fbpp' style=" +
        fbppButtonStyle + ">" + uiStrings[language].similar + "</button>");

      $("#fbpp").append("<button id='fbpp_geocode' class='fbpp' style=" +
        fbppButtonStyle + ">" + uiStrings[language].address + "</button>");

      $("#fbpp").append("<button id='fbpp_reportButton' style=" +
        fbppButtonStyle + ">" + uiStrings[language].report + "</button>");

      $("#fbpp").append("<a id='fbpp_report' class='_54nc' href='#' rel='dialog' role='menuitem'></a>");

    },

    newPlace: function(){
      var newPageId = $("input[name=page_id]")[0].value;
      if ( newPageId != pageId ){
        pageId = newPageId;
        cityId = $("input[name=seed]").attr('value');

        var pageObj = $.get("https://graph.facebook.com/"+pageId,function(data){ // this call works *without* an access token!
          latitude = data.location.latitude;
          longitude = data.location.longitude;
          pageName = data.name;

          if ( $('#checkinCounter').length === 0 ){
            $("._h5k").append('<div id="checkinCounter"' +
              ' style="font-weight:normal; color:white; top:11px; right:12px; position:absolute"></div>');
          }

          $('#checkinCounter').html('<i style="width: 16px; height: 17px; background-position: -17px -462px; display: inline-block; left: -19px; position: absolute; background-image: url(https://fbstatic-a.akamaihd.net/rsrc.php/v2/yU/r/rYmSLuPcGQQ.png)"></i>'+data.checkins);
          console.log("New place, name: "+pageName+" id: "+pageId+" cityId: "+cityId+" lat: "+latitude+" long: "+longitude);
          reverseGeocode(latitude,longitude);
        });
      }
    },

    next: function(){
      fbpp.showMap();
    },

    report: function(){
      var pageId = $("input[name=page_id]").attr("value");
      var cityId = $("input[name=seed]").attr("value");

      $("#fbpp_report").attr('ajaxify',"/ajax/report.php?content_type=64&cid="+pageId+"&city_id="+cityId);
      $("#fbpp_report")[0].click();
    },

    resize: function(){
      if ( editBox && editBox.position ) {
        topOfEditor = editBox.position().top;
        rightOfEditor = editBox[0].getBoundingClientRect().right;
        rightOfContainer = container[0].getBoundingClientRect().right;
        fbppBox=$("#fbppBox");

        fbppBox.css("top",topOfEditor);
        fbppBox.css("width",rightOfContainer-rightOfEditor-22);
        fbppBox.css("left",rightOfEditor+10);
        fbppBox.css("height",editBox[0].getBoundingClientRect().height);
        fbppBox.css("position","absolute");

        map.css("height",editBox[0].getBoundingClientRect().height-40);
        fbppContentRect = $('#fbppContent')[0].getBoundingClientRect();
        mapButtons.css("top","100px");
        mapButtons.css("left",fbppContentRect.left-30);
        mapButtons.css("right","inherit");


        $("#fbpp_iFrame").css("height",fbppContentRect.height);
        $("#fbpp_iFrame").css("width",fbppContentRect.width);
      }
    },

    search: function(){ // show the bing search including the city
      fbpp.hideParts();
      $('#fbpp_iFrame').show();
      $('#fbpp_showBing').css('border-bottom','2px solid white');
      var searchString;

      var addressParts = $(".fwn.fcw")[0];
      if ( addressParts ){
        addressParts = addressParts.textContent.split("·");
        searchString = pageName + ' ' + addressParts[addressParts.length-1].trim();
      } else {
        searchString = pageName + ' ' + address.locality;
      }
      $("#fbpp_iFrame").attr('src',"https://www.bing.com/search?q="+searchString);
    },

    setAddress: function(doc){ // callback for reverse geocoding to set address
      address = doc;
    },

    showMap: function(){
      fbpp.hideParts();
      map.show();
      mapButtons.show();
      $('#fbpp_showMap').css('border-bottom','2px solid white');
    },

    showSimilarNearby: function(){
      fbpp.hideParts();
      $('#fbpp_showSimilarNearby').css('border-bottom','2px solid white');
      showSimilarNearby(fbpp.get());
    },
  };
}();

$(document).ready(function(){ fbpp.init(); }); // load the extension objects once the page has finished loading
$(window).resize(function(){ fbpp.resize(); }); // react to window resize events

// setup mutation observer to watch for changes in the module_editor
// to trigger the newPlace logic

var observer = new MutationObserver(function(mutations){
  fbpp.newPlace();
});

observer.observe(
  document.getElementById('module_editor'),
  { childList: true, attributes: false }
);

observer.observe(
  document.getElementById('places_editor_option_selector'),
  { childList: true, attributes: false }
);

function showSimilarNearby(pageAttributes){
   /* Tried to use the graph API but it doesn't yet support "graph search" with
   * fuzzy name matching. Basically couldn't be done.
   *
   * By inspecting facebook's ajax calls, discovered the ajax typeahead handler
   * that is used to report dupes: it takes a request like:
   *
   *https://www.facebook.com/ajax/places/typeahead?value=nati&include_address=2&include_subtext=true&exact_match=false&use_unicorn=true&allow_places=true&allow_cities=true&render_map=true&limit=15&latitude=39.207887979133&longitude=-120.09159616732&proximity_boost=true&city_id=2418378&city_bias=false&allow_url=true&map_height=150&map_width=348&ref=PlaceReportDialog%3A%3ArenderDuplicatePlaceTypeahead&sid=60232222786&city_set=false&existing_ids=111507778889067&request_id=8cf4cd3e-eb65-4a13-91c5-674d1382b7d3&__user=569890504&__a=1&__dyn=7nmajEyl35zoSt2u6aOGeFz8C9ACxO4oKAdBGeqrWo8popyUW5ogxd6K59poW8xOdy8-&__req=7p&__rev=1573593
   *
   * But it doesn't seem to require all parameters so a simpler version is:
   *
   * https://www.facebook.com/ajax/places/typeahead?value=native%20landing&include_address=2&include_subtext=true&exact_match=false&use_unicorn=true&allow_places=true&allow_cities=true&render_map=true&limit=15&latitude=39.207887979133&longitude=-120.09159616732&proximity_boost=true&map_height=150&map_width=348&ref=PlaceReportDialog%3A%3ArenderDuplicatePlaceTypeahead&sid=60232222786&existing_ids=111507778889067&__a=1
   *
   * Might want to bring back cityId (where defined?) and try cityBias=true
   *
   * I really wonder what the "use_unicorn" parameter is for...
   *
   * There doesn't appear to be anyway of restricting the radius of the returned
   * results, facebook is looking all over the world for dupes. It would be good
   * to remove the ones >~100 miles away.  */

  var pageId = pageAttributes.pageId;
  var cityId = pageAttributes.cityId;
  var latitude = pageAttributes.latitude;
  var longitude = pageAttributes.longitude;
  var pageName = encodeURIComponent(pageAttributes.pageName.split(" ").slice(0,3).join(" ")); //first 3 words of place name

  var url = "https://www.facebook.com/ajax/places/typeahead?value=" + 
    pageName+"&latitude="+latitude+"&longitude="+longitude+"&existing_ids="+pageId+"&city_id="+cityId+'&city_bias=false' +
    "&include_address=2&include_subtext=true&exact_match=false&use_unicorn=true&allow_places=true&allow_cities=true&render_map=true&limit=30&proximity_boost=true&map_height=150&map_width=348&ref=PlaceReportDialog%3A%3ArenderDuplicatePlaceTypeahead&__a=1";


  $.ajax({url: url, headers: {method: "GET", scheme: "https", accept: "*/*",
    version: "HTTP/1.1", 'accept-language': "en-US,en;q=0.8,fr;q=0.6",
    cache: true, processData: false},
    complete: function(xhr,status){
      var data = xhr.responseText;
      var json = JSON.parse(data.substr(data.indexOf("{")));

      /* the matches are in json.payload.entries, an array of objects of the form:
       *
       *  address: null
          city_id: 2422390
          city_name: "Tahoe City, CA"
          city_page_id: 107885529244686
          latitude: 39.1997079033
          longitude: -120.237929977
          map: Object
          photo: "https://fbcdn-profile-a.akamaihd.net/static-ak/rsrc.php/v2/y5/r/j258ei8TIHu.png"
          place_type: "place"
          subtext: "Tahoe City, California · 14 were here"
          text: "Pain Mcshlonky Gala"
          uid: 177557992363854

       * use these to construct the HTML for the similar places.
       * Remove anything over 100 miles away. Also remove the current place.
       * Optionally order by distance and/or by number of people who've been there.
       *
       * If no similar places are found try reducing the search to the first 2 words
       * or even just the first word in the place name
       *
       * FB lays out the typeahead results in the following format:

          <div class="PlacesTypeaheadViewList">
            <ul class="noTrucating compact" id="typeahead_list_u_2v_a" role="listbox">
              <li class="" title="Wompatuck State Park" aria-label="Wompatuck State Park" role="option">
                <img alt="" src="https://fbcdn-profile-a.akamaihd.net/hprofile-ak-xap1/v/t1.0-1/c8.0.50.50/p50x50/10175994_722621287782410_8414702203789626750_n.jpg?oh=a10cfb04d83e48d89c63a81ba29548a9&amp;oe=555D949D&amp;__gda__=1428526241_344430b5ebc1a56de6d5009ba4b331e2">
                <span class="text">Wompatuck State Park</span>
                <span class="subtext">204 Union St · Hingham, Massachusetts · 3,538 were here</span>
                </li>

       * which we can mimick for consistency
       */

      var entries = json.payload.entries;
      var html = null;
      if ( entries ){
        var i = 0;

        while ( i < entries.length ){ // eliminate the current node from the results
          if ( entries[i].uid == pageId ) entries.splice(i,1);
          else i++;
        }

        pageAttributes = fbpp.get();

        $.each(entries,function(i,entry){ // get the distance to each other node
          var radiusKM = GreatCircle.distance(latitude,longitude,entry.latitude,entry.longitude,'KM');
          entry.radiusKM = radiusKM;
          entry.Levenshtein = LevenshteinDistance(pageAttributes.pageName,entry.text);
          entry.checkins = entry.subtext.lastIndexOf("·") > -1 ? Number(entry.subtext.substring(entry.subtext.lastIndexOf("·")).split(" ")[1].replace(',','').replace('.','')) : 0;
          if ( entry.checkins === 0 ) entry.checkins = 1; // avoid div by zero
          entry.distance = ( Math.pow( entry.radiusKM + 0.01, 1.5) * ( entry.Levenshtein + 0.1) ) / Math.log10( 10 * entry.checkins ); // compound distance
          console.log(entry.text+' '+entry.subtext+' Radius: '+entry.radiusKM+' Levenshtein: '+entry.Levenshtein+' Checkins: '+entry.checkins+' Distance: '+entry.distance);
        });

        i = 0;
        while (i < entries.length ){
          if ( entries[i].radiusKM > 100 ) entries.splice(i,1); // eliminate any entries over 100 km away
          else i++;
        }

        entries.sort(compareDistance); // sort by distance
        entries = entries.slice(0,15); // limit to the first 15 results

        var height = pageAttributes.rect.height;
        var width = pageAttributes.rect.width;

        html = '<div class="uiTypeaheadView PlacesTypeaheadView PlacesTypeaheadViewPopulated" style="position:relative; width:'+width+'px; max-height:'+height+'px;" id="u_9_d"><div class="uiScrollableArea nofade uiScrollableAreaWithShadow contentAfter" style="max-height:'+height+'px" id="u_9_e"><div class="uiScrollableAreaWrap scrollable" style="max-height:'+height+'px;" aria-label="Scrollable region" role="group" tabindex="-1"><div class="uiScrollableAreaBody" style="width:'+width+'px;"><div class="uiScrollableAreaContent"><div class="PlacesTypeaheadViewList"><ul class="noTrucating compact" id="typeahead_list_u_9_a" role="listbox">';
        $.each(entries,function(index,entry){
          html += '<li class="" title="'+entry.text+'" aria-label="'+entry.text+'" role="option">';
          html += '<img src='+entry.photo+'>';
          html += '<span class="text">'+entry.text+'</span>';
          html += '<span>'+entry.subtext+'</span></li>';
        });

        html += '</ul></div></div></div></div></div>';
      }
      if ( entries.length === 0) html = '<h1 style="padding:30px">' + uiStrings[language][noNearby] + '</h1>';
      $('#fbppSimilar').html(html);
      $('#fbppSimilar').show();
    },
    error: function(jqXHR,textStatus,err) { // always get a parseError but don't care
    }
  });
}

function reverseGeocode(latitude,longitude){
  var request = { type: 'geocode', latitude: latitude, longitude: longitude };
  chrome.runtime.sendMessage(request, function(response) {
    if ( chrome.runtime.lastError ) console.log( chrome.runtime.lastError );
    fbpp.setAddress(response.address);
  }); 
}

// pattern for finding nearby places:
// https://www.facebook.com/search/$PLACE_ID/places-near/str/$NAME/places-named/intersect

var GreatCircle = {
  /* great circle distance calculator from https://github.com/mwgg/GreatCircle/blob/master/GreatCircle.js
   * usage: GreatCircle.distance(lat1,long1,lat2,long2,{unit}) where unit is one of KM, MI, NM, YD or FT */

  validateRadius: function(unit) {
    var r = { KM: 6371.009, MI: 3958.761, NM: 3440.070, YD: 6967420, FT: 20902260 };
    if ( unit in r ) return r[unit];
    else return unit;
  },

  distance: function(lat1, lon1, lat2, lon2, unit) {
    if ( unit === undefined ) unit = 'KM';
    var r = this.validateRadius(unit); 
    lat1 *= Math.PI / 180;
    lon1 *= Math.PI / 180;
    lat2 *= Math.PI / 180;
    lon2 *= Math.PI / 180;
    var lonDelta = lon2 - lon1;
    var a = Math.pow(Math.cos(lat2) * Math.sin(lonDelta) , 2) + Math.pow(Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lonDelta) , 2);
    var b = Math.sin(lat1) * Math.sin(lat2) + Math.cos(lat1) * Math.cos(lat2) * Math.cos(lonDelta);
    var angle = Math.atan2(Math.sqrt(a) , b);
    return angle * r;
  }
};

function compareDistance(a,b){
  if ( a.distance < b.distance ) return -1;
  if ( a.distance > b.distance ) return +1;
  return 0;
}

function getMapFromBgScript(){ // this turned out not to work because bg script couldn't completely load the map

  mapButtons.css("display","block");
  var pageId = $("input[name=page_id]")[0].value;
  var mapNode = $(".MicrosoftMap.MapTypeId_auto.medium");
  var h = mapNode.height();
  var w = mapNode.width();

  var pageObj = $.get("https://graph.facebook.com/"+pageId,function(data){ // this call works *without* an access token!
    var request = {
      type: 'map',
      latitude: data.location.latitude,
      longitude: data.location.longitude,
      height: h,
      width: w
    };
    chrome.runtime.sendMessage(request, function(response) {
      if ( chrome.runtime.lastError ) console.log(chrome.runtime.lastError);
      else mapNode.html(response.mapHTML);
    });
  });
}


/*
Levenshtein.js - https://gist.github.com/andrei-m/982927
Copyright (c) 2011 Andrei Mackenzie

Compute the Levenshtein distance between two strings

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
 
function LevenshteinDistance(a, b){
  if(a.length === 0) return b.length; 
  if(b.length === 0) return a.length; 
 
  var matrix = [];
 
  // increment along the first column of each row
  var i;
  for(i = 0; i <= b.length; i++){
    matrix[i] = [i];
  }

  // increment each column in the first row
  var j;
  for(j = 0; j <= a.length; j++){
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for(i = 1; i <= b.length; i++){
    for(j = 1; j <= a.length; j++){
      if(b.charAt(i-1) == a.charAt(j-1)){
        matrix[i][j] = matrix[i-1][j-1];
      } else {
        matrix[i][j] = Math.min(matrix[i-1][j-1] + 1, // substitution
                                Math.min(matrix[i][j-1] + 1, // insertion
                                         matrix[i-1][j] + 1)); // deletion
      }
    }
  }
  return matrix[b.length][a.length];
}

function pickLanguage(){
  var languages = navigator.languages;
  var availableLanguages = ['en-US','fr'];
  var bestLanguage = null;
  languages.forEach(function(l){
    var i = availableLanguages.indexOf(l); // full match
    var j = availableLanguages.indexOf(l.substr(0,2)); // partial match based on language family
    if ( !bestLanguage &&  ( i > -1 || j >-1 ) ){
      bestLanguage = i > -1 ? availableLanguages[i] : availableLanguages[j];
    }
  });
  if ( !bestLanguage ) bestLanguage = 'en-US';
  return bestLanguage;
}
