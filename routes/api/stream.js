
var db = require('../../db.js');

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
            if( results.length > 0 )
            {
                res.send(results);
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
    
    var sql = "SELECT * FROM stream_node ";
    sql += " WHERE user_id = ? ";
    sql += " ORDER BY story_order ASC ";
    
    db.queryFromPool(sql,user_id,callback);
}

function extendStream(user,callback)
{
    var user_id = user.user_id;
    var limit = 10;

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
