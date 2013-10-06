
global.mergeObjects = function(obj1,obj2)
{
    var obj3 = {};
    
    for( var a in obj1 )
    {
        obj3[a] = obj1[a];
    }
    for( var a in obj2 )
    {
        obj3[a] = obj2[a];
    }
    return obj3;
};

global.cleanHTML = function(text)
{
    if( !text )
    {
        text = "";
    }

    var REMOVE_TAGS = {
        'div': true,
        'img': true,
        'a': true,
        'span': true,
        'br': true,
        'br/': true,
        'td': true,
        'tr': true,
        'table': true,
        'tbody': true,
        'hr': true,
        'hr/': true,
        'ol': true,
        'li': true,
    };
    var MAP_TAGS = {
        'p': 'p',
        'i': 'i',
        'blockquote': 'blockquote',
        'b': 'b',
        'em': 'b',
        'center': 'center',
        'sup': 'sup',
        'u': 'u',
        'strong': 'b',
        'sub': 'sub',
        'h1': 'h1',
        'h2': 'h2',
        'h3': 'h3',
        'ins': 'u',
        'del': 's',
        's': 's',
    }
    
    text = text.replace(/<!--[\s\S]*?-->/g,"");

    var replaces = [];

    var regex = /<\s*(\/?)\s*([^>\s]*)[^>]*>/g;
    match = regex.exec(text);
    while (match != null)
    {
        var tag = match[2];
        
        if( tag in REMOVE_TAGS )
        {
            replaces.push({search: match[0],replace: " " });
        }
        else if( tag in MAP_TAGS )
        {
            var new_tag = MAP_TAGS[tag];
            replaces.push({search: match[0],replace: "<" + match[1] + new_tag + ">" });
        }
        else
        {
            console.log("Unknown tag: " + tag);
        }

        match = regex.exec(text);
    }
    for( var i = 0 ; i < replaces.length ; ++i )
    {
        var opt = replaces[i];
        text = text.replace(opt.search,opt.replace);
    }

    // Consolidate whitespace
    text = text.replace(/[\s\r\n]+/g,' ');
    
    // Replace empty paragraphs at end of story
    text = text.replace(/\s*<p>\s*<\/p>\s*$/i,'');

    // Remove whitespace at end of story
    text = text.replace(/\s*$/i,'');
    
    return text;
};

