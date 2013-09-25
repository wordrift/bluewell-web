
var MIN_FONT_SIZE = 6;
var MAX_FONT_SIZE = 26;
var MIN_MARGIN = 10;
var PAGE_DELAY = 200;
var FADE_DELAY = 200;

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

var THEME_METRICS = {
    theme_standard: {
        line_height_ratio: 1.5
    },
    theme_helvetica: {
        line_height_ratio: 1.375
    },
    theme_baskerville: {
        line_height_ratio: 1.4
    },
    theme_palatino: {
        line_height_ratio: 1.5
    },
    theme_midnight: {
        line_height_ratio: 1.5
    }
};

var g_current_theme = 'theme_standard';
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
    
    var opts = {
        onValidSwipe: readerValidSwipe,
        onClick: readerClick
    };
    $('#story_body').swipe(opts);

    clickTheme(g_current_theme);
}
$(document).ready(readerReady);

function renderStory()
{
    var story = g_story_data;
    $('#top_bar .title_bar .current_title').html(story.title);

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

    readerFixMetrics();
}
function readerAnimateLeft(dest_x,base_duration,easing,onComplete)
{
    if( !base_duration )
    {
        base_duration = 150;
    }
    if( !onComplete )
    {
        onComplete = function() {};
    }
    if( !easing )
    {
        easing = 'easeOutCirc';
    }

    var half_width = $('#story_body').width() / 2;
    var curr_x = $('#story_body').position().left;
    
    var delta = Math.abs( dest_x - curr_x );
    if( delta > 0 )
    {
        
        var time_ratio = Math.min(1.0,delta/half_width);
        
        var duration = base_duration * time_ratio;
        $('#story_body').animate({ left: dest_x + 'px' },duration,easing,onComplete);
    }
    else
    {
        onComplete();
    }
}

function readerValidSwipe(is_left)
{
    if( is_left )
    {
        readerPageLeft();
    }
    else
    {
        readerPageRight();
    }
}
function readerClick(x,y)
{
    var width = $('#story_body').width();
    
    if( x < width / 3 )
    {
        readerPageLeft();
    }
    else if( x > width * 2 / 3 )
    {
        readerPageRight();
    }
    else
    {
        readerAnimateLeft(0);
        clickReaderCenter();
    }
}

function readerPageRight()
{
    var scroll_top = $('#story_body').scrollTop();
    var body_height = parseInt( $('#story_body').css('height') );
    
    var new_top = scroll_top + body_height;
    var scroll_height = $('#story_body').get(0).scrollHeight;
    
    if( new_top + body_height < scroll_height )
    {
        var half_width = $('#story_body').width() / 2;
        readerAnimateLeft(-half_width,PAGE_DELAY/2,'easeInCirc',function()
        {
            $('#story_body').scrollTop(new_top);
            $('#story_body').css('left',half_width + 'px');
            readerAnimateLeft(0,PAGE_DELAY/2,'easeOutCirc');
        });
    }
    else
    {
        readerAnimateLeft(0);
    }
    readerHideOverlays(true);
}
function readerPageLeft()
{
    var scroll_top = $('#story_body').scrollTop();
    
    if( scroll_top > 0 )
    {
        var body_height = parseInt( $('#story_body').css('height') );
        var new_top = scroll_top - body_height;

        var half_width = $('#story_body').width() / 2;
        readerAnimateLeft(half_width,PAGE_DELAY/2,'easeInCirc',function()
        {
            $('#story_body').scrollTop(new_top);
            $('#story_body').css('left',-half_width + 'px');
            readerAnimateLeft(0,PAGE_DELAY/2,'easeOutCirc');
        });
    }
    else
    {
        readerAnimateLeft(0);
    }
    readerHideOverlays(true);
}

function readerHideOverlays(animate)
{
    if( animate )
    {
        if( $('#text_settings').is(':visible') )
        {
            $('#text_settings').fadeOut(FADE_DELAY);
        }
        if( $('#bottom_bar').is(':visible') )
        {
            $('#bottom_bar').fadeOut(FADE_DELAY);
        }
        if( $('#top_bar').is(':visible') )
        {
            $('#top_bar').fadeOut(FADE_DELAY);
        }
    }
    else
    {
        $('#text_settings').hide();
        $('#bottom_bar').hide();
        $('#top_bar').hide();
    }
}

function clickReaderCenter()
{
    if( $('#top_bar').is(':visible') )
    {
        readerHideOverlays(true);
    }
    else
    {
        $('#top_bar').fadeIn(FADE_DELAY);
        $('#bottom_bar').fadeIn(FADE_DELAY);
    }
}

function clickTextSettings()
{
    $('#bottom_bar').fadeOut(FADE_DELAY);
    $('#text_settings').fadeIn(FADE_DELAY);
}

function clickFontSmaller()
{
    var old_size = $('#story_body').css('font-size');
    old_size = parseInt(old_size);
    var new_size = old_size - 1;
    if( new_size > MIN_FONT_SIZE )
    {
        $('#story_body').css('font-size',new_size + 'px');
        readerFixMetrics();
    }
}
function clickFontLarger()
{
    var old_size = $('#story_body').css('font-size');
    old_size = parseInt(old_size);
    var new_size = old_size + 1;
    if( new_size < MAX_FONT_SIZE )
    {
        $('#story_body').css('font-size',new_size + 'px');
        readerFixMetrics();
    }
}

function readerFixMetrics()
{
    var metrics = THEME_METRICS[g_current_theme];

    var body_height = $('#story_body').height();
    var body_margin_top = parseInt( $('#story_body').css('margin-top') );
    var body_margin_bottom = parseInt( $('#story_body').css('margin-bottom') );
    
    var total_height = body_height + body_margin_top + body_margin_bottom;
    
    var available_height = total_height - ( 2 * MIN_MARGIN );
    
    var font_size = parseInt( $('#story_body').css('font-size') );
    var line_height = Math.ceil( font_size * metrics.line_height_ratio );
    $('#story_body').css('line-height',line_height + 'px');
    
    var lines = Math.floor( available_height / line_height );
    
    var used_height = lines * line_height;
    $('#story_body').css('height',used_height + 'px');

    var scroll_top = $('#story_body').scrollTop();
    var new_scroll_top = Math.floor(scroll_top / used_height) * used_height;
    $('#story_body').scrollTop(new_scroll_top);
    
    var extra_margin = available_height - used_height;
    
    var new_margin_top = Math.floor( extra_margin / 2 ) + MIN_MARGIN;
    var new_margin_bottom = extra_margin - new_margin_top + 2*MIN_MARGIN;
    
    $('#story_body').css('margin-top',new_margin_top + 'px');
    $('#story_body').css('margin-bottom',new_margin_bottom + 'px');
    
    var header_height = $('#story_body .story_header').height();
    var header_lines = Math.ceil( header_height / line_height );
    var header_rounded_height = header_lines * line_height;
    var header_padding = header_rounded_height - header_height;
    
    $('#story_body .story_header').css('padding-bottom',header_padding + 'px');
}

function clickTheme(new_theme)
{
    var old_theme = g_current_theme;
    $('body').removeClass(old_theme);
    $('body').addClass(new_theme);
    g_current_theme = new_theme;
    
    $('#text_settings .themes .item').removeClass('active');
    var sel = "#text_settings .themes .item.{0}".format(new_theme);
    $(sel).addClass('active');
    readerFixMetrics();
}

