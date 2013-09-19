
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
    
    html += "<h1>{0}</h1>".format(story.title);
    if( story.subtitle )
    {
        html += "<h2>{0}</h2>".format(story.subtitle);
    }
    html += "<div class='authors'>";
    html += " <div class='by'>By:</div>";
    for( var i = 0 ; i < story.author_list.length ; ++i )
    {
        var author = story.author_list[i];
        html += " <div class='author'>{0}</div>".format(author);
    }
    html += "</div>";
    html += "<div class='text'>";
    html += story.text;
    html += "</div>";
    html += "<div class='author_notes'>";
    html += story.author_notes;
    html += "</div>";
    
    $('#story_body').html(html);
    
    window.scrollTo(0,30);
}

