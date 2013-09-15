
var db = require('../../db.js');

exports.addRoutes = function(app,prefix)
{
    app.get(prefix + '/', index);
    app.get(prefix + '/reader', reader);
};

function index(req, res)
{
    res.redirect('/home');
}
function reader(req,res)
{
    res.render('reader');
}
