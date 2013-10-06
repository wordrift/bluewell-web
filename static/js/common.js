
var IS_IPAD = window.navigator.userAgent.match(/iPad/i) != null;
var IS_IPHONE = window.navigator.userAgent.match(/iPhone/i) != null;
var IS_IPOD = window.navigator.userAgent.match(/iPod/i) != null;
var IS_IOS = IS_IPAD || IS_IPHONE || IS_IPOD;

var IS_ANDROID = window.navigator.userAgent.match(/Android/i) != null;
var IS_ANDROID_PHONE = window.navigator.userAgent.match(/Android.*Mobile/i) != null;
var IS_ANDROID_TABLET = IS_ANDROID && !IS_ANDROID_PHONE;

var IS_PHONE = IS_IPOD || IS_IPHONE || IS_ANDROID_PHONE;
var IS_TABLET = IS_ANDROID_TABLET || IS_IPAD;

var IS_WINDOWS = window.navigator.userAgent.match(/Windows/i) != null;
var IS_CHROME = window.navigator.userAgent.match(/Chrome/i) != null;
var IS_MOBILE = window.navigator.userAgent.match(/Mobile/i) != null;
var IS_DESKTOP = !IS_MOBILE;

var IS_RETINA = window.devicePixelRatio > 1;
var IS_IOS_WEB_APP = 'standalone' in window.navigator && window.navigator.standalone;

var IS_IE = false;
var IS_OLD_IE = false;
(function() {
    var ie_match = window.navigator.userAgent.match(/IE ([^;]*);/);
    if( ie_match != null && ie_match.length > 1 )
    {
        IS_IE = true;
        var ie_version = parseFloat(ie_match[1]);
        if( ie_version < 9.0 )
            IS_OLD_IE = true;
    }
})();

function commonReady()
{
    if( IS_IPAD )
    {
        $('body').addClass('ipad');
    }
    if( IS_IPHONE )
    {
        $('body').addClass('iphone');
    }
}
$(document).ready(commonReady);
