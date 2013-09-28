
var g_stream_node_list = [];
var g_story_map = {};
var g_current_stream_index = 0;

(function()
{
    if( 'stream_node_list' in window.localStorage )
    {
        var json = window.localStorage['stream_node_list'];
        if( json.length > 0 )
        {
            try
            {
                node_list = JSON.parse(json);
                if( Array.isArray(node_list) && node_list.length > 0 )
                {
                    g_stream_node_list = node_list;
                }
            }
            catch(e)
            {
            }
        }
    }
    
})();

function streamSaveNodes()
{
    if( g_stream_node_list.length > 0 )
    {
        var json = JSON.stringify(g_stream_node_list);
        window.localStorage['stream_node_list'] = json;
    }
}

function streamUpdate()
{
    jQuery.ajax({
        type: 'GET',
        url: '/api/1/stream',
        dataType: 'json',
        success: function(data)
        {
            for( var i = 0 ; i < data.length ; ++i )
            {
                data.modified = false;
            }
        
            g_stream_node_list = data;
            
            if( g_user.current_stream_node_id )
            {
                var i = findStreamNodeIndexById(g_user.current_stream_node_id);
                if( i )
                {
                    g_current_stream_index = i;
                }
                else
                {
                    g_current_stream_index = 0;
                }
            }
                
            streamSaveNodes();
            prefetchStories();
        },
        error: function()
        {
            window.alert("Failed to get stream data.");
        }
    });
}

function prefetchStories()
{
    var fetch_list = [];
    var end = g_stream_node_list.length;

    if( g_current_stream_index )
    {
        end = g_current_stream_index;
        
        for( var i = g_current_stream_index ; i < g_stream_node_list.length ; ++i )
        {
            var node = g_stream_node_list[i];
            fetch_list.push(node.story_id);
        }
    }
    for( var i = 0 ; i < end ; ++i )
    {
        var node = g_stream_node_list[i];
        fetch_list.push(node.story_id);
    }

    async.eachSeries(fetch_list,function(id,next)
    {
        fetchStoryById(id,function()
        {
            next();
        });
    }
    ,function()
    {
    });
}
function findStreamNodeById(stream_node_id)
{
    var i = findStreamNodeIndexById(stream_node_id);
    return g_stream_node_list[i];
}
function findStreamNodeIndexById(stream_node_id)
{
    for( var i = 0 ; i < g_stream_node_list.length ; ++i )
    {
        if( g_stream_node_list[i].stream_node_id == stream_node_id )
        {
            return i
        }
    }
    return false;
}

function fetchStoryById(story_id,callback)
{
    if( !callback )
    {
        callback = function(){};
    }
    
    if( story_id in g_story_map )
    {
        callback(false,g_story_map[story_id]);
        return;
    }

    var key = "story_{0}".format(story_id);
    if( key in window.localStorage )
    {
        try
        {
            var json = window.localStorage[key];
            var story = JSON.parse(json);
            g_story_map[story_id] = story;
            callback(null,story);
            return;
        }
        catch(e)
        {
        }
    }
    
    jQuery.ajax(
    {
        type: 'GET',
        url: '/api/1/story/' + story_id,
        dataType: 'json',
        success: function(data)
        {
            window.localStorage[key] = JSON.stringify(data);
            g_story_map[story_id] = data;
            
            callback(null,data);
        },
        error: function()
        {
            window.alert("Failed to get story data.");
            callback(true);
        }
    });
}

function getCurrentStory(callback)
{
    var node = g_stream_node_list[g_current_stream_index];
    var story_id = node.story_id;
    fetchStoryById(story_id,function(err,story)
    {
        if( err )
        {
            callback(err);
        }
        else
        {
            callback(null,story,node);
        }
    });
}

function hasPreviousStory()
{
    return g_current_stream_index > 0;
}
function hasNextStory()
{
    if( ( g_current_stream_index + 1 ) >= g_stream_node_list.length )
    {
        return false;
    }
    else
    {
        return true;
    }
}
function isAtStreamHead()
{
    var next_index = g_current_stream_index + 1;
    if( next_index >= g_stream_node_list.length )
    {
        return true;
    }
    else
    {
        var next_node = g_stream_node_list[next_index];
        if( next_node.max_word > 0 )
        {
            return false;
        }
        else
        {
            return true;
        }
    }
}
function streamPrevious()
{
    if( g_current_stream_index > 0 )
    {
        g_current_stream_index--;
    }
}
function streamNext()
{
    if( ( g_current_stream_index + 1 ) < g_stream_node_list.length )
    {
        g_current_stream_index++;
    }
}
function streamFastForward()
{
    for( var i = g_current_stream_index + 1 ; i < g_stream_node_list.length ; ++i )
    {
        var node = g_stream_node_list[i];
        if( node.max_word > 0 )
        {
            g_stream_node_index = i;
        }
    }
}


