define(['./events', './util'],function(events, util){
	var exports = {};
  var socket = chrome.socket || chrome.experimental.socket;
  
  var CONNECTION_CLEANUP = 10 * 1000 * 3; //10000 or below will lead to significantly fewer peers
  var CLEANUP_INTERVAL = 1 * 1000;

function Socket(type, listener) {
  console.log("Initializing Datagram V3")
  events.EventEmitter.call(this);
SUPERSOCKET = this;
  //init state variables
  this._listening = false;
  this._binding   = false;
  this._connecting = false;
  this._socketID  = null;
  this._hosts     = {};
  //type of socket 'udp4', 'udp6', 'unix_socket'
  this.type = type || 'udp4';
  this._port = 0;

  this._lastCleanup = +new Date;

  //listener
  if (typeof listener === 'function')
    this.on('message', listener);

  // console.log("Creating UDP socket");

  var self = this;
  socket.create("udp", {
  	//socket options though i can't find any
  }, function(createInfo){

  	self._socketID = createInfo.socketId;
    self._poll();
    self.emit("created");
    // console.log("created UDP socket")
  })
  // this.sio = io.connect(host, io_options);
}
util.inherits(Socket, events.EventEmitter);

exports.Socket = Socket;
exports.createSocket = function(type, listener) {
  return new Socket(type, listener);
};

Socket.prototype._cleanup = function(){
  var self = this;

  var sorted = Object.keys(self._hosts).sort(function(a, b){
    return self._hosts[a].lastUsed - self._hosts[b].lastUsed;
  });
  console.log("Number of hosts: ", sorted.length)
  if(sorted.length > 0){
      for(var host in self._hosts){
      if(new Date - self._hosts[host].lastUsed > CONNECTION_CLEANUP){
        //recycle
        console.log("removing a host", host)
        socket.disconnect(self._hosts[host].id)
        socket.destroy(self._hosts[host].id)
        delete self._hosts[host];
      }
    }
    

    setTimeout(function(){
      self._cleanup()
    }, CLEANUP_INTERVAL);
  }
  /*
  for(var host in self._hosts){
    if(new Date - self._hosts[host].lastUsed > CONNECTION_CLEANUP){
      console.log("removing a host", host)
      socket.disconnect(self._hosts[host].id)
      socket.destroy(self._hosts[host].id)
      delete self._hosts[host];
    }
  }
  if(Object.keys(self._hosts).length > 0){
    setTimeout(self._cleanup, CLEANUP_INTERVAL);
  }
  */
}

Socket.prototype._poll = function(host){
  var self = this;
  if(host in self._hosts && self._hosts[host].status == "connected"){
    socket.recvFrom(self._hosts[host].id, function(result){
      if(result.resultCode > 0){
        self._hosts[host].lastUsed = +new Date;
        // console.log("read a result", result);
        self.emit('message', new Buffer(result.data), {
          address: result.address,
          port: result.port,
          size: result.data.byteLength
        })
      }
      self._poll(host);
    })
  }
  // self._cleanup();
}

Socket.prototype._connect = function(port, address, callback) {
  var self = this;
  var host = address + '/' + port;
  //TODO: check to see if port and address have changed 
  if(host in self._hosts){
    self._hosts[host].lastUsed = +new Date;
    if(self._hosts[host].status == "connecting"){
      // console.log("holding back a connection request")
      self._hosts[host].callbacks.push(callback)
      return;
    }else{
      callback(self._hosts[host].id);
    }
  }else{
    // console.log("creating a new UDP for ", host)

    self._hosts[host] = {
      status: "connecting",
      id: -1,
      callbacks: [callback],
      creation: +new Date,
      lastUsed: +new Date
    };
    if(Object.keys(self._hosts).length == 1){
      self._cleanup();
    }
    socket.create("udp", {}, function(createInfo){
      // console.log("created new udp", createInfo, host)
      socket.connect(createInfo.socketId, address, port, function(connectResult){
        // console.log("connecting new udp", connectResult)
        self._hosts[host].id = createInfo.socketId;
        self._hosts[host].status = 'connected';
        self._hosts[host].lastUsed = +new Date;
        self._poll(host); //set up polling
        for(var i = 0; i < self._hosts[host].callbacks.length; i++){
          // console.log("running callback", i)
          self._hosts[host].callbacks[i](self._hosts[host].id);
        }
      })
    })
  }
};

Socket.prototype.bind = function(port, address) {
  var self = this;

  if(this._listening)
    throw new Error('already listening');

  if(this._binding)
    throw new Error('already binding');
  
  if(this._socketID === null){
    return self.on("created", function(){
      self.bind(port, address)
    })
  }

  this._binding = true;

  address = address || '0.0.0.0';
  port = port || 0;

  this._port = port;
  // console.log("binding", this._socketID, address, port)
  socket.bind(this._socketID, address, port, function(result){
    //console.log("I don't know what this integer result means after binding", result);
    if(result < 0){
      console.error("OH NOES COULD NOT BIND SOCKET!")
    }
    self._binding = false;
    self._listening = true;
    self.emit('listening');

  })

  // this.sio.emit('bind', {
  //   type    : this.type,
  //   port    : port,
  //   address : address
  // });

  // this.sio.on('listening', function(address) {
  //   //set address
  //   self._address = address;

  //   self._binding = false;
  //   self._listening = true;

  //   self.emit('listening');
    
  //   //proxy incoming messages
  //   self.sio.on('dgram-message', function(message) {
  //     self.emit('message',
  //       new Buffer(message.msg, 'ascii'),
  //       message.rinfo);
  //   });

  //   //proxy error
  //   self.sio.on('error', function(error) {
  //     self.emit('error', error);
  //   });

  //   //disconnection
  //   self.sio.on('disconnect', function() {
  //     self.emit('close');
  //     self.removeAllListeners();
  //   });
  // });
};

Socket.prototype.send = function(buffer, offset, length, port, address, callback) {
  var self = this;
  // console.log("UDP dgrams send", arguments)
  //accept buffer as string
  buffer = (typeof buffer === 'string') ? new Buffer(buffer) : buffer;
  //emit directly exception if any
  if (offset >= buffer.length)
    throw new Error('Offset into buffer too large');
  if (offset + length > buffer.length)
    throw new Error('Offset + length beyond buffer length');

  //console.log("what is this buff", buffer)

  self._connect(port, address, function(socketId){
    //console.log(buffer.toString('utf8').length)
    var ab = buffer.toArrayBuffer() //new Uint8Array(buffer.length);
    //console.log(new Uint8Array(ab));
    //ab.set(buffer.parent.subarray(buffer.offset, buffer.offset + buffer.length), 0)
    //var ab = buffer.parent.buffer //(new Uint8Array(buffer)).buffer
    //var ab = (new Uint8Array("hello world".split('').map(function(e){return e.charCodeAt(0)}))).buffer;
    //console.log([].slice.call((new Uint8Array(ab)), 0))
    socket.write(socketId, ab, function(sendResult){
      // console.debug("sendResult", sendResult);
    })
  })

  //send it on wire
  // this.sio.emit('dgram-message', {
  //   buffer  : buffer.toString('ascii'),
  //   offset  : offset,
  //   length  : length,
  //   port    : port,
  //   address : address
  // });

  if(callback)
    callback.call(null);
};


Socket.prototype.close = function() {
  // this.sio.disconnect();
  socket.disconnect(this._socketID);
  socket.destroy(this._socketID);
  this.emit('close');
  this.removeAllListeners();
};


Socket.prototype.address = function() {
  return {
    address: "0.0.0.0",
    family: "IPv4",
    port: this._port
  }
};


// not implemented methods

Socket.prototype.setBroadcast = function(arg) {
  throw new Error('not implemented');
};

Socket.prototype.setTTL = function(arg) {
  throw new Error('not implemented');
};

Socket.prototype.setMulticastTTL = function(arg) {
  throw new Error('not implemented');
};

Socket.prototype.setMulticastLoopback = function(arg) {
  throw new Error('not implemented');
};

Socket.prototype.addMembership = function(multicastAddress, nterfaceAddress) {
  throw new Error('not implemented');
};

Socket.prototype.dropMembership = function(multicastAddress, interfaceAddress) {
  throw new Error('not implemented');
};
	return exports;
})