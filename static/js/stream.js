
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
                data.modified_ts = false;
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
var g_is_syncing = false;
function streamSyncNodes()
{
    if( g_is_syncing )
    {
        console.log("syncing in progress, skipping");
        return;
    }
    g_is_syncing = true;

    var modified_list = [];
    for( var i = 0 ; i < g_stream_node_list.length ; ++i )
    {
        var node = g_stream_node_list[i];
        if( 'modified_obj' in node && node.modified_obj.modified_ts )
        {
            var copy = jQuery.extend(true, {}, node.modified_obj);
            modified_list.push(copy);
        }
    }
    
    if( modified_list.length > 0 )
    {
        var post_data = JSON.stringify(modified_list);
        jQuery.ajax({
            type: 'POST',
            url: '/api/1/stream',
            contentType: 'application/json',
            data: post_data,
            processData: false,
            success: function(data)
            {
                for( var i = 0 ; i < modified_list.length ; ++i )
                {
                    var synced_node = modified_list[i];
                    var node = findStreamNodeById(synced_node.stream_node_id);
                    
                    if( synced_node.modified_ts == node.modified_obj.modified_ts )
                    {
                        node.modified_obj.modified_ts = false;
                    }
                }
                    
                g_is_syncing = false;
                // call ourselves to sync anything modified while we were running
                streamSyncNodes();
            },
            error: function()
            {
                window.alert("Failed to sync stream data.");
                g_is_syncing = false;
            }
        });
    }
    else
    {
        g_is_syncing = false;
    }
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

    var story = false;
    var key = "story_{0}".format(story_id);
    if( key in window.localStorage )
    {
        try
        {
            var json = window.localStorage[key];
            story = JSON.parse(json);
        }
        catch(e)
        {
        }
    }
    
    var headers = {}
    if( story && story.updated_ts )
    {
        var ts = Date.parse(story.updated_ts);
        if( ts )
        {
            var d = new Date(ts);
            headers['If-Modified-Since'] = d.toUTCString();
        }
    }
    
    jQuery.ajax(
    {
        type: 'GET',
        url: '/api/1/story/' + story_id,
        dataType: 'json',
        headers: headers,
        success: function(data)
        {
            if( data )
            {
                story = data;
                window.localStorage[key] = JSON.stringify(story);
                g_story_map[story_id] = story;
                callback(null,story);
            }
            else if( story )
            {
                g_story_map[story_id] = story;
                callback(null,story);
            }
            else
            {
                callback(true);
            }
        },
        error: function()
        {
            console.log("Failed to get story data: " + story_id);
            if( story )
            {
                g_story_map[story_id] = story;
                callback(null,story);
            }
            else
            {
                callback(true);
            }
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
            g_current_stream_index = i;
        }
    }
}

function streamSaveProgress(current_word,max_word)
{
    streamModifyCurrentNode({max_word: max_word,current_word: current_word});
}
function streamSaveRating(num)
{
    streamModifyCurrentNode({rating: num});
}

function streamModifyCurrentNode(props)
{
    var modified = false;
    var node = g_stream_node_list[g_current_stream_index];
    if( !( 'modified_obj' in node ) )
    {
        node.modified_obj = {
            stream_node_id: node.stream_node_id,
            story_id: node.story_id,
            modified_ts: false
        };
    }
    
    if( 'max_word' in props )
    {
        var max_word = props.max_word;
        if( max_word > node.max_word )
        {
            node.max_word = max_word;
            node.modified_obj.max_word = max_word;
            modified = true;
        }
    }
    
    if( 'current_word' in props )
    {
        var current_word = props.current_word;
        if( current_word != node.current_word )
        {
            node.current_word = current_word;
            node.modified_obj.current_word = current_word;
            modified = true;
        }
    }
    
    if( 'rating' in props )
    {
        var rating = props.rating;
        if( rating != node.rating )
        {
            node.rating = rating;
            node.modified_obj.rating = rating;
            modified = true;
        }
    }
    
    if( modified )
    {
        node.modified_obj.modified_ts = new Date();
        streamSaveNodes();
        streamSyncNodes();
    }
}
