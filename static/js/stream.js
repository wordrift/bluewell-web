
var g_stream_node_list = [];
var g_story_map = {};

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
            g_stream_node_list = data;
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

    if( g_user.current_stream_node_id )
    {
        var i = findStreamNodeIndexById(g_user.current_stream_node_id);
        var node = g_stream_node_list[i];
        fetch_list.push(node.story_id);
        end = i;
        
        for( ; i < g_stream_node_list.length ; ++i )
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

    var key = "story_{0}".format(story_id);
    if( key in g_story_map )
    {
        var story = g_story_map[key];
        callback(null,story);
    }
    else
    {
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
}

function getCurrentStory(callback)
{
    if( !g_user.current_stream_node_id )
    {
        g_user.current_stream_node_id = g_stream_node_list[0].stream_node_id;
    }
    var node_id = g_user.current_stream_node_id;
    var node = findStreamNodeById(node_id);
    var story_id = node.story_id;
    fetchStoryById(story_id,function(err,story)
    {
        if( err )
        {
            callback(err);
        }
        else
        {
            callback(null,story);
        }
    });
}
