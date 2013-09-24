

var db = require('./db.js');

exports.facebookCreateOrUpdate = function(accessToken,profile,done)
{
    var props = {
        email: profile.emails[0].value,
        display_name: profile.displayName,
        fb_id: profile.id,
        fb_access_token: accessToken,
        fb_json: profile._raw
    };

    var sql = "REPLACE INTO user SET ?";
    db.queryFromPool(sql,props,function(err,result)
    {
        if( err )
        {
            console.log("user replace failed:");
            console.log(err);
            done(err);
        }
        else
        {
            var user_id = result.insertId;
            
            var sql = "SELECT is_active FROM user WHERE user_id = ?";
            db.queryFromPool(sql,user_id,function(err,result)
            {
                if( err )
                {
                    console.log("user get failed:");
                    console.log(err);
                    done(err);
                }
                else
                {
                    if( result.is_active )
                    {
                        
                        var props = {
                            user_id: user_id,
                            session_key: session_key
                        };
                        var sql = "INSERT INTO user_session SET ?";
                        db.queryFromPool(sql,props,function(err,result)
                        {
                            if( err )
                            {
                                console.log("session key create failed:");
                                console.log(err);
                                done(err);
                            }
                            else
                            {
                                profile.session_key = session_key;
                                done(null,profile);
                            }
                        }
                    }
                    else
                    {
                        done({error: "user not active"});
                    }
                }
            });
        }
    });
};

