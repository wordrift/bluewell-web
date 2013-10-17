
var MIN_FONT_SIZE = 6;
var MAX_FONT_SIZE = 26;
var MIN_MARGIN = 0;
var PAGE_DELAY = 200;
var FADE_DELAY = 200;

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
    theme_roboto: {
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
    var opts = {
        onValidSwipe: readerValidSwipe,
        onClick: readerClick
    };
    $('#story_body').swipe(opts);
    loadReaderSettings();

    readerSetTheme(g_current_theme);
    
    $(window).resize(function()
    {
        window.scrollTo(0,0);
        readerFixMetrics();
    });
}
$(document).ready(readerReady);

function saveReaderSettings()
{
    var font_size = parseInt( $('#story_body').css('font-size') );
    var theme = g_current_theme;
    
    var settings = {
        font_size: font_size,
        theme: theme
    };
    var json = JSON.stringify(settings);
    
    window.localStorage['reader_settings'] = json;
}
function loadReaderSettings()
{
    if( 'reader_settings' in window.localStorage )
    {
        var json = window.localStorage['reader_settings'];
        if( json.length > 0 )
        {
            try
            {
                var settings = JSON.parse(json);
                if( 'font_size' in settings )
                {
                    var size = settings.font_size;
                    if( size > MIN_FONT_SIZE && size < MAX_FONT_SIZE )
                    {
                        $('#story_body').css('font-size',size + 'px')
                    }
                }
                if( 'theme' in settings )
                {
                    readerSetTheme(settings.theme);
                }
            }
            catch(e)
            {
            }
        }
    }
}

function renderStory(story,node)
{
    g_story_data = story;
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
    html += "<div class='text styled_text'>";
    html += story.text;
    html += "</div>";
    html += "<div class='author_notes styled_text'>";
    html += story.author_notes;
    html += "</div>";
    html += "<div class='spacer'></div>";
    $('#story_body').html(html);
    readerFixMetrics();

    $('#reader #top_bar .nav_bar div').removeClass('active');
    if( hasPreviousStory() )
    {
        $('#reader #top_bar .nav_bar .prev').addClass('active');
    }
    if( hasNextStory() )
    {
        $('#reader #top_bar .nav_bar .next').addClass('active');
    }
    if( !isAtStreamHead() )
    {
        $('#reader #top_bar .nav_bar .fast_forward').addClass('active');
    }
    
    var word_count = 0;
    $('#story_body .text').children().each(function(index,element)
    {
        var words = 0;
        var text = $(this).text();
        var m = text.match(/\w[^\s]*/g);
        if( m )
        {
            words = m.length;
        }
        
        $(this).data('start_word',word_count);
        $(this).data('word_count',words);
        
        word_count += words;
    });
    
    readerSeekToWord(node.current_word);
    
    readerSaveProgress();
}
function readerSeekToWord(word_num)
{
    var new_top = 0;
    var body_height = parseInt( $('#story_body').css('height') );
    var scroll_height = $('#story_body').get(0).scrollHeight;

    if( word_num > 0 )
    {
        var y_pos = 0;
        var scroll_top = $('#story_body').scrollTop();
        $('#story_body .text').children().each(function(index,element)
        {
            var start_word = $(this).data('start_word');
            if( start_word <= word_num )
            {
                y_pos = scroll_top + $(this).position().top;
            }
            else
            {
                return false;
            }
        });
        var page = Math.round(y_pos / body_height);
        
        new_top = page * body_height;
    }
    else
    {
        new_top = 0;
    }
    
    if( new_top + body_height < scroll_height )
    {
        $('#story_body').scrollTop(new_top);
    }
}
function readerSaveProgress()
{
    var in_view = $('#story_body .text').children(':in-viewport');
    
    var current_word = in_view.first().data('start_word');
    var last = in_view.last();
    var max_word = last.data('start_word') + last.data('word_count');
    
    streamSaveProgress(current_word,max_word);
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
    
    if( width > 700 )
    {
        var boundry_left = width / 4;
        var boundry_right = width * 3 / 4;
    }
    else
    {
        var boundry_left = width / 3;
        var boundry_right = width * 2 / 3;
    }
    
    if( x < boundry_left )
    {
        readerPageLeft();
    }
    else if( x > boundry_right )
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
            readerSaveProgress();
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
            readerSaveProgress();
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
function clickTitleBar()
{
    readerHideOverlays(true);
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
        saveReaderSettings();
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
        saveReaderSettings();
    }
}

function readerFixMetrics()
{
    var metrics = THEME_METRICS[g_current_theme];
    
    /*
    var container_width = $('#story_body_container').width();
    var padding_width = parseInt( $('#story_body').css('padding-left') );
    var body_width = container_width - 2*padding_width;
    $('#story_body').css('width',body_width + 'px');
    */

    var available_height = $('#story_body_container').height();
    var font_size = parseInt( $('#story_body').css('font-size') );
    var line_height = Math.ceil( font_size * metrics.line_height_ratio );
    $('#story_body').css('line-height',line_height + 'px');
    
    var h1_font_size = 1.5 * font_size;
    var h2_font_size = 1.25 * font_size;
    var header_line_height = line_height * 2;
    $('#reader #story_body .styled_text h1').css('font-size',h1_font_size + 'px');
    $('#reader #story_body .styled_text h1').css('line-height',header_line_height + 'px');

    $('#reader #story_body .styled_text h2,h3').css('font-size',h2_font_size + 'px');
    $('#reader #story_body .styled_text h2,h3').css('line-height',header_line_height + 'px');
    
    var lines = Math.floor( available_height / line_height );
    
    var used_height = lines * line_height;
    $('#story_body').css('height',used_height + 'px');
    var spacer_height = used_height - 1;
    $('#reader #story_body .spacer').css('height',spacer_height + 'px');

    var scroll_top = $('#story_body').scrollTop();
    var new_scroll_top = Math.floor(scroll_top / used_height) * used_height;
    $('#story_body').scrollTop(new_scroll_top);
    
    var extra_margin = available_height - used_height;
    
    var new_margin_top = Math.floor( extra_margin / 2 );
    var new_margin_bottom = extra_margin - new_margin_top;
    
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
    readerSetTheme(new_theme);
    saveReaderSettings();
}
function readerSetTheme(new_theme)
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

function readerPrev()
{
    if( hasPreviousStory() )
    {
        streamPrevious();
        getCurrentStory(function(err,story,node)
        {
            renderStory(story,node);
        });
    }
}
function readerNext()
{
    if( hasNextStory() )
    {
        streamNext();
        getCurrentStory(function(err,story,node)
        {
            renderStory(story,node);
        });
    }
}
function readerFastForward()
{
    if( !isAtStreamHead() )
    {
        streamFastForward();
        getCurrentStory(function(err,story,node)
        {
            renderStory(story,node);
        });
    }
}


