"use strict";

var vsm = require('lrs/virtualServerModule');
var http = require('http');
var mgmt = require('lrs/managementRest');

function ReplicateTraffic(scenarioName, primaryVSName, secondaryPort) {
    var self = this;
    self.scenarioName = scenarioName;
    self.primaryVS = primaryVSName;
    self.port = secondaryPort;
    
    //We cannot send a request after duplicating to another virtual server yet, 
    //and so we need require a secondary port that we expect is a loopback VIP 
    //goes to the secondary virtual server like this:
    //
    //virtual-server vsSecondary
    //  attach vipSecondary default
    //  attach real-server group ... !your secondary servers here
    //
    //virtual-ip vipSecondary
    //  admin-status online
    //  ip address 127.0.0.1 15000 !15000 is the secondary port
    //
    //
    
    vsm.on('exist', primaryVSName, function(vs) {
        vs.on('request', function(req, res, next) { 
            self.replicate(req, res, next);
        });    
    });
}

ReplicateTraffic.prototype.cloneReq = function(req) {
    var newReq = http.request({ host: "127.0.0.1",
                                port: this.port,
                                method: req.method,
                                path: req.url,
                                headers: req.headers}, 
                              function() {});
    return newReq;
}

ReplicateTraffic.prototype.replicate = function(req, res, next) {
    if(req.method == 'GET' || req.method == 'HEAD') { 
        //Cannot deal with request bodies yet so only do GET and HEAD
        var newReq = this.cloneReq(req);
        // I want to do vsB.newRequest(newReq) but cannot 
        // so I loop it through a dummy vip in cloneReq
        newReq.on('response', function(res) { console.log('saw B resp'); });
        newReq.end(); //Deal with body pipe here when LRS supports it
    }
    next();
}

var repl = new ReplicateTraffic("xxx", 
                                'vsAandB', 
                                15000 /* eventually will be 
                                         secondary vs name */);
