chrome.runtime.onInstalled.addListener(function(details) { // when the extension is first installed
  localStorage.fbpp = JSON.stringify(true); // master on-off switch for the extension
});

chrome.tabs.onUpdated.addListener(function(id, info, tab){ // Listen for any changes to the URL of any tab.
  if ( tab.url.toLowerCase().indexOf("facebook.com/editor")>0 ){ // see: http://developer.chrome.com/extensions/tabs.html#event-onUpdated
    ON = true; //var ON = JSON.parse(localStorage.fbpp);

    chrome.pageAction.show(tab.id); // show the page action
    if ( ON)  chrome.pageAction.setIcon({ tabId: tab.id, path: "fbpp-32.png" });
    else chrome.pageAction.setIcon({tabId: tab.id, path: 'fbpp-off-32.png'});

    if ( tab.status == "complete" ){
      if ( ON ){
        console.log("Preparing to setup fb-places-pro! tab.id="+tab.id);
        chrome.tabs.executeScript(tab.id, { file: "jquery.min.js" }, function(){ // load jquery
          chrome.tabs.executeScript(tab.id, { file: "fbpp.js" });
        });
      } else console.log("fb-places-pro is disabled.");
    }
  }
});
