
var global_inc = require('./global_inc');

var express = require('express');
var api = require('./routes/api');
var http = require('http');
var path = require('path');
var config = require('./config.json')
var db = require('./db.js');

var app = express();

app.enable('trust proxy')
app.engine('.html', require('ejs').__express);

app.set('port', process.env.PORT || 3002);
app.set('views', __dirname + '/views');
app.set('view engine', 'html');

//app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
//app.use(express.cookieParser('your secret here'));
//app.use(express.session());

app.use(app.router);
app.use(require('less-middleware')({ src: __dirname + '/static' }));
app.use(express.static(path.join(__dirname, 'static')));

if( app.get('env') == 'development' )
{
    app.use(express.errorHandler());
}

api.addRoutes(app,'/api/1');

http.createServer(app).listen(app.get('port'), function(){
    console.log('Express server listening on port ' + app.get('port'));
});

