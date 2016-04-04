/**
 * Created by minkwon on 4/04/2016.
 */

function alertOne(x) {
    return x + 1;
}

var fps = { startTime : 0, frameNumber : 0,
    getFPS : function() {
        this.frameNumber++;
        var d = new Date().getTime(), currentTime = ( d - this.startTime ) / 1000, result = Math.floor( ( this.frameNumber / currentTime ) );
        if( currentTime > 1 ) {
            this.startTime = new Date().getTime();
            this.frameNumber = 0;
        }
        return result;
    }
};