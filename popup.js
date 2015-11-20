document.addEventListener("DOMContentLoaded", function(event) {
    var miniFacebookQueueActivated = true;
    var onOffSwitch = document.getElementById('myonoffswitch');
    var enabledDescription = document.getElementById('mnfb-queue-enabled');
    var disabledDescription = document.getElementById('mnfb-queue-disabled');
    var tabId = -1;

    chrome.tabs.query({active: true, currentWindow: true}, 
        function(tabs) {
            // and use that tab to fill in out title and url
            tabId = tabs[0].id;
            // getQueuedVideoImages with the tab id
            getQueuedVideoImages(tabId, displayQueuedVideoImages);
        }
    );

    // Update the switch based on activation status
    getActivationStatus(updateSwitchState);

    // Add listener to the switch
    onOffSwitch.onclick = toggleSwitch;

    function getActivationStatus(callBack) {
        chrome.runtime.sendMessage({"get_activation_status": true}, function(response) {
            var activated = true;
            if (response) {
                activated = response[0];
            }
            callBack(activated);
        });
    }

    function toggleSwitch() {
        miniFacebookQueueActivated = onOffSwitch.checked;
        // Send a message to background.js to save status and update icon
        chrome.runtime.sendMessage({"set_activation_status": miniFacebookQueueActivated});
        updateDescription();
    }

    function updateSwitchState(activated) {
        miniFacebookQueueActivated = activated;
        onOffSwitch.checked = miniFacebookQueueActivated;
        chrome.runtime.sendMessage({"set_activation_status": miniFacebookQueueActivated});
        updateDescription();
    }

    function updateDescription() {
        if (miniFacebookQueueActivated) {
            enabledDescription.style.display = "block";
            disabledDescription.style.display = "none";
        } else {
            enabledDescription.style.display = "none";
            disabledDescription.style.display = "block";
        }
    }

    function getQueuedVideoImages(tabId, callBack) {
        chrome.runtime.sendMessage({"get_queued_video_images": tabId}, function(response) {
            callBack(response);
        });
    }

    function displayQueuedVideoImages(imageUrls) {
        imageUrls.forEach(function (imageUrl) {
            var videoImage = document.createElement("div");
            videoImage.className = "queued-video-image";
            videoImage.style.backgroundImage = "url(" + imageUrl + ")";
            document.getElementById("queued_videos").appendChild(videoImage);
        });
    }
});