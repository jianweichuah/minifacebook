var MINI_FACEBOOK_QUEUE_ACTIVATED = 'miniFacebookQueueActivated';
var miniFacebookQueueActivated = true;
var tabIdToQueueImage = {};

// Check if Mini Facebook Queue is enabled
chrome.storage.sync.get([MINI_FACEBOOK_QUEUE_ACTIVATED], function(items) {
    if (items[MINI_FACEBOOK_QUEUE_ACTIVATED])
        miniFacebookQueueActivated = items[MINI_FACEBOOK_QUEUE_ACTIVATED];
});

// Add listener for tab change to show page icon when the url is facebook
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab){
    if (tab.url.match(/https:\/\/www.facebook.com\/*/g)) {
        chrome.pageAction.show(tabId);
    }
});

// Receive and handle message from popup
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    // The message is to update icon
    if ("set_activation_status" in message) {

        // Update status
        setActivationStatus(message["set_activation_status"]);
    } else if ("get_activation_status" in message) {

        // If the request is coming from a tab with currently has a queue
        // flush it
        if (sender.tab) {
            var queueTabId = sender.tab.id;
            tabIdToQueueImage[queueTabId] = [];
        }
        // Message is to get activation status
        sendResponse([getActivationStatus()]);
    } else if ("queue_video" in message) {

        var queueTabId = sender.tab.id;
        var queueImageUrl = message["queue_video"];
        if (!(queueTabId in tabIdToQueueImage)) {
            tabIdToQueueImage[queueTabId] = [];
        }
        tabIdToQueueImage[queueTabId].push(queueImageUrl);
    } else if ("dequeue_video" in message) {

        var queueTabId = sender.tab.id;
        tabIdToQueueImage[queueTabId].shift();
    } else if ("get_queued_video_images" in message) {

        sendResponse(tabIdToQueueImage[message["get_queued_video_images"]])
    }
});

function getActivationStatus() {
    return miniFacebookQueueActivated;
}

function setActivationStatus(isActive) {
    miniFacebookQueueActivated = isActive;
    chrome.storage.sync.set({"miniFacebookQueueActivated": miniFacebookQueueActivated});
    // Send message to each tab with youtube to update the status in the content script
    chrome.tabs.query({url: "https://www.facebook.com/*"},function(tabs){
        tabs.forEach(function(tab){
            chrome.tabs.sendMessage(tab.id, {"update_activation_status": miniFacebookQueueActivated});
        });
    });
}