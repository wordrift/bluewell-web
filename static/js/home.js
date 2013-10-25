

function homeReady()
{
    window.localStorage['user'] = JSON.stringify(g_user);
    window.localStorage['session_key'] = g_session_key;
    
    streamUpdate();
}
$(document).ready(homeReady);

function showReader()
{
    $('#home').hide();
    $('#reader').show();
    window.scrollTo(0,0);
    
    getCurrentStory(function(err,story,node)
    {
        renderStory(story,node);
    });
}
