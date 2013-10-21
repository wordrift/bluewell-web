
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
var g_story_node = {};
var g_ejs_story = false;
var g_curr_page = 0;
var g_page_count = 0;

function readerReady()
{
    g_ejs_story = new EJS({ url: '/templates/story.ejs' });
    g_ejs_end_of_story = new EJS({ url: '/templates/end_of_story.ejs' });

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
        renderStory();
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

function readerSeekToWord(word_num)
{
    var new_top = 0;
    var body_height = parseInt( $('#reader #story_body').css('height') );
    var scroll_height = $('#reader #story_body').get(0).scrollHeight;

    if( word_num > 0 )
    {
        var y_pos = 0;
        var scroll_top = $('#story_body').scrollTop();
        $('#reader #story_body .story_text').children().each(function(index,element)
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
        $('#reader #story_body').scrollTop(new_top);
    }
}
function readerSaveProgress()
{
    var in_view = $('#reader #story_body .story_text').children(':in-viewport');
    
    var current_word = in_view.first().data('start_word');
    var last = in_view.last();
    var max_word = last.data('start_word') + last.data('word_count');
    
    streamSaveProgress(current_word,max_word);
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
    var width = $('#reader #story_body').width();
    
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
        var body_width = $('#reader #story_body').width();
        var new_left = g_curr_page * body_width;
        $('#reader #story_body').scrollLeft(new_left);

        clickReaderCenter();
    }
}

function isEndOfStoryPage()
{
    if( $('#reader #story_body .end_story_page').is(':in-viewport') )
    {
        return true;
    }
    else
    {
        return false;
    }
}
function scrollToEndOfStoryPage()
{
    var scroll_top = $('#reader #story_body').scrollTop();
    var end_of_story_top = $('#reader #story_body .end_story_page').position().top + scroll_top;
    $('#reader #story_body').scrollTop(end_of_story_top);
}
function isLastStoryPage()
{
    var scroll_top = $('#reader #story_body').scrollTop();
    var body_height = parseInt( $('#reader #story_body').css('height') );
    var scroll_bottom = scroll_top + body_height;
    
    var end_of_story = $('#reader #story_body .bottom_story_spacer').position().top + scroll_top;
    
    if( end_of_story >= scroll_top
        && end_of_story <= scroll_bottom )
    {
        return true;
    }
    else
    {
        return false;
    }
}

function readerPageRight()
{
    var body_width = $('#reader #story_body').width();
    var scroll_width = $('#reader #story_body').get(0).scrollWidth;

    var new_page = g_curr_page + 1;
    if( new_page >= g_page_count )
    {
        readerNext();
    }
    else
    {
        var new_left = new_page * body_width;
        $('#reader #story_body').animate({ scrollLeft: new_left },PAGE_DELAY);
        g_curr_page = new_page;
    }
    readerHideOverlays(true);
}
function readerPageLeft()
{
    var scroll_left = $('#reader #story_body').scrollLeft();
    var body_width = $('#reader #story_body').width();
    var new_left = scroll_left - body_width;
    
    var new_page = g_curr_page - 1;
    if( g_curr_page > 0 )
    {
        var new_left = body_width * new_page;
        $('#reader #story_body').animate({ scrollLeft: new_left },PAGE_DELAY);
        g_curr_page = new_page;
    }
    else
    {
        readerPrev();
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
    var old_size = $('#reader #story_body').css('font-size');
    old_size = parseInt(old_size);
    var new_size = old_size - 1;
    if( new_size > MIN_FONT_SIZE )
    {
        $('#reader #story_body').css('font-size',new_size + 'px');
        renderStory();
        saveReaderSettings();
    }
}
function clickFontLarger()
{
    var old_size = $('#reader #story_body').css('font-size');
    old_size = parseInt(old_size);
    var new_size = old_size + 1;
    if( new_size < MAX_FONT_SIZE )
    {
        $('#reader #story_body').css('font-size',new_size + 'px');
        renderStory();
        saveReaderSettings();
    }
}

function renderStory(story,node)
{
    if( story )
    {
        g_story_data = story;
    }
    if( node )
    {
        g_story_node = node;
    }
    g_curr_page = 0;
    var next_story = {
        title: 'Next Story',
        subtitle: '',
        author_list: [ 'Next Author' ]
    };
    var args = { story: g_story_data, next_story: next_story };
    g_ejs_story.update('paged_story',args);

    readerFixMetrics();
    var end_of_story = g_ejs_end_of_story.render(args);
    $('#reader #story_body #paged_story .pages').append(end_of_story);
    g_page_count++;
    
    setPageSizes();

    $('#reader #top_bar .current_title').html(g_story_data.title);
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
}
function ignoreMe()
{
    var word_count = 0;
    $('#reader #story_body .story_text').children().each(function(index,element)
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
function readerFixMetrics()
{
    var metrics = THEME_METRICS[g_current_theme];
    
    var font_size = parseInt( $('#story_body').css('font-size') );
    var line_height = Math.ceil( font_size * metrics.line_height_ratio );
    $('#story_body').css('line-height',line_height + 'px');
    
    makePages();
}
function setPageSizes()
{
    var container_width = $('#reader #story_body').width();
    var padding_width = parseInt( $('#reader #story_body .page').css('padding-left') );
    var page_width = container_width - 2*padding_width;
    $('#reader #story_body .page').css('width',page_width + 'px');
}

function makePages()
{
    var page_height = $('#story_body_container').height();
    var container_width = $('#reader #story_body').width();
    var padding_width = parseInt( $('#reader #story_body .page').css('padding-left') );
    var page_width = container_width - 2*padding_width;

    var pages_col = $('#paged_story .pages');
    var full_story_col = $('#paged_story .pages .full_story');
    
    if( !full_story_col || full_story_col.length == 0 )
    {
        return;
    }
    g_page_count = 0;
    
    while( full_story_col.children().length > 0 )
    {
        g_page_count++;
        var html = "<div class='page' style='width: {0}px'></div>".format(page_width);
        pages_col.append(html);
        var new_page_col = pages_col.find('.page:last');
        
        while( true )
        {
            var new_page_height = new_page_col.height();
            
            if( new_page_height >= page_height )
            {
                var last_child = new_page_col.children(':last');
                var last_tag = last_child.prop('tagName').toLowerCase();
                var last_classes = last_child.attr('class');
                
                last_child.remove();
                if( last_tag == 'p' )
                {
                    var html = last_child.html();
                    var words = html.split(/\s/);
                    var i;
                    new_page_col.append("<{0}>".format(last_tag));
                    new_last_child = new_page_col.children(':last');
                    if( last_classes )
                    {
                        new_last_child.addClass(last_classes);
                    }
                    for( i = 0 ; i < words.length ; ++i )
                    {
                        var curr_page = words.slice(0,i).join(' ');
                        new_last_child.html(curr_page);
                        
                        new_page_height = new_page_col.height();
                        if( new_page_height > page_height )
                        {
                            i -= 1;
                            break;
                        }
                    }
                    if( i < 2 )
                    {
                        new_last_child.remove();
                        full_story_col.prepend(last_child);
                    }
                    else if( i != words.length )
                    {
                        var curr_page = words.slice(0,i).join(' ');
                        new_last_child.html(curr_page);
                        new_last_child.addClass('split');
                        
                        var next_page = "<{0} class='after_split'>".format(last_tag);
                        next_page += words.slice(i).join(' ');
                        full_story_col.prepend(next_page);
                    }
                    else
                    {
                    }
                }
                else
                {
                    full_story_col.prepend(last_child);
                }
                break;
            }
            else
            {
                var first_child = full_story_col.children(':first');
                if( first_child.length > 0 )
                {
                    first_child.remove();
                    new_page_col.append(first_child);
                }
                else
                {
                    break;
                }
            }
        }
    }
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


