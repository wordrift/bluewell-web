
var db = require('../../db.js');

exports.getStory = function(req, res)
{
    var story_id = req.params.story_id;
    res.header("Cache-Control", "no-cache, no-store, must-revalidate");
    res.header("Pragma", "no-cache");
    
    var sql = "SELECT * FROM story ";
    sql += " NATURAL JOIN story_author ";
    sql += " WHERE story.story_id = ?";
    
    var options = {
        sql: sql,
        nestTables: true,
    };
    db.queryFromPool(options,story_id,function(err,results)
    {
        if( err )
        {
            res.send(500,err);
        }
        else
        {
            if( results.length > 0 )
            {
                var story = results[0].story;
                story.author_list = [];
                for( var i = 0 ; i < results.length ; ++i )
                {
                    story.author_list.push(results[i].story_author.author);
                }
                res.send(story);
            }
            else
            {
                res.send(404,"no story found");
            }
        }
    });
};
