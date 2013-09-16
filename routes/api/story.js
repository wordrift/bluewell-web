
var db = require('../../db.js');


exports.get_story = function(req, res)
{
    var story_id = req.params.story_id;
    res.header("Cache-Control", "no-cache, no-store, must-revalidate");
    res.header("Pragma", "no-cache");
    
    var sql = 'SELECT * FROM story WHERE story_id = ?';
    db.queryFromPoolWithConnection(sql,story_id,function(err,results,connection)
    {
        if( err )
        {
            res.send(500,err);
        }
        else
        {
            if( results.length > 0 )
            {
                var story = results[0];
                res.send(story);
            }
            else
            {
                res.send(404,"no story found: " + JSON.stringify(results));
            }
        }
    });
};
