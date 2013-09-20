
var IS_IPAD = window.navigator.userAgent.match(/iPad/i) != null;
var IS_IPHONE = window.navigator.userAgent.match(/iPhone/i) != null;
var IS_IPOD = window.navigator.userAgent.match(/iPod/i) != null;
var IS_IOS = IS_IPAD || IS_IPHONE || IS_IPOD;

var IS_ANDROID = window.navigator.userAgent.match(/Android/i) != null;
var IS_ANDROID_PHONE = window.navigator.userAgent.match(/Android.*Mobile/i) != null;
var IS_ANDROID_TABLET = IS_ANDROID && !IS_ANDROID_PHONE;

var IS_PHONE = IS_IPOD || IS_IPHONE || IS_ANDROID_PHONE;
var IS_TABLET = IS_ANDROID_TABLET || IS_IPAD;

var IS_WINDOWS = window.navigator.userAgent.match(/Windows/i) != null;
var IS_CHROME = window.navigator.userAgent.match(/Chrome/i) != null;
var IS_MOBILE = window.navigator.userAgent.match(/Mobile/i) != null;
var IS_DESKTOP = !IS_MOBILE;

var IS_RETINA = window.devicePixelRatio > 1;
var IS_IOS_WEB_APP = 'standalone' in window.navigator && window.navigator.standalone;

var IS_IE = false;
var IS_OLD_IE = false;
(function() {
    var ie_match = window.navigator.userAgent.match(/IE ([^;]*);/);
    if( ie_match != null && ie_match.length > 1 )
    {
        IS_IE = true;
        var ie_version = parseFloat(ie_match[1]);
        if( ie_version < 9.0 )
            IS_OLD_IE = true;
    }
})();


var g_story_data = {};

function readerReady()
{
    jQuery.ajax(
    {
        type: 'GET',
        url: '/api/1/story/' + g_story_id,
        dataType: 'json',
        success: function(data)
        {
            g_story_data = data;
            renderStory();
        },
        error: function()
        {
            window.alert("Failed to get story data.");
        }
    });
}
$(document).ready(readerReady);

function renderStory()
{
    var story = g_story_data;

    var html = "";
    
    html += "<div class='story_header'>";
    html += " <h1>{0}</h1>".format(story.title);
    if( story.subtitle )
    {
        html += " <h2>{0}</h2>".format(story.subtitle);
    }
    html += " <div class='authors'>";
    html += "  <div class='by'>By:</div>";
    for( var i = 0 ; i < story.author_list.length ; ++i )
    {
        var author = story.author_list[i];
        html += "  <div class='author'>{0}</div>".format(author);
    }
    html += " </div>";
    html += "</div>";
    html += "<div class='text'>";
    html += story.text;
    html += "</div>";
    html += "<div class='author_notes'>";
    html += story.author_notes;
    html += "</div>";
    html += "<div class='spacer'></div>";
    
    $('#story_body').html(html);
}

function clickReaderRight()
{
    var scroll_top = $('#story_body').scrollTop();
    var new_top = scroll_top + 440;
    
    var scroll_height = $('#story_body').get(0).scrollHeight;
    
    if( new_top + 440 < scroll_height )
    {
        $('#story_body').animate({ scrollTop:new_top },150);
    }
}

function clickReaderLeft()
{
    var scroll_top = $('#story_body').scrollTop();
    var new_top = scroll_top - 440;
    $('#story_body').animate({ scrollTop:new_top },150);
}

function clickReaderCenter()
{
}
