
var db = require('../../db.js');

exports.getStream = function(req,res)
{
    res.header("Cache-Control", "no-cache, no-store, must-revalidate");
    res.header("Pragma", "no-cache");
    
    var sql = "SELECT * FROM stream_node ";
    sql += " WHERE user_id = ? ";
    sql += " ORDER BY stream_order ASC ";
    
    db.queryFromPool(sql,req.user.user_id,function(err,results)
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
                res.send(404,"no stream_nodes found");
            }
        }
    });
};

function extendStream(user,callback)
{
    
}
