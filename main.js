require(["dht/dht", "dgram"], function(DHT, dgram){
	console.log("dgram", dgram)
	
	dht = new DHT.DHT(1000 + Math.floor(Math.random()*40000));
	console.log("dht", dht);
	chrome.experimental.dns.resolve('router.bittorrent.com', function(dnsResolve){
		dht.start();
		var id = DHT.util.hex2buf("640FE84C613C17F663551D218689A64E8AEBEABE");
		console.log("torrent infohash id", id);
		dht.bootstrap([ { 'address': dnsResolve.address, 'port': 6881 } ], function(){
		// dht.bootstrap([ { 'address': '123.121.215.62', 'port': 25392 } ], function(){
			console.log("BOOTSTRAPPING COMPLETE")
			dht.lookup(id, function (peers, finished) {
			 	console.log("Found more peers: %j", peers);
			 	if (finished) console.log("Lookup done");
			});
		})
	})	
})
