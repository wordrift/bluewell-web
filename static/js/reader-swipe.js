
(function($, document){

    var methods = {
        init: function(fn,opts){

            var props = {};
            var options = $.extend({}, $.fn.swipe.defaults, opts);

            return this.each(function() {
                var container = $(this);
                this.swipe = new $.fn.swipe.swipe(container, props, options);
                this.swipe.setupHtml();
            });
        }
    };

    $.fn.swipe = function(method){
        if(methods[method]){
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        }
        else if(typeof method === "function" || method === undefined){
            return methods.init.apply(this, arguments);
        }
        else if(typeof method === "object"){
            return methods.init.apply(this, [null, method]);
        }
        else {
            $.error("method '" + method + "' does not exist for $.fn.swipe");
        }
    };

    $.fn.swipe.defaults = {
        resizeCallback: function() {},
        onValidSwipe: function() {},
        onClick: function() {},
        onReady: function() {}
    };

    $.fn.swipe.swipe = function(container, props, options) {
        // set object properties
        this.container = container;
        this.props = props;
        this.opts = options;
    };

    $.fn.swipe.swipe.prototype = {

        setupHtml: function(){

            this.clickCatch = this.container;
            
            //this.clickCatch.bind('mousewheel.madsw',$.proxy(this, 'onMouseWheel'));
            this.clickCatch.bind('mousedown.madsw',$.proxy(this, 'onMouseDown'));
            $(window).bind('mouseup.madsw',$.proxy(this, 'onMouseUp'));
            $(window).bind('mousemove.madsw',$.proxy(this, 'onMouseMove'));

            this.clickCatch.bind('touchstart.madsw',$.proxy(this, 'onTouchStart'));
            this.clickCatch.bind('touchmove.madsw',$.proxy(this, 'onTouchMove'));
            this.clickCatch.bind('touchend.madsw',$.proxy(this, 'onTouchEnd'));
            
            this.panelIndex = 0;
            this.wheelTime = 0;
            this.refreshHtml();
            
            $(window).resize($.proxy(this, 'onContainerResize'));
            
            this.opts.onReady();
            
            return this;
        },
        refreshHtml: function() {
            this.contentWidth = this.container.width();
            this.minLongSlideDistance = this.contentWidth * 0.3;
        },
        onContainerResize: function() {
            this.container.stop(true);
            this.opts.resizeCallback();
            this.refreshHtml();
        },

        repaint: function(){
            this.refreshHtml();
        },

 
        /*
 
        onMouseWheel: function(ev, delta, deltaX, deltaY) {
 
            if( Math.abs(deltaY) > Math.abs(deltaX) )
                return;
 
            ev.preventDefault();
            this.container.stop(true);

            var now = Number(new Date());
            var left = this.getLeftPosition();

            this.lastWheelTime = now;
            
            if( !this.wheelMoving )
            {
                this.startWheelLeft = left;
                this.startWheelTime = now;
            }
            this.wheelMoving = true;
            var new_left = left + deltaX * 15;
            this.setLeftPosition(new_left);
            window.setTimeout($.proxy(this, 'onMouseWheelTimeout'),300);
            
            var left = this.getLeftPosition();
            left -= this.overflow;

            var right = left + this.contentWidth;
            var left_index = Math.floor(left / this.contentWidth);
            var right_index = Math.floor(right / this.contentWidth);
            
            if( left_index >= 0 )
                this.opts.onPanelVisible(left_index);
            if( right_index < this.opts.panelCount )
                this.opts.onPanelVisible(right_index);
            
        },
        onMouseWheelTimeout: function() {
            if( !this.wheelMoving )
                return;
                
            var now = Number(new Date());
            var lastDeltaT = now - this.lastWheelTime;
            
            if( lastDeltaT > 250 )
            {
                this.wheelMoving = false;
                var deltaSL = this.getLeftPosition() - this.startWheelLeft;
                var deltaT = this.lastWheelTime - this.startWheelTime;
                
                var isLeft = true;
                if( deltaSL > 0 )
                    isLeft = false;
                
                var isValidSlide = false;
                if( Math.abs(deltaSL) > this.contentWidth / 2 )
                    isValidSlide = true;
                if( deltaT < 250 && Math.abs(deltaSL) > 20 )
                    isValidSlide = true;
                
                if( isLeft && this.panelIndex == 0 )
                    isValidSlide = false;
                
                if( !isLeft && this.panelIndex == this.opts.panelCount - 1 )
                    isValidSlide = false;
                
                if( isValidSlide )
                {
                    var new_index = this.panelIndex;
                    if( isLeft )
                        new_index--;
                    else
                        new_index++;
                    this.scrollto(new_index);
                }
                else
                {
                    var left = this.panelIndex * this.contentWidth;
                    left += this.overflow;
                    this.container.animate({ scrollLeft: left });
                }            
            }
            else
            {
 
            }
        },
        */
        onMouseDown: function(ev, delta, deltaX, deltaY) {
            ev.preventDefault();
            this.container.stop(true);
            this.mouseDown = true;
            this.startScreenX = ev.pageX;
            this.startScreenY = ev.pageY;
            this.handleMoveStart(ev.pageX);
        },
        onMouseMove: function(ev, delta, deltaX, deltaY) {
            if( this.mouseDown )
            {
                ev.preventDefault();
                this.handleMove(ev.pageX);
            }
        },
        onMouseUp: function(ev, delta, deltaX, deltaY) {
            if( this.mouseDown )
            {
                this.mouseDown = false;
                ev.preventDefault();
                
                this.handleMoveDone();
            }
            this.mouseDown = false;
        },
        onTouchStart: function(je) {
            je.preventDefault();
            this.container.stop(true);
            
            var ev = je.originalEvent;
            var touch = ev.touches[0];
            this.startScreenX = touch.screenX;
            this.startScreenY = touch.screenY;
            this.handleMoveStart(touch.screenX);
        },

        onTouchMove: function(je) {
            var ev = je.originalEvent;
            if(ev.touches.length > 1 || ev.scale && ev.scale !== 1) 
                return;
            
            var touch = ev.touches[0];
            
            var deltaX = touch.screenX - this.startScreenX;
            var deltaY = touch.screenY - this.startScreenY;
            var is_scroll = false;
            if( Math.abs(deltaX) < Math.abs(deltaY) )
                is_scroll = true;

            if( !is_scroll )
            {
                je.preventDefault();
                this.handleMove(touch.screenX);
            }
        },
        onTouchEnd: function(je) {
            je.preventDefault();
            var ev = je.originalEvent;

            this.handleMoveDone();
        },
        handleMoveStart: function(startX) {
            this.startMoveX = startX;
            this.startLeftPosition = this.getLeftPosition();
            this.startTime = Number(new Date());
        },

        handleMove: function(newX) {   
            var deltaX = newX - this.startMoveX;
            
            var resistance = 1;
            deltaX = deltaX / resistance;
            
            var new_left = this.startLeftPosition - deltaX;
            this.setLeftPosition(new_left);
            
            var left = this.getLeftPosition();
            left -= this.overflow;

            var right = left + this.contentWidth;
            var left_index = Math.floor(left / this.contentWidth);
            var right_index = Math.floor(right / this.contentWidth);
            
        },
        handleMoveDone: function() {
            var left = this.getLeftPosition();
            var deltaSL = this.startLeftPosition - left;
            var deltaT = Number(new Date()) - this.startTime;
            
            var isLeft = true;
            if( deltaSL < 0 )
                isLeft = false;
            
            var isValidSlide = false;
            if( Math.abs(deltaSL) > this.minLongSlideDistance )
                isValidSlide = true;
            if( deltaT < 250 && Math.abs(deltaSL) > 20 )
                isValidSlide = true;
 
            if( isValidSlide )
            {
                this.opts.onValidSwipe(isLeft);
            }
            else
            {
                this.opts.onClick(this.startScreenX,this.startScreenY);
            }
        },
        getLeftPosition: function() {
            return this.container.scrollLeft();
        },
        setLeftPosition: function(new_left) {
            this.container.scrollLeft(new_left);
        }
    };
    
})(jQuery, document);
