// A list of predefined sizes of the screen
var SMALL_WIDTH = 310;
var SMALL_HEIGHT = 175;
var MEDIUM_WIDTH = 475;
var MEDIUM_HEIGHT = 268;
var LARGE_WIDTH = 640;
var LARGE_HEIGHT = 360;
var EXTRA_LARGE_WIDTH = 854;
var EXTRA_LARGE_HEIGHT = 480;
var MINIFACEBOOK_VIDEO_ID = 'mnfb-video';
var LONG_PRESS = 100;
// A list of constants
var MINI_SCREEN_LAST_TOP = 'miniScreenLastTop';
var MINI_SCREEN_LAST_LEFT = 'miniScreenLastLeft';
var MINI_SCREEN_LAST_HEIGHT = 'miniScreenLastHeight';
var MINI_SCREEN_LAST_WIDTH = 'miniScreenLastWidth';

var checkedVideos = {};
var mnfbBtnId = 1;

// Handle dragging.
var floated = false;

var originalHeight;
var originalWidth;
var miniScreenLastTop;
var miniScreenLastLeft;
var miniScreenLastHeight;
var miniScreenLastWidth;
var dragStartX, dragStartY, dragStartWidth, dragStartHeight, dragRatio;
var maxWidth = 854;
var minWidth = 310;
var resizing = false;
var start;

// Read from the storage to see if the settings exist.
// If yes, populate the variables
chrome.storage.sync.get([MINI_SCREEN_LAST_TOP, MINI_SCREEN_LAST_LEFT,
                         MINI_SCREEN_LAST_HEIGHT, MINI_SCREEN_LAST_WIDTH], function(items)
{
    if (items[MINI_SCREEN_LAST_TOP])
        miniScreenLastTop = items[MINI_SCREEN_LAST_TOP];
    if (items[MINI_SCREEN_LAST_LEFT])
        miniScreenLastLeft = items[MINI_SCREEN_LAST_LEFT];
    if (items[MINI_SCREEN_LAST_HEIGHT])
        miniScreenLastHeight = items[MINI_SCREEN_LAST_HEIGHT];
    if (items[MINI_SCREEN_LAST_WIDTH])
        miniScreenLastWidth = items[MINI_SCREEN_LAST_WIDTH];
});

$(document).ready(function() {
    // Preload images
    preloadImage("https://raw.githubusercontent.com/jianweichuah/miniyoutube/master/images/pin.png");
    
    var $window = $(window);
    var $document = $(document);

    var $window = $(window);
    var $document = $(document);

    (function($) {
        $.fn.drags = function(opt) {

            opt = $.extend({handle:"",cursor:"move"}, opt);

            if(opt.handle === "") {
                var $el = this;
            } else {
                var $el = this.find(opt.handle);
            }

            return $el.css('cursor', opt.cursor).on("mousedown", function(e) {
                // If the clicked div is resizer, don't make it draggable.
                if(e.target.className === "resizer" || 
                   e.target.className === "mnfb-size-button" || 
                   e.target.className === "mnfb-pin-img" ||
                   e.target.className === "mnfb-progress-area" ||
                   e.target.className === "mnfb-progress-wrap mnfb-progress" ||
                   e.target.className === "mnfb-progress-bar mnfb-progress" ||
                   e.target.className === "mnfb-progress-pointer" ||
                   e.target.className === "mnfb-play-button" ||
                   e.target.className === "mnfb-play-button-play" ||
                   e.target.className === "mnfb-play-button-pause") {
                    return false;
                }

                var $drag = $(this).addClass('draggable');

                var z_idx = $drag.css('z-index'),
                    drg_h = $drag.outerHeight(),
                    drg_w = $drag.outerWidth(),
                    pos_y = $drag.offset().top + drg_h - e.pageY,
                    pos_x = $drag.offset().left + drg_w - e.pageX;

                $drag.css('z-index', 1000);

                $window.on("mousemove", function(e) {
                    // Prevent going out of screen horizontally.
                    var left = e.pageX + pos_x - drg_w;
                    if (left < 5) {
                        left = 5;
                    } else if (left > $window.width() - drg_w - 5) {
                        left = $window.width() - drg_w - 5;
                    }

                    // Prevent going out of screen vertically.
                    var top = e.pageY + pos_y - drg_h;
                    if (top < $document.scrollTop() + 5) {
                        top = $document.scrollTop() + 5;
                    } else if (top > $document.scrollTop() + $window.height() - drg_h - 5) {
                        top = $document.scrollTop() + $window.height() - drg_h - 5;
                    }

                    $('.draggable').offset({
                        top: top,
                        left: left
                    }).on("mouseup", function() {
                        $(this).removeClass('draggable').css('z-index', z_idx);
                    });
                }).on("mouseup", function() {
                    $window.unbind('mousemove');
                    $(this).removeClass('draggable');
                });

                e.preventDefault(); // disable selection
            });
        }
    })(jQuery);

    // While scrolling, collect all the video elements
    $window.scroll(function() {
        // Get all the videos.
        var videos = document.getElementsByTagName("video");
        var $currVideo;
        // Loop through each video and add button into it if doesn't already exist
        for (i = 0; i < videos.length; i++) {
            $currVideo = $(videos[i]);
            if (!checkedVideos[$currVideo.attr('id')] && $currVideo.attr('id') !== MINIFACEBOOK_VIDEO_ID) {
                // 1. Create mini facebook button
                var mnfbBtn = $('<div class="mnfb-btn">Mini Facebook</div>');
                // 2. Add id to the button
                var currBtnId = 'mnfb-id-' + mnfbBtnId;
                mnfbBtn.attr('id', currBtnId);
                // 3. Attach the button to the video
                $currVideo.after(mnfbBtn);
                // 4. Add listeners
                $('#' + currBtnId).click(floatVideo);
                $currVideo.on('mouseover', function(e) {
                    $('#' + currBtnId).show();
                });

                $currVideo.on('mouseleave', function(e) {
                    if (e.toElement.className === "mnfb-btn") {
                        return false;
                    }
                    $('#' + currBtnId).hide();
                });
                // 5. Add this video to the hashmap
                checkedVideos[$currVideo.attr('id')] = true;
                // 6. Increment id
                mnfbBtnId += 1;
            }
        }
    });

    function floatVideo(event) {
        // If there is already a video, do nothing
        if (floated) {
            return false;
        }
        var clickedButton = event.target;
        // 1. Get the video url
        var originalVideo = $(clickedButton).siblings('video').get(0);
        // 2. Pause the main video
        originalVideo.pause();
        // 3. Create the mini facebook div
        var $miniScreen = $('<div id="minifacebook"></div');
        // Put the screen back to its last position, if defined.
        // Else default to top right.
        var miniScreenTop = 55;
        var miniScreenHeight = 175;
        var miniScreenLeft = $window.width() - 380;
        var miniScreenWidth = 310;
        var videoSrc = originalVideo.src;

        if (miniScreenLastTop && miniScreenLastHeight && 
            miniScreenLastLeft && miniScreenLastWidth &&
            miniScreenLastLeft + miniScreenLastWidth <= $window.width() &&
            miniScreenLastTop + miniScreenLastHeight <= $window.height()) {

            miniScreenTop = miniScreenLastTop;
            miniScreenHeight = miniScreenLastHeight;
            miniScreenLeft = miniScreenLastLeft;
            miniScreenWidth = miniScreenLastWidth;
        }

        $miniScreen.css('top', miniScreenTop);
        $miniScreen.css('left', miniScreenLeft);
        $miniScreen.height(miniScreenHeight);
        $miniScreen.width(miniScreenWidth);

        if(videoSrc.match('blob:')){
            var flashvars = originalVideo.getElementsByTagName('embed')[0].getAttribute('flashvars');
            var params = JSON.parse(Util.getJsonFromUrl(flashvars).params);
            videoSrc = params.video_data.progressive[0].hd_src;
        }

        // 4. Create a video tag with the video url
        $newVideo = $('<video>', {src: videoSrc, id: MINIFACEBOOK_VIDEO_ID});

        // Set the width and height of the video to fit the div
        $newVideo.css('width', miniScreenWidth);
        $newVideo.css('height', miniScreenHeight);

        // Bind the time update event to the video
        $newVideo.bind('timeupdate', updateTime);

        // 5. Append the video into the mini facebook div
        $miniScreen.append($newVideo);
        // 6. Append everything into the body tag
        $miniScreen.appendTo('body');
        // 7. Add listeners to mini facebook
        addListeners();
        // 8. Add video controls
        addVideoControls();
        // 9. Play the video
        $('#mnfb-video').get(0).play();
        $(".mnfb-play-button-pause").show();
        // 10. Make minifacebook draggable
        $miniScreen.drags();
        // 11. Set floated to true
        floated = true;
    }

    function addVideoControls() {
        // Add resizers to the right corners of the div
        $('#minifacebook').append('<div class="resizer" id="mnfb-br"></div>\
                                    <div class="resize-icon"></div>\
                                    <div class="mnfb-control-icons">\
                                        <button class="mnfb-size-button" id="mnfb-pin-button"><img class="mnfb-pin-img" src="https://raw.githubusercontent.com/jianweichuah/miniyoutube/master/images/pin.png" width="20px"/></button>\
                                        <label class="mnfb-pin-label">Save screen settings.</label>\
                                        <button class="mnfb-size-button" id="mnfb-small-button">S</button>\
                                        <button class="mnfb-size-button" id="mnfb-medium-button">M</button>\
                                        <button class="mnfb-size-button" id="mnfb-large-button">L</button>\
                                        <button class="mnfb-size-button" id="mnfb-extra-large-button">XL</button>\
                                    </div>\
                                    <div class="mnfb-play-button" id="mnfb-play-button">\
                                        <div class="mnfb-play-button-play"></div>\
                                        <div class="mnfb-play-button-pause"></div>\
                                    </div>\
                                    <button class="mnfb-size-button" id="mnfb-close-button">X</button>\
                                    <div class="mnfb-progress-area">\
                                        <div class="mnfb-progress-wrap mnfb-progress">\
                                            <div class="mnfb-progress-bar mnfb-progress"></div>\
                                        </div>\
                                        <div class="mnfb-progress-pointer"></div>\
                                    </div>');

        // Add listeners for the controls
        $('#mnfb-small-button').click(handleTransitionSmall);
        $('#mnfb-medium-button').click(handleTransitionMedium);
        $('#mnfb-large-button').click(handleTransitionLarge);
        $('#mnfb-extra-large-button').click(handleTransitionExtraLarge);

        $('#mnfb-play-button').click(toggleVideo);

        // Save the position and size of the screen if pin button is clicked
        $('#mnfb-pin-button').click(pinButtonClicked);
        $('#mnfb-close-button').click(closeButtonClicked);
        // Add listener for the resizers
        $('.resizer').bind('mousedown.resizer', initResize);
        $('.resize-icon').bind('mousedown.resizer', initResize);
        // Add listener for the progress bar
        $('.mnfb-progress-area').hover(handleProgressHoverIn, handleProgressHoverOut);
        $('.mnfb-progress-area').click(handleVideoProgress);
    }

    function addListeners() {
        // Modify clicking to differentiate long vs short clicks.
        $('#minifacebook').on('mouseup', function(e) {
            // If resizing, stop it
            if (resizing) {
                stopResize(e);
            }
            return false;
        });

        $('#minifacebook').on('mouseover', function(e) {
            $('.mnfb-control-icons').show();
            $('#mnfb-close-button').show();
            $('.mnfb-play-button').show();
        });

        $('#minifacebook').on('mouseleave', function(e) {
            $('.mnfb-control-icons').hide();
            $('#mnfb-close-button').hide();
            $('.mnfb-play-button').hide();
        });

        $('#minifacebook').click(function() {
            return false;
        });

        // Disable double click to full screen.
        $('#minifacebook').dblclick(function() {
            return false;
        });
    }

    function handleProgressHoverIn() {
        $('.mnfb-progress-wrap').height(5);
        $('.mnfb-progress-bar').height(5);
        $('.mnfb-progress-pointer').show();
    }

    function handleProgressHoverOut() {
        $('.mnfb-progress-wrap').height(1);
        $('.mnfb-progress-bar').height(1);
        $('.mnfb-progress-pointer').hide();
    }

    function handlePlayPause(){
        toggleVideo();
    }

    function handleVideoProgress(e) {
        var clickedPositionX = e.offsetX;
        var totalWidth = $('.mnfb-progress-area').width();
        if (e.target.className === "mnfb-progress-bar mnfb-progress" ||
            e.target.className === "mnfb-progress-pointer") {
            clickedPositionX = clickedPositionX + $('.mnfb-progress-bar').position().left;
        }
        var percent = clickedPositionX/totalWidth;
        var video = $('#mnfb-video').get(0);
        video.currentTime = percent * video.duration;
        updateTime();
    }

    function initResize(e) {
        resizing = true;
        // Store the initial values to calculate new size later
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        dragStartWidth = $('#minifacebook').width();
        dragStartHeight = $('#minifacebook').height();
        dragRatio = dragStartHeight/dragStartWidth;
        // Add event listeners to perform resize
        $window.mousemove(doResize)
            .mouseup(stopResize);

        e.preventDefault();

        return false;
    }

    function doResize(e) {
        // if not resizing, do nothing
        if (!resizing) {
            return false;
        }

        var newWidth = dragStartWidth + e.clientX - dragStartX;
        // Make sure the new width does not exceed the max width
        if (newWidth > maxWidth) {
            newWidth = maxWidth;
        }
        if (newWidth < minWidth) {
            newWidth = minWidth;
        }

        var newHeight = Math.round(newWidth * dragRatio);
        $('#minifacebook').width(newWidth)
            .height(newHeight);
        // Added to also resize the video after the YouTube update
        $('#mnfb-video').width(newWidth)
            .height(newHeight);

        e.preventDefault();

        return false;
    }

    function stopResize(e) {
        // Set the flag to false
        resizing = false;
        // Remove the listensers
        $window.unbind('mousemove');
        return false;
    }

    function showPause(){
        $(".mnfb-play-button-play").hide();
        $(".mnfb-play-button-pause").show();
    }

    function showPlay(){
        $(".mnfb-play-button-play").show();
        $(".mnfb-play-button-pause").hide();
    }

    function toggleVideo() {
        $vid = $('#mnfb-video').get(0);
        if ($vid.paused){
            showPause();
            $vid.play();
        } else {
            showPlay();
            $vid.pause();
        }
    }

    function closeButtonClicked() {
        $('#minifacebook').remove();
        floated = false;
    }

    function pinButtonClicked() {
        saveMiniFacebookSettings();
        // Show settings saved alert
        $settingsSavedAlert = $('<div style="width: 100%">\
                                    <div class="alert alert-success" role="alert">\
                                        <img src="https://raw.githubusercontent.com/jianweichuah/minifacebook/master/icon16.png" height="10px">\
                                        Mini Facebook: Screen settings saved!\
                                    </div>\
                                 </div>');
        $('body').prepend($settingsSavedAlert);
        // Show it for 5 seconds, fade it out and remove it.
        $settingsSavedAlert.show().delay(1000).fadeOut(100, function() {
            $(this).remove();
        });
    }

    function saveMiniFacebookSettings() {
        // Save screen position and size
        miniScreenLastTop = $('#minifacebook').position().top;
        miniScreenLastLeft = $('#minifacebook').position().left;
        miniScreenLastHeight = $('#minifacebook').height();
        miniScreenLastWidth = $('#minifacebook').width();
        // Persist to browser storage
        chrome.storage.sync.set({'miniScreenLastTop': miniScreenLastTop,
                                 'miniScreenLastLeft': miniScreenLastLeft,
                                 'miniScreenLastHeight': miniScreenLastHeight,
                                 'miniScreenLastWidth': miniScreenLastWidth});
    }

    // Update the size of the screen to small
    function handleTransitionSmall() {
        resizeScreen(SMALL_WIDTH, SMALL_HEIGHT);
    }

    function handleTransitionMedium() {
        resizeScreen(MEDIUM_WIDTH, MEDIUM_HEIGHT);
    }

    function handleTransitionLarge() {
        resizeScreen(LARGE_WIDTH, LARGE_HEIGHT);
    }

    function handleTransitionExtraLarge() {
        resizeScreen(EXTRA_LARGE_WIDTH, EXTRA_LARGE_HEIGHT);
    }

    function updateTime() {
        // If video is not floated, do nothing.
        if (!floated) {
            return false;
        }
        // Get the video player and calculate the progress
        $video = $('#mnfb-video').get(0);

        var percent = $video.currentTime/$video.duration;
        var progressBarWidth = $('#minifacebook').width();
        var progressTotal = percent * progressBarWidth;

        $('.mnfb-progress-bar').stop().animate({
            left: progressTotal
        });
        $('.mnfb-progress-pointer').stop().animate({
            left: progressTotal - 5
        });
        if(percent === 1)
            showPlay();
    }


    function resizeScreen(newWidth, newHeight) {
        if ($('#minifacebook').width() == newWidth) {
            return false;
        }

        $('#minifacebook').animate({'width':newWidth, 'height':newHeight}, 300);
        $('#mnfb-video').animate({'width':newWidth, 'height':newHeight}, 300);
    }

    function preloadImage(url) {
        var img=new Image();
        img.src=url;
    }
});

var Util = {
    getJsonFromUrl: function(q) {
        var result = {};
        q.split("&").forEach(function(part) {
            var item = part.split("=");
            result[item[0]] = decodeURIComponent(item[1]);
        });
        return result;
    }
};