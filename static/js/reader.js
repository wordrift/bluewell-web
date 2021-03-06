
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
var g_story_data = false;
var g_story_node = false;
var g_ejs_story = false;
var g_ejs_end_story_page = false;
var g_curr_page = 0;
var g_page_count = 0;
var g_page_list = [];
var g_reader_width = 0;
var g_reader_height = 0;

function readerReady()
{
    g_ejs_story = new EJS({ url: '/templates/story.ejs' });
    g_ejs_end_story_page = new EJS({ url: '/templates/end_story_page.ejs' });

    var opts = {
        onValidSwipe: readerValidSwipe,
        onClick: function(x,y) { window.setTimeout(clickReader,1,x,y); }
    };
    $('#story_body').swipe(opts);
    loadReaderSettings();

    readerSetTheme(g_current_theme);
    $('#reader #rating_bar .stars span').click(clickStar);
    
    $(window).resize(function()
    {
        window.scrollTo(0,0);
        renderForResize();
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
function clickReader(x,y)
{
    if( g_curr_page == g_page_count - 1 )
    {
        var offset = $('#reader .end_story_page .stars').offset();
        var width = $('#reader .end_story_page .stars').width();
        var height = $('#reader .end_story_page .stars').height();
        
        offset.right = offset.left + width;
        offset.bottom = offset.top + height;
        
        if( x >= offset.left && x <= offset.right
            && y >= offset.top && y <= offset.bottom )
        {
            return;
        }
    }
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
        scrollToPage(g_curr_page,true);
        clickReaderCenter();
    }
}

function readerPageRight()
{
    var new_page = g_curr_page + 1;
    if( new_page >= g_page_count )
    {
        if( hasNextStory() )
        {
            readerNext("start");
        }
        else
        {
            scrollToPage(g_curr_page);
        }
    }
    else
    {
        scrollToPage(new_page);
    }
    readerHideOverlays(true);
}
function readerPageLeft()
{
    if( g_curr_page > 0 )
    {
        var new_page = g_curr_page - 1;
        scrollToPage(new_page);
    }
    else
    {
        if( hasPreviousStory() )
        {
            readerPrev("end");
        }
        else
        {
            scrollToPage(g_curr_page);
        }
    }
    readerHideOverlays(true);
}
function scrollToPage(new_page,instant)
{
    var scroll_left = $('#reader #story_body').scrollLeft();
    var body_width = $('#reader #story_body').width();
    
    var new_left = body_width * (new_page + 1);
    if( instant )
    {
        $('#reader #story_body').scrollLeft(new_left);
    }
    else
    {
        var delay = Math.abs(new_left - scroll_left) / body_width * PAGE_DELAY;
        delay = Math.min(delay,PAGE_DELAY);
        $('#reader #story_body').animate({ scrollLeft: new_left },delay);
    }
    g_curr_page = new_page;

    readerSaveProgress();
}

function readerHideOverlays(animate)
{
    if( animate )
    {
        $('#reader .overlay_ui:visible').fadeOut(FADE_DELAY);
    }
    else
    {
        $('#reader .overlay_ui').hide();
    }
}

function clickReaderCenter()
{
    if( $('#reader #top_bar').is(':visible') )
    {
        readerHideOverlays(true);
    }
    else
    {
        $('#reader #top_bar').fadeIn(FADE_DELAY);
        $('#reader #bottom_bar').fadeIn(FADE_DELAY);
    }
}
function clickTitleBar()
{
    readerHideOverlays(true);
}
function clickTextSettings()
{
    $('#reader #bottom_bar').fadeOut(FADE_DELAY);
    $('#reader #text_settings').fadeIn(FADE_DELAY);
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

function renderForResize()
{
    if( $(window).width() != g_reader_width
        || $(window).height() != g_reader_height )
    {
        var load_page = false;
        if( g_curr_page > 0 && g_page_count > 0 && g_curr_page == g_page_count - 1 )
        {
            load_page = 'end';
        }
        renderStory(false,false,load_page);
    }
}
function renderStory(story,node,load_page)
{
    if( story )
    {
        g_story_data = story;
    }
    else
    {
        if( g_story_data )
        {
            story = g_story_data;
        }
        else
        {
            return;
        }
    }
    if( node )
    {
        g_story_node = node;
    }
    else
    {
        if( g_story_node )
        {
            node = g_story_node;
        }
        else
        {
            return;
        }
    }

    readerFixMetrics();

    makePages(story);

    setPageSizes();
    countPageWords();
    
    $('#reader #story_body .end_story_page .stars span').click(clickEndStoryPageStar);
    if( node.rating )
    {
        readerSetStars(node.rating);
    }
    else
    {
        readerSetStars(0);
    }
    
    if( load_page == 'start' )
    {
        scrollToPage(0,true);
    }
    else if( load_page == 'end' )
    {
        scrollToPage(g_page_count - 1,true);
    }
    else
    {
        readerSeekToWord(node.current_word);
    }
    readerSaveProgress();

    $('#reader .story_title').html(story.title);
    $('#reader .story_author_one').html(story.author_list[0]);
    streamGetNextStory(function(err,next_story,next_node)
    {
        if( !err )
        {
            $('#reader .next_story_title').html(next_story.title);
            if( next_story.subtitle )
            {
                $('#reader .next_story_subtitle').html(next_story.subtitle);
                $('#reader .next_story_subtitle').show();
            }
            else
            {
                $('#reader .next_story_subtitle').hide();
            }
            $('#reader .next_story_author_one').html(next_story.author_list[0]);
        }
    });
    
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
    g_reader_width = $(window).width();
    g_reader_height = $(window).height();
}
function countPageWords()
{
    g_page_list = [];
    var word_count = 0;
    $('#reader #story_body .page').each(function(index,element)
    {
        var page_col = $(this);
        var words = 0;
        $(this).each(function(index2,element2)
        {
            if( !$(this).hasClass('ignore_words') )
            {
                var text = $(this).text();
                var m = text.match(/\w[^\s]*/g);
                if( m )
                {
                    words += m.length;
                }
            }
        });
        var page = {
            start_word: word_count,
            word_count: words
        };
        g_page_list.push(page);

        word_count += words;
    });
    g_page_list.splice(0,1);
    g_page_list.splice(-2,2);
}
function readerSeekToWord(word_num)
{
    var new_page = 0;

    if( word_num > 0 )
    {
        for( var i = 0 ; i < g_page_list.length ; ++i )
        {
            var page = g_page_list[i];
            if( word_num == page.start_word )
            {
                break;
            }
            else if( word_num < page.start_word )
            {
                --new_page;
                break;
            }
            else
            {
                ++new_page;
            }
        }
    }
    else
    {
        new_page = 0;
    }
    
    new_page = Math.max(0,new_page);
    new_page = Math.min(new_page,g_page_list.length - 1);
    
    scrollToPage(new_page,true);
}
function readerSaveProgress()
{
    var page = {};
    if( g_curr_page >= g_page_list.length )
    {
        page = g_page_list[g_page_list.length - 1];
    }
    else
    {
        page = g_page_list[g_curr_page];
    }

    var current_word = page.start_word;
    var max_word = page.start_word + page.word_count;
    
    streamSaveProgress(current_word,max_word);
}

function readerFixMetrics()
{
    var metrics = THEME_METRICS[g_current_theme];
    
    var font_size = parseInt( $('#story_body').css('font-size') );
    var line_height = Math.ceil( font_size * metrics.line_height_ratio );
    $('#story_body').css('line-height',line_height + 'px');
}
function makePages(story)
{
    g_ejs_story.update('paged_story',{ story: story });

    var pages_col = $('#paged_story .pages');
    var full_story_col = $('#paged_story .pages .full_story');
    var html = "<div class='page first pad'></div>";
    pages_col.append(html);

    var body_height = $('#story_body').height();
    var padding_height = parseInt( $('#reader #story_body .page').css('padding-top') );
    var page_height = body_height - 2*padding_height;
    
    var container_width = $('#reader #story_body').width();
    var padding_width = parseInt( $('#reader #story_body .page').css('padding-left') );
    var page_width = container_width - 2*padding_width;
    
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

                if( last_tag == 'p' )
                {
                    last_child.remove();
                    
                    var html = last_child.html();
                    var words = html.split(/\s/);
                    var i;
                    new_page_col.append("<{0}>".format(last_tag));
                    new_last_child = new_page_col.children(':last');
                    if( last_classes )
                    {
                        new_last_child.addClass(last_classes);
                    }
                    for( i = 1 ; i <= words.length ; ++i )
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
                    else if( i <= words.length )
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
                        console.log("On no, not here!");
                    }
                }
                else
                {
                    if( new_page_col.children().length == 1 )
                    {
                        console.log("One unsplitable child, and its too big. Stupid layout, show it broken. Fix the story.");
                    }
                    else
                    {
                        last_child.remove();
                        full_story_col.prepend(last_child);
                    }
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
    var end_story_page = g_ejs_end_story_page.render({ story: story });
    pages_col.append(end_story_page);
    g_page_count++;
    
    var html = "<div class='page last pad'></div>";
    pages_col.append(html);
}
function setPageSizes()
{
    var body_width = $('#reader #story_body').width();
    var padding_width = parseInt( $('#reader #story_body .page').css('padding-left') );
    var page_width = body_width - 2*padding_width;
    $('#reader #story_body .page').css('width',page_width + 'px');
    
    var body_height = $('#story_body').height();
    $('#reader #story_body .end_story_page').css('height',body_height + 'px');
    $('#reader #story_body .end_story_page').css('width',body_width + 'px');
}

function clickEndStoryPageStar()
{
    clickStarId( $(this).attr('id') );
    readerHideOverlays(true);
}
function clickStar()
{
    clickStarId( $(this).attr('id') );
}
function clickStarId(star_id)
{
    var star_num = parseInt( star_id.substr(5) );
    
    readerSetStars(star_num);
    
    streamSaveRating(star_num);
}
function readerSetStars(num)
{
    $('#reader .end_story_page .stars span').removeClass('selected');
    $('#reader #rating_bar .stars span').removeClass('selected');
    for( var i = 1 ; i <= num ; ++i )
    {
        $('#reader .end_story_page .stars #star_' + i).addClass('selected');
        $('#reader #rating_bar .stars #star_' + i).addClass('selected');
    }
    if( num > 0 )
    {
        $('#reader #bottom_bar .icon.rate').addClass('active');
    }
    else
    {
        $('#reader #bottom_bar .icon.rate').removeClass('active');
    }
}
function clickRateStory()
{
    $('#reader #bottom_bar').fadeOut();
    $('#reader #rating_bar').fadeIn();
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
    renderStory();
}

function readerPrev(load_page)
{
    if( hasPreviousStory() )
    {
        streamPrevious();
        getCurrentStory(function(err,story,node)
        {
            renderStory(story,node,load_page);
        });
    }
}
function readerNext(load_page)
{
    if( hasNextStory() )
    {
        streamNext();
        getCurrentStory(function(err,story,node)
        {
            renderStory(story,node,load_page);
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


