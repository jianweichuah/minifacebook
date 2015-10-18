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

$(document).ready(function() {
    // Preload images
    preloadImage("https://raw.githubusercontent.com/jianweichuah/miniyoutube/master/images/pin.png");

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
                   e.target.className === "mnfb-pin-img") {
                    return false;
                }

                var $drag = $(this).addClass('draggable');

                var z_idx = $drag.css('z-index'),
                    drg_h = $drag.outerHeight(),
                    drg_w = $drag.outerWidth(),
                    pos_y = $drag.offset().top + drg_h - e.pageY,
                    pos_x = $drag.offset().left + drg_w - e.pageX;
                $drag.css('z-index', 1000);

                $(window).on("mousemove", function(e) {
                    // Prevent going out of screen horizontally.
                    var left = e.pageX + pos_x - drg_w;
                    if (left < 5) {
                        left = 5;
                    } else if (left > $(window).width() - drg_w - 5) {
                        left = $(window).width() - drg_w - 5;
                    }

                    // Prevent going out of screen vertically.
                    var top = e.pageY + pos_y - drg_h;
                    if (top < $(document).scrollTop() + 5) {
                        top = $(document).scrollTop() + 5;
                    } else if (top > $(document).scrollTop() + $(window).height() - drg_h - 5) {
                        top = $(document).scrollTop() + $(window).height() - drg_h - 5;
                    }

                    $('.draggable').offset({
                        top: top,
                        left: left
                    }).on("mouseup", function() {
                        $(this).removeClass('draggable').css('z-index', z_idx);
                    });
                }).on("mouseup", function() {
                    $(window).unbind('mousemove');
                    $(this).removeClass('draggable');
                });

                e.preventDefault(); // disable selection
            });
        }
    })(jQuery);

    // While scrolling, collect all the video elements
    $(window).scroll(function() {
        var videos = document.getElementsByTagName("video");
        // Loop through each video and add button into it if doesn't already exist
        for (i = 0; i < videos.length; i++) {
            var currVideo = $(videos[i]);
            if (!checkedVideos[currVideo.attr('id')] && currVideo.attr('id') !== MINIFACEBOOK_VIDEO_ID) {
                // Alert: hacky solution
                var mnfbBtn = $('<div class="mnfb-btn">Play in Mini Facebook</div>');
                var currBtnId = 'mnfb-id-' + mnfbBtnId;
                mnfbBtn.attr('id', currBtnId);
                currVideo.after(mnfbBtn);
                console.log(currVideo.attr('id'));
                $('#' + currBtnId).click(floatVideo);
                // Add this video to the hashmap
                checkedVideos[currVideo.attr('id')] = true;
                mnfbBtnId += 1;
            }
        }
    });

    function floatVideo(event) {
        // If there is already a video, do nothing
        if (floated == true) {
            return false;
        }
        var clickedButton = event.target;
        // 1. Get the video url
        var originalVideo = $(clickedButton).siblings('video').get(0);
        // 2. Pause the main video
        originalVideo.pause();
        // 3. Create the mini facebook div
        $miniScreen = $('<div id="minifacebook"></div');
        // 4. Create a video tag with the video url
        $newVideo = $('<video>', {src: originalVideo.src, id: MINIFACEBOOK_VIDEO_ID});
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
        // 10. Make minifacebook draggable
        $('#minifacebook').drags();
        // 11. Set floated to true
        floated = true;
    }

    function addVideoControls() {
        // Add resizers to the right corners of the div
        $('#minifacebook').append('<div>\
                                        <div class="mnfb-control-icons">\
                                            <button class="mnfb-size-button" id="mnfb-pin-button"><img class="mnfb-pin-img" src="https://raw.githubusercontent.com/jianweichuah/miniyoutube/master/images/pin.png" width="20px"/></button>\
                                            <label class="mnfb-pin-label">Save screen settings.</label>\
                                            <button class="mnfb-size-button" id="mnfb-small-button">S</button>\
                                            <button class="mnfb-size-button" id="mnfb-medium-button">M</button>\
                                            <button class="mnfb-size-button" id="mnfb-large-button">L</button>\
                                            <button class="mnfb-size-button" id="mnfb-extra-large-button">XL</button>\
                                        </div>\
                                        <button class="mnfb-size-button" id="mnfb-close-button">X</button>\
                                        <div class="mnfb-progress-wrap mnfb-progress">\
                                            <div class="mnfb-progress-bar mnfb-progress"></div>\
                                        </div>\
                                  </div>');

        // Add listeners for the controls
        $('#mnfb-small-button').click(handleTransitionSmall);
        $('#mnfb-medium-button').click(handleTransitionMedium);
        $('#mnfb-large-button').click(handleTransitionLarge);
        $('#mnfb-extra-large-button').click(handleTransitionExtraLarge);
        // Save the position and size of the screen if pin button is clicked
        $('#mnfb-pin-button').click(pinButtonClicked);
        $('#mnfb-close-button').click(closeButtonClicked);
    }

    function addListeners() {
        $('#minifacebook').on('mouseover', function(e) {
            $('.mnfb-control-icons').show();
            $('#mnfb-close-button').show();
        });

        $('#minifacebook').on('mouseleave', function(e) {
            $('.mnfb-control-icons').hide();
            $('#mnfb-close-button').hide();
        });

        $('#miniyoutube').click(function() {
            // If the click is on the controls, don't pause
            if (e.target.className === "mnfb-size-button" || e.target.className === "mnfb-pin-img") {
                return false;
            }
            toggleVideo();
        });

        // Disable double click to full screen.
        $('#miniyoutube').dblclick(function() {
            return false;
        });
    }

    function toggleVideo() {
        $vid = $('#mnfb-video').get(0);
        if ($vid.paused)
            $vid.play();
        else
            $vid.pause();
    }

    function pinButtonClicked() {
        // saveMiniYouTubeSettings();
        // // Show settings saved alert
        // $settingsSavedAlert = $('<div style="width: 100%">\
        //                             <div class="alert alert-success" role="alert">\
        //                                 <img src="https://raw.githubusercontent.com/jianweichuah/miniyoutube/master/icon16.png" height="10px">\
        //                                 Mini YouTube: Screen settings saved!\
        //                             </div>\
        //                          </div>');
        // $('body').prepend($settingsSavedAlert);
        // // Show it for 5 seconds, fade it out and remove it.
        // $settingsSavedAlert.show().delay(1000).fadeOut(100, function() {
        //     $(this).remove();
        // });
    }

    function closeButtonClicked() {
        $('#minifacebook').remove();
        floated = false;
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