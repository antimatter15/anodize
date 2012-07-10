function Bluffer(){
	Uint8Array.constructor.call(this, 32)
}

Bluffer.prototype = Uint8Array.prototype;
Bluffer.prototype.constructor = Bluffer;


//Bluffer.prototype = new Uint8Array(42)


function Buffer(subject, encoding, offset){
	var length;
	if(offset) throw "Nonzero offsets not supported";
	if(subject instanceof ArrayBuffer){
		length = subject.byteLength;
	}else if(typeof subject == 'number'){
		length = subject;
	}else if(subject.pop || subject instanceof Uint8Array){ //array-like
		length = subject.length;
	}else{
		encoding = (encoding || 'utf8').toLowerCase().replace("-", '');
		length = Buffer.byteLength(subject, encoding)
	}

	if(subject instanceof Uint8Array){
		this.array = subject;
	}else if(subject.pop || subject instanceof ArrayBuffer){ //array-like or arraybuffer
		this.array = new Uint8Array(subject);	
	}else{
		this.array = new Uint8Array(length);	
		if(encoding){
			this.write(subject, 0, encoding)
		}
	}




	//this.length = this.length;
	this.__proto__.__proto__ = (this.array);

	this.length = length;
	//console.log("creating buffer", arguments)
}

Buffer.prototype.slice = function(start, end){
	return new Buffer(this.subarray(start, end))
}

Buffer.prototype.toString = function(encoding, start, end){
	encoding = (encoding || 'utf8').toLowerCase().replace("-", '');
	if(!end) end = this.length;
	if(!start) start = 0;

	if(encoding == "ascii"){
		var s = '';
		for(var i = start; i < end; i++) 
			s += String.fromCharCode(this[i]);
		return s;
	}else if(encoding == "utf8"){
		var s = '';
		for(var i = start; i < end; i++){
			s += String.fromCharCode(this[i]);
		}
		return s;
		return decodeURIComponent(escape( s));
	}else{
		throw "Other encodings not supported " + encoding;
	}
	console.log("toString", encoding, start, end);

}

Buffer.prototype.charAt = function(i) {
	console.log('charAt', this[i])
	return String.fromCharCode(this[i]);
}

Buffer.prototype.write = function(string, offset, encoding){
	encoding = (encoding || 'utf8').toLowerCase().replace("-", '');
	if(typeof string != 'string') throw "trying to write non-string";
	if(encoding == 'utf8'){
		this.set(utf8tobytes(string), offset);
	}else if(encoding == 'ascii'){
		this.set(asciitobytes(string), offset);
	}else if(encoding == 'hex'){
		if(string.length % 2 != 0) throw "Unexpected non-integer length from hex";
		for(var i = 0; i < string.length; i += 2){
			this[offset + (i/2)] = parseInt(string.substr(i, 2), 16);
		}
	}
	//console.log("writing", arguments);
}

Buffer.prototype.copy = function(target, target_start, start, end) {
	if(!(target instanceof Buffer)) throw "Target is not a buffer";
	// console.log("copy", target_start, start, end)
	target.set(this.subarray(start, end), target_start)
};

Buffer.prototype.toArrayBuffer = function(){
	return this.buffer;
}

Buffer.byteLength = function(string, encoding){
	encoding = (encoding || 'utf8').toLowerCase().replace("-", '');
	if(encoding == 'hex'){
		if(string.length % 2 != 0) throw "Unexpected non-integer length from hex";
		return string.length / 2;
	}else if(encoding == 'utf8'){
		return utf8tobytes(string).length;	
	}else{
		throw "Encoding "+encoding+" is not supported"
	}
	
}

function asciitobytes(string){
	return new Uint8Array(string.split('').map(function(e){
		return e.charCodeAt(0)
	}))
}

function utf8tobytes(string) {
  var j, buffer = [];
	for(var a = 0; a < string.length; a++){
		var value = string.charCodeAt(a);
		if(value <= 0x7F){
			buffer.push(value);
		} else if(value <= 0x7FF){
			buffer.push(0xC0 | (value >>> 6));
			buffer.push(0x80 | (value & 0x3F));
		} else if(value <= 0xFFFF){
			buffer.push(0xE0 | (value >>> 12));
			buffer.push(0x80 | ((value >>> 6) & 0x3F));
			buffer.push(0x80 | (value & 0x3F));
		} else {
			j = 4;
			while(value >> (6 * j)) j++;
				buffer.push(((0xFF00 >>> j) & 0xFF) | (value >>> (6 * --j)));
			while(j--)
				buffer.push(0x80 | ((value >>> (6 * j)) & 0x3F));
		}
	}
	return new Uint8Array(buffer);
}