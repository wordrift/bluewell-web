

var db = require('./db.js');
var crypto = require('crypto');

exports.errorHandler = function(err,req,res,next)
{
    console.log("user errorhandler, err: " + JSON.stringify(err,null,'  '));
    
    if( err.user_error )
    {
        if( err.user_error == 'not_active' )
        {
            res.redirect('/waitlist');
        }
        else
        {
            res.redirect('/failure');
        }
    }
    else
    {
        next(err);
    }
};

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
            done({ user_error: "db" });
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
                    done({ user_error: "db" });
                }
                else
                {
                    profile.active = result.is_active;
                    if( result.is_active )
                    {
                        crypto.randomBytes(16,function(err, buf)
                        {
                            if( err )
                            {
                                console.log("no random?!");
                                done({ user_error: "random" });
                            }
                            else
                            {
                                var session_key = buf.toString('hex');
                                console.log("session key: " + session_key);
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
                                        done({ user_error: { db_error: err } });
                                    }
                                    else
                                    {
                                        profile.session_key = session_key;
                                        done(null,profile);
                                    }
                                });
                            }
                        });
                    }
                    else
                    {
                        console.log("Not active");
                        done({ user_error: "not_active" });
                    }
                }
            });
        }
    });
};

