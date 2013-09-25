
var api_story = require('./story.js');
var api_stream = require('./stream.js');
var user = require('../../user.js');

exports.addRoutes = function(app,prefix)
{
    app.get(prefix + '/story/:story_id',user.checkSessionForApi,api_story.getStory);

    app.get(prefix + '/stream',user.checkSessionForApi,api_stream.getStream);

};

