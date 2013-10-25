
var db = require('../../db.js');
var async = require('async');

exports.getStream = function(req,res)
{
    var user = req.user;

    res.header("Cache-Control", "no-cache, no-store, must-revalidate");
    res.header("Pragma", "no-cache");
    
    getStream(user,function(err,results)
    {
        if( err )
        {
            res.send(500,err);
        }
        else
        {
            var node_list = results;
            var unread_count = 0;

            if( node_list.length > 0 )
            {
              
                for( var i = 0 ; i < node_list.length ; ++i )
                {
                    var node = node_list[i];
                    if( node.max_word == 0 )
                    {
                        unread_count++;
                    }
                }
            }
            if( unread_count >= 10 )
            {
                res.send(node_list);
            }
            else
            {
                extendStream(user,function(err)
                {
                    if( err )
                    {
                        res.send(500,err);
                    }
                    else
                    {
                        getStream(user,function(err,results)
                        {
                            if( err )
                            {
                                res.send(500,err);
                            }
                            else
                            {
                                res.send(results);
                            }
                        });
                    }
                });
            }
        }
    });
};

function getStream(user,callback)
{
    var user_id = user.user_id;
    
    var sql = "SELECT stream_node.*,user_rating.rating FROM stream_node ";
    sql += " LEFT JOIN user_rating ON user_rating.user_id = stream_node.user_id AND user_rating.story_id = stream_node.story_id ";
    sql += " WHERE stream_node.user_id = ? ";
    sql += " ORDER BY stream_node.story_order ASC ";
    
    db.queryFromPool(sql,user_id,callback);
}

function extendStream(user,callback)
{
    var user_id = user.user_id;
    var limit = 20;

    var args = [];
    var sql = "SELECT story.story_id FROM story";
    sql += " LEFT JOIN stream_node ON stream_node.story_id = story.story_id AND stream_node.user_id = ?";
    sql += " WHERE stream_node.stream_node_id IS NULL";
    sql += " ORDER BY RAND()";
    sql += " LIMIT ?;";
    args.push(user_id,limit);
    
    sql += " SELECT MAX(story_order) AS max_order FROM stream_node";
    sql += " WHERE user_id = ?";
    args.push(user_id);
    
    db.queryFromPool(sql,args,function(err,results)
    {
        if( err )
        {
            callback(err);
        }
        else
        {
            var story_ids = results[0];
            var max_result = results[1];
            
            var story_order = 1000;
            
            if( max_result.length > 0 && max_result[0].max_order != null )
            {
                story_order = max_result[0].max_order + 1000;
            }
            
            if( story_ids.length > 0 )
            {
                var nodes = [];
                var now = new Date();
            
                for( var i = 0 ; i < story_ids.length ; ++i )
                {
                    var story_id = story_ids[i].story_id;
                    
                    var node = [story_id,user_id,story_order,now];
                    nodes.push(node);
                    
                    story_order += 1000;
                }
                var sql = "INSERT INTO stream_node (story_id,user_id,story_order,updated_ts) VALUES ?";
                db.queryFromPool(sql,[nodes],function(err,results)
                {
                    if( err )
                    {
                        callback(err);
                    }
                    else
                    {
                        callback(false);
                    }
                });
            }
            else
            {
                console.log("extendStream: No stories found!?");
                callback("Couldnt extend stream");
            }
        }
    });
}

exports.postStream = function(req,res)
{
    var user = req.user;
    var user_id = user.user_id;
    var update_list = req.body;

    res.header("Cache-Control", "no-cache, no-store, must-revalidate");
    res.header("Pragma", "no-cache");
    var last_stream_node_id = false;
    
    async.eachSeries(update_list,function(node,next)
    {
        var stream_node_id = node.stream_node_id;
        var story_id = node.story_id;
        var modified_ts = node.modified_ts;
        last_stream_node_id = stream_node_id;
    
        var sql = "";
        var values = [];
        
        if( 'current_word' in node )
        {
            var current_word = node.current_word;
            sql += "UPDATE stream_node SET current_word = ? ";
            sql += " WHERE stream_node_id = ? AND user_id = ? ";
            sql += " AND updated_ts < ?;";
            values.push(current_word,stream_node_id,user_id,modified_ts);
        }
        if( 'max_word' in node )
        {
            var max_word = node.max_word;
            sql += "UPDATE stream_node SET max_word = GREATEST(max_word,?) ";
            sql += " WHERE stream_node_id = ? AND user_id = ?;";
            values.push(max_word,stream_node_id,user_id);
        }
        if( 'rating' in node )
        {
            var stars = node.rating;
            sql += "REPLACE INTO user_rating SET ?;";
            var args = {
                user_id: user_id,
                story_id: story_id,
                rating: stars
            }
            values.push(args);
        }
        
        db.queryFromPool(sql,values,function(err,results)
        {
            if( err )
            {
                console.log(err)
                next(err);
            }
            else
            {
                next(false);
            }
        });
    }
    ,function(err)
    {
        if( err )
        {
            res.send(500,err);
        }
        else
        {
            user.current_stream_node_id = last_stream_node_id;
            var sql = "UPDATE user SET current_stream_node_id = ? WHERE user_id = ?";
            db.queryFromPool(sql,[last_stream_node_id,user_id],function(err,results)
            {
                if( err )
                {
                    console.log(err)
                    res.send(500,err);
                }
                else
                {
                    res.send(200);
                }
            });
        }
    });
    
};
