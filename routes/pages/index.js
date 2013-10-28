
var db = require('../../db.js');
var user = require('../../user.js');
var admin = require('./admin/index.js');

exports.addRoutes = function(app,prefix)
{
    app.get(prefix + '/', index);
    app.get(prefix + '/home', user.checkSessionForPage, home);
    app.get(prefix + '/waitlist', waitlist);
    app.get(prefix + '/fail', fail);
    
    admin.addRoutes(app,prefix + '/admin')
};

function index(req,res)
{
    user.isValidSession(req,function(err,is_valid)
    {
        if( err )
        {
            res.redirect('/fail');
        }
        else if( is_valid )
        {
            res.redirect('/home');
        }
        else
        {
            res.render('index');
        }
    });
}
function home(req,res)
{
    var sql = "\
SELECT user.user_id,user.email,user.display_name,user.is_admin,user.current_stream_node_id \
FROM user \
WHERE user_id = ? \
";

    db.queryFromPool(sql,req.user.user_id,function(err,results)
    {
        if( err )
        {
            res.redirect('/fail');
        }
        else
        {
            if( results.length > 0 )
            {
                var params = {
                    user: results[0],
                    session_key: req.cookies.session_key
                };
                res.render('home',params);
            }
            else
            {
                res.redirect('/fail');
            }
        }
    });

}
function fail(req,res)
{
    res.render('fail');
}
function waitlist(req,res)
{
    res.render('waitlist');
}
